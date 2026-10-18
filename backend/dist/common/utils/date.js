"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADJUSTMENT_REASON = exports.cairoStartOfDay = exports.cairoDay = exports.addDaysYMD = exports.toYMD = exports.cairoToday = exports.NO_EXPIRY = exports.hasExpiry = exports.EXPIRY_CUTOFF = exports.TIMEZONE = void 0;
exports.resolveDocDate = resolveDocDate;
exports.TIMEZONE = 'Africa/Cairo';
exports.EXPIRY_CUTOFF = new Date('3000-01-01T00:00:00.000Z');
const hasExpiry = (d) => d < exports.EXPIRY_CUTOFF;
exports.hasExpiry = hasExpiry;
exports.NO_EXPIRY = new Date('3030-01-01T00:00:00.000Z');
const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: exports.TIMEZONE }).format(new Date());
exports.cairoToday = cairoToday;
const toYMD = (d) => d.toISOString().slice(0, 10);
exports.toYMD = toYMD;
const stampFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: exports.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});
const cairoStamp = (d) => {
    const p = {};
    for (const part of stampFmt.formatToParts(d))
        p[part.type] = part.value;
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};
const addDaysYMD = (ymd, n) => {
    const d = new Date(`${ymd}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return (0, exports.toYMD)(d);
};
exports.addDaysYMD = addDaysYMD;
const cairoDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: exports.TIMEZONE }).format(d);
exports.cairoDay = cairoDay;
const cairoStartOfDay = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    for (const offset of [2, 3]) {
        const candidate = new Date(Date.UTC(y, m - 1, d, -offset));
        if (cairoStamp(candidate) === `${ymd} 00:00`)
            return candidate;
    }
    return new Date(Date.UTC(y, m - 1, d, -2));
};
exports.cairoStartOfDay = cairoStartOfDay;
function resolveDocDate(day, today, label, now = new Date()) {
    if (!day || day === today)
        return now;
    return new Date((0, exports.cairoStartOfDay)(day).getTime() + 12 * 60 * 60 * 1000);
}
exports.ADJUSTMENT_REASON = {
    DAMAGED: 'تالف',
    EXPIRED: 'منتهي الصلاحية',
    OTHER: 'أخرى',
};
