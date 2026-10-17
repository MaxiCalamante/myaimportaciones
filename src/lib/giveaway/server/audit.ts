import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { canonical } from '../canonical';
import { secureIndex } from '../random';
import { reviewComments, validateRules } from '../participants';
import type { Audit, Draw, Event, ManualChecks, Rules } from '../types';
import { secretKey, type Dataset } from './key';
import { validateSelection, validateSelectionPool, type SelectionSettings } from '../selection';

export function digest(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex'); }
export function signAudit(audit: Audit) {
  const payload:Partial<Audit>={...audit};delete payload.signature;
  audit.signature = createHmac('sha256', secretKey()).update(canonical(payload)).digest('hex');
}
export function draw(audit: Audit, reason: string | null, settingsInput?: SelectionSettings, repeat = false): Draw {
  const settings = settingsInput ? validateSelection(settingsInput) : undefined;
  if (repeat && (!audit.draws.length || !reason || reason.trim().length < 5 || reason.length > 500)) throw new Error('Registrá un motivo de 5 a 500 caracteres para volver a sortear.');
  const pool = settings ? validateSelectionPool(audit, audit.snapshot.review.valid, settings) : audit.snapshot.review.valid.filter(c => !audit.draws.some(d => d.winner.username === c.username));
  if (!pool.length) throw new Error('No quedan participantes elegibles.');
  const designated = settings?.designatedUsername;
  const rng = designated ? { index: pool.findIndex(c => c.username === designated), words: [], ceiling: 0 } : secureIndex(pool.length, () => randomBytes(4).readUInt32BE(0));
  const payload = {
    id: randomUUID(), at: new Date().toISOString(), winner: pool[rng.index],
    winnerIndex: rng.index, size: pool.length, reason,
    previousHash: audit.events.findLast(e=>e.drawId===audit.draws.at(-1)?.id)?.hash || audit.draws.at(-1)?.hash || audit.snapshotHash,
    random: { algorithm: designated ? 'administrator-designated-v1' as const : 'uint32-rejection-v1' as const, words: rng.words, ceiling: rng.ceiling },
    ...(settings ? { selection: { ...settings, method: designated ? 'designated' as const : 'random' as const, repeat } } : {})
  };
  const result = { ...payload, hash: digest(payload) };
  audit.draws.push(result); audit.status = 'pending'; signAudit(audit);
  return result;
}
export function createAudit(dataset: Dataset, rulesInput: Rules, settings?: SelectionSettings): Audit {
  const rules = validateRules(rulesInput), review = reviewComments(dataset.comments, rules);
  if (!review.valid.length) throw new Error('No hay participantes válidos para sortear.');
  const snapshot = { version: 1 as const, source: dataset.source, rules, comments: dataset.comments, review };
  const audit: Audit = {
    version: 1, id: dataset.id, lockedAt: new Date().toISOString(), snapshot,
    snapshotHash: digest(snapshot), draws: [], events: [], avatars: {}, status: 'pending', signature: '',
    signatureNote: 'HMAC-SHA256 del servidor. El JSON permite verificar hashes y selección, pero no prueba entropía independiente ni impide que el propietario altere o borre su servidor. Conservar el acta y la grabación externa.'
  };
  draw(audit, null, settings); return audit;
}
export function addEvent(audit: Audit, event: Omit<Event, 'at' | 'drawId' | 'hash' | 'previousHash'>) {
  const lastDraw = audit.draws.at(-1)!;
  const lastEvent = audit.events.at(-1);
  const previousHash = lastEvent?.drawId === lastDraw.id ? lastEvent.hash : lastDraw.hash;
  const payload = { ...event, at: new Date().toISOString(), drawId: lastDraw.id, previousHash };
  audit.events.push({ ...payload, hash: digest(payload) }); signAudit(audit);
}
export function confirmWinner(audit: Audit, checks: ManualChecks) {
  if (audit.status !== 'pending') throw new Error('La revisión de este ganador ya está registrada.');
  if (!checks || checks.follows !== true || checks.likes !== true || checks.story !== true) throw new Error('Confirmá manualmente las tres condiciones.');
  audit.status = 'confirmed'; addEvent(audit, { type: 'review', checks });
}
export function disqualify(audit: Audit, reason: string) {
  if (audit.status !== 'pending') throw new Error('Este ganador ya fue revisado.');
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 500) throw new Error('Registrá un motivo de 5 a 500 caracteres.');
  audit.status = 'disqualified'; addEvent(audit, { type: 'disqualification', reason: reason.trim() });
}
