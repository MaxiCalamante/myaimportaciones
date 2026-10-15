import type { CampaignConfig } from './live';
import type { Rules } from './types';

export const GIVEAWAY_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const MOTHERS_DAY_SCHEDULE = '2026-10-18T12:00:00-03:00';

export function eventDate(value: string | null) {
  if (!value) return 'Fecha a confirmar';
  const label = new Intl.DateTimeFormat('es-AR', {
    timeZone: GIVEAWAY_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function eventTime(value: string | null) {
  if (!value) return 'Horario a confirmar';
  const time = new Intl.DateTimeFormat('es-AR', {
    timeZone: GIVEAWAY_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
  return `${time} h${time === '12:00' ? ' · Mediodía' : ''} · Argentina`;
}

export function validateCampaignTiming(config: CampaignConfig, rules: Rules) {
  if (config.scheduledFor && Date.parse(rules.cutoff) > Date.parse(config.scheduledFor)) {
    throw new Error('El cierre de comentarios debe ser anterior o igual al horario del sorteo.');
  }
}

function calendarText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, '\\$&');
}

export function eventCalendar(config: Pick<CampaignConfig, 'title' | 'scheduledFor'>, url: string) {
  if (!config.scheduledFor) throw new Error('El sorteo todavía no tiene horario.');
  const start = Date.parse(config.scheduledFor);
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MYA Importaciones//Sorteos//ES',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:mya-sorteo-${stamp(start)}@myaimportaciones.vercel.app`,
    `DTSTAMP:${stamp(start)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + 1800000)}`,
    `SUMMARY:${calendarText(config.title + ' · MYA Importaciones')}`,
    `DESCRIPTION:${calendarText('Seguí la selección y el resultado en la página de MYA. ' + url)}`,
    `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
