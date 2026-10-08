export const TIMEZONE = 'Africa/Cairo';
export const EXPIRY_CUTOFF = new Date('3000-01-01T00:00:00.000Z');
export const hasExpiry = (d: Date) => d < EXPIRY_CUTOFF;

export const cairoToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

export const toYMD = (d: Date) => d.toISOString().slice(0, 10);
