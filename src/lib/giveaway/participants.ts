import Papa from 'papaparse';
import type { Comment, Review, Rules, SourceKind } from './types';

export function username(value: string) { return value.trim().replace(/^@/, '').toLowerCase(); }
export function validUsername(value: string) { return /^[a-z0-9._]{1,30}$/.test(value) && !value.includes('..'); }
export function validateComments(input: unknown): Comment[] {
  if (!Array.isArray(input) || input.length > 50000) throw new Error('Importá hasta 50.000 comentarios por sorteo.');
  return input.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Fila ${index + 1}: formato inválido.`);
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || !c.id || c.id.length > 200 || typeof c.username !== 'string' || typeof c.text !== 'string' || c.text.length > 5000) throw new Error(`Fila ${index + 1}: falta ID, usuario o comentario válido.`);
    if (c.timestamp !== null && typeof c.timestamp !== 'string') throw new Error(`Fila ${index + 1}: fecha inválida.`);
    return { id: c.id, username: username(c.username), text: c.text, timestamp: c.timestamp as string | null,
      ...(typeof c.displayName === 'string' ? { displayName: c.displayName.slice(0, 100) } : {}),
      ...(typeof c.parentId === 'string' ? { parentId: c.parentId.slice(0, 200) } : {}) };
  });
}
export function validateRules(input: unknown): Rules {
  if (!input || typeof input !== 'object') throw new Error('Configurá las reglas.');
  const r = input as Rules;
  if (typeof r.owner !== 'string' || username(r.owner) !== '_myaimportaciones' || typeof r.requireMention !== 'boolean' || typeof r.allowUndated !== 'boolean' || typeof r.cutoff !== 'string' || !/([+-]\d{2}:\d{2}|Z)$/.test(r.cutoff) || !Number.isFinite(Date.parse(r.cutoff))) throw new Error('Reglas o fecha límite inválidas. Indicá la zona horaria.');
  if (!r.manualExclusions || typeof r.manualExclusions !== 'object' || Array.isArray(r.manualExclusions)) throw new Error('Exclusiones inválidas.');
  const manualExclusions: Record<string, string> = Object.create(null);
  for (const [u, reason] of Object.entries(r.manualExclusions)) {
    if (!validUsername(username(u)) || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500) throw new Error('Cada exclusión requiere una cuenta y un motivo de 3 a 500 caracteres.');
    manualExclusions[username(u)] = reason.trim();
  }
  return { owner: username(r.owner), requireMention: r.requireMention, cutoff: r.cutoff, allowUndated: r.allowUndated, manualExclusions };
}
export function hasMention(c: Comment, owner: string) {
  return [...c.text.matchAll(/(?:^|[^\w@])@([a-zA-Z0-9._]{1,30})(?![a-zA-Z0-9._])/g)]
    .some(m => validUsername(username(m[1])) && username(m[1]) !== c.username && username(m[1]) !== owner);
}
export function reviewComments(comments: Comment[], rules: Rules): Review {
  const valid: Comment[] = [], excluded: Review['excluded'] = [];
  const ids = new Set<string>(), accounts = new Set<string>();
  // Una cuenta conserva su primer comentario que cumple las reglas, no el primero recibido.
  const sorted = [...comments].sort((a,b) => (Date.parse(a.timestamp || '') || Infinity) - (Date.parse(b.timestamp || '') || Infinity) || a.id.localeCompare(b.id, 'en'));
  for (const c of sorted) {
    let reason = '';
    if (!validUsername(c.username)) reason = 'Usuario inválido';
    else if (c.username === rules.owner) reason = 'Cuenta organizadora';
    else if (Object.hasOwn(rules.manualExclusions,c.username)) reason = `Exclusión manual: ${rules.manualExclusions[c.username]}`;
    else if (ids.has(c.id)) reason = 'ID de comentario duplicado';
    else if (c.timestamp && (!/([+-]\d{2}:?\d{2}|Z)$/.test(c.timestamp) || !Number.isFinite(Date.parse(c.timestamp)))) reason = 'Fecha inválida o sin zona horaria';
    else if (!c.timestamp && !rules.allowUndated) reason = 'Sin fecha: requiere aceptación manual';
    else if (c.timestamp && Date.parse(c.timestamp) > Date.parse(rules.cutoff)) reason = 'Posterior al cierre';
    else if (rules.requireMention && !hasMention(c, rules.owner)) reason = 'Sin mención válida a otra persona';
    else if (accounts.has(c.username)) reason = 'Una participación por cuenta';
    ids.add(c.id);
    if (reason) excluded.push({ comment: c, reason });
    else { accounts.add(c.username); valid.push(c); }
  }
  valid.sort((a,b) => a.username.localeCompare(b.username, 'en'));
  return { valid, excluded, processed: comments.length, undated: comments.filter(c => !c.timestamp).length };
}
export function parseImport(text: string, kind: Exclude<SourceKind, 'instagram' | 'demo'>): Comment[] {
  if (text.length > 10_000_000) throw new Error('El archivo supera 10 MB.');
  if (kind === 'list') {
    const comments = text.split(/\r?\n/).filter(line => line.trim()).map((line, i) => {
      const [u, ...parts] = line.split('|');
      return { id: `list:${i + 1}`, username: username(u), text: parts.join('|').trim(), timestamp: null };
    });
    if (!comments.length) throw new Error('La lista está vacía.');
    return validateComments(comments);
  }
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim().toLowerCase() });
  if (parsed.errors.length) throw new Error(`CSV inválido: ${parsed.errors[0].message}`);
  const headers = parsed.meta.fields || [];
  if (headers.some(h=>/password|contrase[nñ]a|access.?token|cookie|session|secret|authorization/.test(h))) throw new Error('Este archivo contiene columnas de credenciales. Importá únicamente usuarios y comentarios públicos.');
  if (!headers.includes('username') && !headers.includes('usuario')) throw new Error('El CSV necesita una columna username o usuario.');
  const comments = parsed.data.map((row, i) => ({
    id: row.id_json ? sourceString(row.id_json,i) : row.id || row.comment_id || `csv:${i + 1}`,
    username: username(row.username || row.usuario || ''),
    text: row.text_json ? sourceString(row.text_json,i) : row.text || row.comment || row.comentario || '',
    timestamp: row.timestamp || row.fecha || null,
    ...(row.name_json || row.name || row.nombre ? { displayName: row.name_json ? sourceString(row.name_json,i) : row.name || row.nombre } : {})
  }));
  if (!comments.length) throw new Error('El CSV está vacío.');
  return validateComments(comments);
}
function sourceString(value:string,row:number){try{const result=JSON.parse(value);if(typeof result!=='string')throw new Error();return result;}catch{throw new Error(`Fila ${row+1}: el dato JSON del CSV preparado es inválido.`);}}
export function participantCsv(comments:Comment[]){return '\uFEFF'+['username,text_json,timestamp,id_json,name_json',...comments.map(c=>[c.username,JSON.stringify(c.text),c.timestamp||'',JSON.stringify(c.id),JSON.stringify(c.displayName||'')].map(csvCell).join(','))].join('\r\n');}
export function csvCell(value: unknown) {
  let s = String(value ?? '');
  if (/^[\s]*[=+@\-]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
