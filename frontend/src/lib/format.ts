// كل الكميات في السيرفر أرقام صحيحة بوحدة الصنف: قطعة / جرام / مل
export type Unit = 'PIECE' | 'GRAM' | 'ML'

export const unitLabel: Record<Unit, string> = { PIECE: 'قطعة', GRAM: 'وزن (جرام)', ML: 'سائل (مل)' }
export const priceSuffix: Record<Unit, string> = { PIECE: 'للقطعة', GRAM: 'للكيلو', ML: 'للتر' }

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
export const fmtNumber = (v: number | string) => nf.format(Number(v))
export const fmtMoney = (v: number | string) => `${nf.format(Number(v))} ج`

// 2500 جرام => "2 كجم و500 جم" ، 350 مل => "350 مل"
export function fmtQty(unit: Unit, qty: number): string {
  if (unit === 'PIECE') return `${fmtNumber(qty)} قطعة`
  const [big, small] = unit === 'GRAM' ? ['كجم', 'جم'] : ['لتر', 'مل']
  if (qty < 1000) return `${fmtNumber(qty)} ${small}`
  const whole = Math.floor(qty / 1000), rest = qty % 1000
  return rest === 0 ? `${fmtNumber(whole)} ${big}` : `${fmtNumber(whole)} ${big} و${rest} ${small}`
}

// الحقول اللي بالجرام/مل بنعرضها للمستخدم بالكيلو/لتر (÷1000) ونرجعها (×1000) قبل الإرسال
export const toDisplayQty = (unit: Unit, base: number) => (unit === 'PIECE' ? base : base / 1000)
export const toBaseQty = (unit: Unit, shown: number) => (unit === 'PIECE' ? Math.round(shown) : Math.round(shown * 1000))
export const bigUnitName = (unit: Unit) => (unit === 'PIECE' ? 'قطعة' : unit === 'GRAM' ? 'كجم' : 'لتر')

// ---- التواريخ (بتوقيت القاهرة) ----
const cairoYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' })
export const todayYmd = () => cairoYmd.format(new Date())
export const ymdOf = (iso: string) => cairoYmd.format(new Date(iso))
export const fmtDate = (iso: string) => { const [y, m, d] = ymdOf(iso).split('-'); return `${d}/${m}/${y}` }
export const daysUntil = (iso: string) =>
  Math.round((Date.parse(`${ymdOf(iso)}T00:00:00Z`) - Date.parse(`${todayYmd()}T00:00:00Z`)) / 864e5)
// السيرفر بيخزن "بدون صلاحية" كتاريخ سنة 3030
export const hasExpiryDate = (iso: string | null | undefined): iso is string => !!iso && Number(iso.slice(0, 4)) < 3000
export const NEAR_EXPIRY_DAYS = 90

// ---- حساب التواريخ (yyyy-mm-dd) ----
export const addDaysYmd = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)
export const monthStartYmd = (ymd: string) => `${ymd.slice(0, 8)}01`
export const fmtShortDay = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`

// مبلغ بعلامة (+/-) : الـ LRI/PDI بيمنعوا العلامة إنها تتقلب لآخر الرقم في الكتابة من اليمين لليسار
export const fmtSigned = (sign: '-' | '+', v: number | string) => `⁦${sign}${fmtMoney(v)}⁩`
