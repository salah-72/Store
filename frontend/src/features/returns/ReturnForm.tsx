import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../../lib/api'
import { bigUnitName, fmtMoney, fmtQty, todayYmd, toBaseQty, toDisplayQty, ymdOf, type Unit } from '../../lib/format'
import { usePurchase } from '../purchases/api'
import { useSale } from '../sales/api'
import { returnCfg, useCreateReturn, useReturnable, useUpdateReturn, type ReturnKind } from './api'

const r2 = (n: number) => Math.round(n * 100) / 100

// الكمية المكتوبة (بالكيلو/لتر/قطعة) => الوحدة الصغيرة، أو null لو غير صحيحة
function toBase(unit: Unit, text: string): number | null {
  const n = Number(text)
  if (text.trim() === '' || !(n > 0)) return null
  if (unit === 'PIECE') return Number.isInteger(n) ? n : null
  const b = toBaseQty(unit, n)
  return Math.abs(n * 1000 - b) < 1e-6 ? b : null
}

export default function ReturnForm({ kind, invoiceId }: { kind: ReturnKind; invoiceId: number }) {
  const cfg = returnCfg[kind]
  const navigate = useNavigate()
  const returnable = useReturnable(kind, invoiceId)
  const sale = useSale(kind === 'sale' ? invoiceId : null)
  const purchase = usePurchase(kind === 'purchase' ? invoiceId : null)
  const create = useCreateReturn(kind)
  const update = useUpdateReturn(kind)

  const [qty, setQty] = useState<Record<number, string>>({})
  const [cashMode, setCashMode] = useState<'none' | 'all' | 'custom'>('none')
  const [cash, setCash] = useState('')
  const [date, setDate] = useState(todayYmd())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const invoice = kind === 'sale' ? sale : purchase
  if (returnable.isPending || invoice.isPending) return <p className="mu">جاري التحميل...</p>
  const err = returnable.error ?? invoice.error
  if (err) return <p className="error">{errorMessage(err)}</p>

  const inv = invoice.data!
  const unitOf = new Map<number, Unit>(inv.lines.map((l) => [l.id, l.item.unit]))
  const party = kind === 'sale' ? (inv as typeof sale.data & object).customer : (inv as typeof purchase.data & object).supplier
  const isCashSale = kind === 'sale' && !returnable.data!.customerId
  const lines = returnable.data!.lines

  const rows = lines.map((l) => {
    const unit = unitOf.get(l.lineId) ?? 'PIECE'
    const text = qty[l.lineId] ?? ''
    const base = toBase(unit, text)
    return { l, unit, text, base, value: base ? r2(base * l.netUnitValue) : 0 }
  })
  const chosen = rows.filter((r) => r.text.trim() !== '')
  const estimate = r2(chosen.reduce((s, r) => s + r.value, 0))

  async function submit() {
    setError('')
    if (chosen.length === 0) return setError('اكتب كمية المرتجع لصنف واحد على الأقل')
    for (const r of chosen) {
      if (r.base === null) return setError(`${r.l.itemName}: الكمية غير صحيحة${r.unit === 'PIECE' ? ' (القطع لازم عدد صحيح)' : ''}`)
      if (r.base > r.l.returnable) return setError(`${r.l.itemName}: اللي ينفع يترجّع ${fmtQty(r.unit, r.l.returnable)} بس`)
    }
    if (cashMode === 'custom') {
      const c = Number(cash)
      if (!(c >= 0)) return setError('المبلغ النقدي غير صحيح')
      if (c > estimate + 0.5) return setError('المبلغ النقدي أكبر من قيمة المرتجع')
    }
    try {
      const created = await create.mutateAsync({
        invoiceId, date, note: note.trim() || null,
        // البيع النقدي: السيرفر بيرجّع القيمة كلها كاش لوحده
        ...(!isCashSale && { cashRefund: cashMode === 'custom' ? Number(cash) : 0 }),
        lines: chosen.map((r) => ({ lineId: r.l.lineId, baseQty: r.base! })),
      })
      let notice: string | undefined
      if (!isCashSale && cashMode === 'all') {
        // القيمة النهائية بيحسبها السيرفر، فبنثبّت المبلغ النقدي بعد الإنشاء بالرقم الدقيق
        try { await update.mutateAsync({ id: created.id, input: { cashRefund: Number(created.total) } }) }
        catch { notice = 'المرتجع اتسجل، بس مقدرتش أسجّل رد الفلوس كاش. عدّل "الفلوس المرجّعة" من هنا.' }
      }
      navigate(`/returns/${kind}/${created.id}`, { replace: true, state: { notice } })
    } catch (e) { setError(errorMessage(e)) }
  }

  const busy = create.isPending || update.isPending
  return (
    <div>
      <div className="card">
        <b>{cfg.invoice} #{invoiceId}</b> <span className="mu">· {ymdOf(inv.date).split('-').reverse().join('/')} · {cfg.partyLabel}: {party ? party.name : 'نقدي'}</span>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{[kind === 'sale' ? 'اتباع' : 'اتشترى', 'اترجّع قبل كده', ...(kind === 'purchase' ? ['في المخزن'] : []), 'ينفع يترجّع', 'كمية المرتجع', 'القيمة'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ l, unit, text, base, value }) => (
              <tr key={l.lineId}>
                <td><b>{l.itemName}</b><div className="mu" style={{ fontSize: 12 }}>{fmtQty(unit, l.qty)}</div></td>
                <td>{l.returned ? fmtQty(unit, l.returned) : <span className="mu">—</span>}</td>
                {kind === 'purchase' && <td>{fmtQty(unit, l.inStock ?? 0)}</td>}
                <td>{l.returnable > 0 ? fmtQty(unit, l.returnable) : <span className="neg">مفيش</span>}</td>
                <td style={{ minWidth: 170 }}>
                  <div className="flex items-center gap-1">
                    <input
                      className="input" style={{ width: 90 }} type="number" min="0" step="any" inputMode="decimal" disabled={l.returnable <= 0}
                      value={text} onChange={(e) => setQty((q) => ({ ...q, [l.lineId]: e.target.value }))}
                    />
                    <span className="mu" style={{ fontSize: 12 }}>{bigUnitName(unit)}</span>
                    {l.returnable > 0 && <button type="button" className="link-btn" onClick={() => setQty((q) => ({ ...q, [l.lineId]: String(toDisplayQty(unit, l.returnable)) }))}>الكل</button>}
                  </div>
                  {text.trim() !== '' && base === null && <p className="hint neg" style={{ margin: 0 }}>كمية غير صحيحة</p>}
                  {base !== null && base > l.returnable && <p className="hint neg" style={{ margin: 0 }}>أكبر من المسموح</p>}
                </td>
                <td>{base ? fmtMoney(value) : <span className="mu">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">القيمة تقريبية (بعد خصم الفاتورة). السيرفر هو اللي بيحسب الرقم النهائي بالظبط.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div>
            <label className="label">تاريخ المرتجع</label>
            <input className="input full" type="date" value={date} max={todayYmd()} min={ymdOf(inv.date)} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="label">ملاحظة (اختياري)</label>
            <input className="input full" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
        </div>

        <label className="label">{kind === 'sale' ? 'الفلوس' : 'التسوية'}</label>
        {isCashSale ? (
          <p className="hint" style={{ margin: 0 }}>الفاتورة نقدي، فالقيمة كلها بتترجّع كاش للعميل.</p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            <label className="check"><input type="radio" checked={cashMode === 'none'} onChange={() => setCashMode('none')} /> {cfg.creditLabel} (من غير كاش)</label>
            <label className="check"><input type="radio" checked={cashMode === 'all'} onChange={() => setCashMode('all')} /> {cfg.cashLabel}: كل القيمة</label>
            <label className="check">
              <input type="radio" checked={cashMode === 'custom'} onChange={() => setCashMode('custom')} /> {cfg.cashLabel}: مبلغ محدد
              {cashMode === 'custom' && <input className="input" style={{ width: 110 }} type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />}
            </label>
          </div>
        )}

        <div className="sum">
          <div>قيمة المرتجع (تقريباً)<span className="big">{fmtMoney(estimate)}</span></div>
        </div>
      </div>

      {error && <p className="error" style={{ margin: '10px 0' }}>{error}</p>}
      <div className="flex justify-end gap-2" style={{ marginTop: 10 }}>
        <button type="button" className="btn outline" onClick={() => navigate(-1)}>إلغاء</button>
        <button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'جاري الحفظ...' : 'تسجيل المرتجع'}</button>
      </div>
    </div>
  )
}
