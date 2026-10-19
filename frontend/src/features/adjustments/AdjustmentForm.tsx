import { useState, type FormEvent } from 'react'
import Combobox from '../../components/Combobox'
import { FormActions } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { bigUnitName, fmtDate, fmtMoney, fmtQty, hasExpiryDate, todayYmd, toBaseQty, toDisplayQty } from '../../lib/format'
import { fetchItems, useItem, type Item } from '../items/api'
import { useCreateAdjustment } from './api'

type ItemLite = Pick<Item, 'id' | 'name' | 'unit'>
const REASONS = ['تالف', 'منتهي الصلاحية', 'أخرى'] as const

// تسجيل كمية تالفة/منتهية: بتتشال من باتش معين وبتتحسب خسارة بتكلفة الباتش
export default function AdjustmentForm({ presetItem, presetBatchId, onDone }: { presetItem?: ItemLite; presetBatchId?: number; onDone: () => void }) {
  const create = useCreateAdjustment()
  const [item, setItem] = useState<ItemLite | null>(presetItem ?? null)
  const full = useItem(item?.id ?? null)
  const [batchId, setBatchId] = useState<number | null>(presetBatchId ?? null)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [date, setDate] = useState(todayYmd())
  const [error, setError] = useState('')

  const batches = full.data?.batches ?? []
  const batch = batches.find((b) => b.id === batchId) ?? null
  const unit = item?.unit ?? 'PIECE'
  // السبب الافتراضي: منتهي لو الباتش منتهي، وإلا تالف
  const reasonValue = reason || (batch?.expired ? 'منتهي الصلاحية' : 'تالف')
  const finalReason = reasonValue === 'أخرى' ? custom.trim() : reasonValue

  const n = Number(qty)
  const base = qty.trim() !== '' && n > 0 ? toBaseQty(unit, n) : null
  const exact = base !== null && (unit === 'PIECE' ? Number.isInteger(n) : Math.abs(n * 1000 - base) < 1e-6)
  const loss = batch && base && exact ? Math.round(Number(batch.unitCost) * base * 100) / 100 : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!item || !batch) return setError('اختار الصنف والباتش')
    if (!exact || !base) return setError(unit === 'PIECE' ? 'اكتب عدد قطع صحيح' : 'الكمية غير صحيحة')
    if (base > batch.qtyRemaining) return setError(`المتاح في الباتش ${fmtQty(unit, batch.qtyRemaining)} بس`)
    if (!finalReason) return setError('اكتب السبب')
    try {
      await create.mutateAsync({ batchId: batch.id, baseQty: base, reason: finalReason, date })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label className="label">الصنف</label>
        <Combobox<ItemLite>
          value={item} cacheKey="items" fetcher={fetchItems} getKey={(i) => i.id} getLabel={(i) => i.name}
          placeholder="ابحث باسم الصنف..." autoFocus={!presetItem} disabled={!!presetItem}
          onChange={(i) => { setItem(i); setBatchId(null); setQty('') }}
        />
      </div>

      {item && (
        <div>
          <label className="label">الباتش (تاريخ الانتهاء)</label>
          {full.isPending && <p className="mu">جاري تحميل الباتشات...</p>}
          {full.data && batches.length === 0 && <p className="hint neg">مفيش كمية في المخزن من الصنف ده.</p>}
          <div className="stack" style={{ gap: 6 }}>
            {batches.map((b) => (
              <label key={b.id} className="check" style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '6px 10px', background: b.id === batchId ? 'var(--bs)' : undefined }}>
                <input type="radio" name="batch" checked={b.id === batchId} onChange={() => { setBatchId(b.id); setQty('') }} />
                <span>{hasExpiryDate(b.expiryDate) ? fmtDate(b.expiryDate) : 'بدون صلاحية'}</span>
                <span className="mu">· متبقي {fmtQty(unit, b.qtyRemaining)}</span>
                {b.expired && <span className="neg">· منتهي</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {batch && (
        <>
          <div className="form-grid" style={{ marginBottom: 0 }}>
            <div>
              <label className="label">الكمية ({bigUnitName(unit)})</label>
              <div className="flex gap-2">
                <input className="input full" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
                <button type="button" className="btn outline" onClick={() => setQty(String(toDisplayQty(unit, batch.qtyRemaining)))}>الكل</button>
              </div>
              {base !== null && exact && <p className="hint">= {fmtQty(unit, base)}{loss !== null && ` · الخسارة ${fmtMoney(loss)}`}</p>}
            </div>
            <div>
              <label className="label">التاريخ</label>
              <input className="input full" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">السبب</label>
            <select className="input full" value={reasonValue} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {reasonValue === 'أخرى' && <input className="input full" style={{ marginTop: 6 }} placeholder="اكتب السبب" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={150} />}
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={create.isPending} label="تسجيل وخصم من المخزن" />
    </form>
  )
}
