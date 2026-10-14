import appError from './appError';

export const TIMEZONE = 'Africa/Cairo';
export const EXPIRY_CUTOFF = new Date('3000-01-01T00:00:00.000Z');
export const hasExpiry = (d: Date) => d < EXPIRY_CUTOFF;
export const NO_EXPIRY = new Date('3030-01-01T00:00:00.000Z');

export const cairoToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

export const toYMD = (d: Date) => d.toISOString().slice(0, 10);

const stampFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const cairoStamp = (d: Date) => {
  const p: Record<string, string> = {};
  for (const part of stampFmt.formatToParts(d)) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

export const addDaysYMD = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toYMD(d);
};

export const cairoDay = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);

export const cairoStartOfDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  for (const offset of [2, 3]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, -offset));
    if (cairoStamp(candidate) === `${ymd} 00:00`) return candidate;
  }
  return new Date(Date.UTC(y, m - 1, d, -2));
};

export function resolveDocDate(
  day: string | undefined,
  today: string,
  label: string,
  now = new Date(),
): Date {
  if (!day || day === today) return now;
  return new Date(cairoStartOfDay(day).getTime() + 12 * 60 * 60 * 1000);
}

export const ADJUSTMENT_REASON = {
  DAMAGED: 'تالف',
  EXPIRED: 'منتهي الصلاحية',
  OTHER: 'أخرى',
} as const;
