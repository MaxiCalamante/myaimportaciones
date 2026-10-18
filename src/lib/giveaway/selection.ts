import type { Audit, Comment, Draw, Event } from './types';
import { validUsername } from './participants';

export type SelectionSettings = {
  designatedUsername: string | null;
  requirementsReviewed: boolean;
  excludePreviousWinners: boolean;
  excludedUsernames: string[];
};
export const DEFAULT_SELECTION: SelectionSettings = {
  designatedUsername: null, requirementsReviewed: false,
  excludePreviousWinners: true, excludedUsernames: [],
};
export function validateSelection(input: unknown): SelectionSettings {
  if (!input || typeof input !== 'object') throw new Error('Configuración de selección inválida.');
  const s = input as SelectionSettings;
  if ((s.designatedUsername !== null && (typeof s.designatedUsername !== 'string' || !validUsername(s.designatedUsername))) ||
      typeof s.requirementsReviewed !== 'boolean' || typeof s.excludePreviousWinners !== 'boolean' ||
      !Array.isArray(s.excludedUsernames) || s.excludedUsernames.length > 50000 ||
      s.excludedUsernames.some(u => typeof u !== 'string' || !validUsername(u))) throw new Error('Configuración de selección inválida.');
  if (s.designatedUsername && !s.requirementsReviewed) throw new Error('Confirmá la revisión manual de todos los requisitos del participante designado.');
  return { designatedUsername: s.designatedUsername, requirementsReviewed: Boolean(s.designatedUsername && s.requirementsReviewed),
    excludePreviousWinners: s.excludePreviousWinners, excludedUsernames: [...new Set(s.excludedUsernames)].sort() };
}
export function selectionPool(valid: Comment[], draws: Draw[], events: Event[], settings: SelectionSettings): Comment[] {
  const excluded = new Set(settings.excludedUsernames);
  for (const d of draws) {
    if (settings.excludePreviousWinners || events.some(e => e.drawId === d.id && e.type === 'disqualification')) excluded.add(d.winner.username);
  }
  return valid.filter(c => !excluded.has(c.username));
}
export function validateSelectionPool(audit: Pick<Audit, 'draws' | 'events'>, valid: Comment[], settings: SelectionSettings) {
  const pool = selectionPool(valid, audit.draws, audit.events, settings);
  if (!pool.length) throw new Error('No quedan participantes elegibles.');
  if (settings.designatedUsername && !pool.some(c => c.username === settings.designatedUsername)) throw new Error('El participante designado no es válido o está excluido. Limpiá o cambiá la selección.');
  return pool;
}
