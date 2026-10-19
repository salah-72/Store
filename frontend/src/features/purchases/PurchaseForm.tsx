import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Combobox from '../../components/Combobox'
import { errorMessage } from '../../lib/api'
import { bigUnitName, fmtMoney, fmtQty, todayYmd, toBaseQty, toDisplayQty, ymdOf, fmtSigned } from '../../lib/format'
import { fetchItems, type Item } from '../items/api'
import { unitName } from '../items/parts'
import { fetchParties, type Party } from '../parties/api'
import { useSavePurchase, type PurchaseDetail, type PurchaseInput, type PurchaseLineInput } from './api'

type ItemLite = Pick<Item, 'id' | 'name' | 'unit' | 'packName' | 'packSize'>
type SupplierLite = Pick<Party, 'id' | 'name'>

interface LineState {
  key: number
  item: ItemLite | null
  mode: 'packs' | 'qty'   // بالعبوات (شكاير/كراتين) ولا بالكمية مباشرة
  qty: string
  total: string           // إجمالي سعر السطر كله
  noExpiry: boolean
  expiry: string
}

let nextKey = 1
const blankLine = (): LineState => ({ key: nextKey++, item: null, mode: 'qty', qty: '', total: '', noExpiry: false, expiry: '' })

function fromPurchase(p: PurchaseDetail): LineState[] {
  return p.lines.map((l) => {
    const usePacks = l.packs !== null && Math.abs(l.packs * 100 - Math.round(l.packs * 100)) < 1e-9
    return {
      key: nextKey++, item: l.item, mode: usePacks ? 'packs' : 'qty',
      qty: String(usePacks ? l.packs : toDisplayQty(l.item.unit, l.baseQty)),
      total: String(Number(l.lineTotal)), noExpiry: !l.hasExpiry, expiry: l.hasExpiry ? ymdOf(l.batch.expiryDate) : '',
    }
  })
}

// الكمية بالوحدة الصغيرة (قطعة/جرام/مل) أو null لو الكمية مش صحيحة
export function computeBase(l: Pick<LineState, 'item' | 'mode' | 'qty'>): number | null {
  const n = Number(l.qty)
  if (!l.item || l.qty.trim() === '' || !(n > 0)) return null
  if (l.mode === 'packs' && l.item.packSize) {
    const q = n * l.item.packSize
    return Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : null
  }
  if (l.item.unit === 'PIECE') return Number.isInteger(n) ? n : null
  const b = toBaseQty(l.item.unit, n)
  return Math.abs(n * 1000 - b) < 1e-6 ? b : null   // مفيش كسور أقل من 1 جرام/مل
}

function buildLines(lines: LineState[]): { payload?: PurchaseLineInput[]; error?: string } {
  const today = todayYmd()
  const out: PurchaseLineInput[] = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], n = i + 1
    if (!l.item) return { error: `السطر ${n}: اختار الصنف` }
    const base = computeBase(l)
    if (base === null) return { error: `السطر ${n}: الكمية غير صحيحة${l.item.unit === 'PIECE' && l.mode === 'qty' ? ' (القطع لازم عدد صحيح)' : ''}` }
    if (l.total.trim() === '' || !(Number(l.total) >= 0)) return { error: `السطر ${n}: اكتب إجمالي سعر السطر` }
    if (!l.noExpiry) {
      if (!l.expiry) return { error: `السطر ${n}: اكتب تاريخ الانتهاء أو اختار "بدون صلاحية"` }
      if (l.expiry <= today) return { error: `السطر ${n}: تاريخ الانتهاء لازم يكون بعد النهارده` }
    }
    const usePacks = l.mode === 'packs' && !!l.item.packSize
    out.push({
      itemId: l.item.id,
      ...(usePacks ? { packs: Number(l.qty) } : { baseQty: base }),
      lineTotal: Math.round(Number(l.total) * 100) / 100,
      expiryDate: l.noExpiry ? null : l.expiry,
    })
  }
  return { payload: out }
}

const snapshot = (lines: LineState[]) => JSON.stringify(lines.map((l) => [l.item?.id, l.mode, l.qty, l.total, l.noExpiry, l.expiry]))
const r2 = (n: number) => Math.round(n * 100) / 100
const costName = { PIECE: 'القطعة', GRAM: 'الكيلو', ML: 'اللتر' } as const

function LineEditor({ index, line, onChange, onRemove, canRemove }: {
  index: number; line: LineState; onChange: (patch: Partial<LineState>) => void; onRemove: () => void; canRemove: boolean
}) {
  const item = line.item
  const hasPack = !!item?.packSize
  const mode = hasPack ? line.mode : 'qty'
  const base = computeBase({ item, mode, qty: line.qty })
  const costPer = item && base && line.total.trim() !== '' ? (Number(line.total) / base) * (item.unit === 'PIECE' ? 1 : 1000) : null

  let qtyHint = ''
  if (!item) qtyHint = 'اختار الصنف الأول'
  else if (base !== null) qtyHint = `= ${fmtQty(item.unit, base)}`
  else if (line.qty.trim() !== '') qtyHint = mode === 'packs' ? 'العدد ده مش بيطلع كمية صحيحة' : item.unit === 'PIECE' ? 'القطع لازم عدد صحيح' : 'الكمية غير صحيحة'

  return (
    <div className="line-card">
      <div className="line-head">
        <b>صنف {index + 1}</b>
        {canRemove && <button type="button" className="link-btn" onClick={onRemove}>حذف السطر</button>}
      </div>
      <div className="form-grid" style={{ marginBottom: 0 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label className="label">الصنف</label>
          <Combobox<ItemLite>
            value={item} cacheKey="items" fetcher={fetchItems} getKey={(i) => i.id} getLabel={(i) => i.name}
            placeholder="ابحث باسم الصنف..."
            onChange={(i) => onChange({ item: i, mode: i.packSize ? 'packs' : 'qty', qty: '' })}
            renderOption={(i) => (
              <>
                <span>{i.name}</span>
                <span className="mu" style={{ fontSize: 12 }}>{unitName[i.unit]}{i.packName && i.packSize ? ` · ${i.packName} = ${fmtQty(i.unit, i.packSize)}` : ''}</span>
              </>
            )}
          />
        </div>
        <div>
          <label className="label">الكمية</label>
          <div className="flex gap-2">
            {hasPack && (
              <select className="input" style={{ flexShrink: 0, minWidth: 92 }} value={mode} onChange={(e) => onChange({ mode: e.target.value as 'packs' | 'qty', qty: '' })}>
                <option value="packs">{item!.packName}</option>
                <option value="qty">{bigUnitName(item!.unit)}</option>
              </select>
            )}
            <input className="input full" type="number" min="0" step="any" inputMode="decimal" value={line.qty} onChange={(e) => onChange({ qty: e.target.value })} disabled={!item} />
          </div>
          <p className={`hint ${base === null && line.qty.trim() !== '' ? 'neg' : ''}`}>{qtyHint}</p>
        </div>
        <div>
          <label className="label">إجمالي سعر السطر (ج)</label>
          <input className="input full" type="number" min="0" step="0.01" inputMode="decimal" value={line.total} onChange={(e) => onChange({ total: e.target.value })} />
          {item && costPer !== null && <p className="hint">تكلفة {costName[item.unit]}: {fmtMoney(r2(costPer))}</p>}
        </div>
        <div>
          <label className="label">تاريخ الانتهاء</label>
          <input className="input full" type="date" value={line.expiry} onChange={(e) => onChange({ expiry: e.target.value })} disabled={line.noExpiry} />
          <label className="check" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={line.noExpiry} onChange={(e) => onChange({ noExpiry: e.target.checked, expiry: e.target.checked ? '' : line.expiry })} /> بدون صلاحية
          </label>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseForm({ initial, presetSupplier }: { initial?: PurchaseDetail; presetSupplier?: SupplierLite }) {
  const navigate = useNavigate()
  const save = useSavePurchase()
  const isEdit = !!initial

  const [supplier, setSupplier] = useState<SupplierLite | null>(initial?.supplier ?? presetSupplier ?? null)
  const [date, setDate] = useState(initial ? ymdOf(initial.date) : todayYmd())
  const [discount, setDiscount] = useState(initial && Number(initial.discount) ? String(Number(initial.discount)) : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [paid, setPaid] = useState(initial && Number(initial.paid) ? String(Number(initial.paid)) : '')
  const [lines, setLines] = useState<LineState[]>(() => (initial ? fromPurchase(initial) : [blankLine()]))
  const [initialSnap] = useState(() => snapshot(lines))
  const [error, setError] = useState('')

  const patch = (key: number, p: Partial<LineState>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const subtotal = r2(lines.reduce((s, l) => s + (Number(l.total) || 0), 0))
  const disc = Number(discount) || 0
  const total = r2(subtotal - disc)
  const paidN = Number(paid) || 0
  const remaining = r2(total - paidN)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!supplier) return setError('اختار المورد')
    // في التعديل: لو الأسطر ما اتغيرتش مابنبعتهاش (عشان فاتورة فيها باتش انتهى تفضل قابلة للتعديل)
    let linesPayload: PurchaseLineInput[] | undefined
    if (!isEdit || snapshot(lines) !== initialSnap) {
      const r = buildLines(lines)
      if (r.error) return setError(r.error)
      linesPayload = r.payload
    }
    if (disc < 0 || paidN < 0) return setError('الخصم والمدفوع مينفعش يكونوا بالسالب')
    if (disc > subtotal) return setError('الخصم أكبر من إجمالي الفاتورة')

    const input: PurchaseInput = { supplierId: supplier.id, date, note: note.trim() || null, paid: paidN, discount: disc, ...(linesPayload && { lines: linesPayload }) }
    try {
      const res = await save.mutateAsync({ id: initial?.id, input })
      navigate(`/purchases/${res.id}`, { replace: true })
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <form onSubmit={onSubmit}>
      {isEdit && <p className="notice">تعديل الأصناف بيعدّل الباتشات في المخزن. لو جزء من الكمية القديمة اتباع أو اترجّع مش هتقدر تقلّلها تحته.</p>}

      <div className="card">
        <div className="form-grid" style={{ marginBottom: 0 }}>
          <div>
            <label className="label">المورد</label>
            <Combobox<SupplierLite>
              value={supplier} cacheKey="suppliers" fetcher={(s) => fetchParties('suppliers', s)} getKey={(s) => s.id} getLabel={(s) => s.name}
              placeholder="ابحث باسم المورد..." autoFocus={!supplier} onChange={setSupplier}
            />
          </div>
          <div>
            <label className="label">التاريخ</label>
            <input className="input full" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">خصم المورد (ج)</label>
            <input className="input full" type="number" min="0" step="0.01" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="label">ملاحظة (اختياري)</label>
          <input className="input full" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
      </div>

      <h3 className="h3">الأصناف</h3>
      {lines.map((l, i) => (
        <LineEditor key={l.key} index={i} line={l} canRemove={lines.length > 1}
          onChange={(p) => patch(l.key, p)} onRemove={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
      ))}
      <button type="button" className="btn outline" onClick={() => setLines((ls) => [...ls, blankLine()])}>+ إضافة صنف</button>
      <p className="hint">لو نفس الصنف بنفس تاريخ الانتهاء وبنفس التكلفة اتورد قبل كده، الكمية بتتضاف على نفس الباتش.</p>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="sum">
          <div>المجموع<b>{fmtMoney(subtotal)}</b></div>
          <div>الخصم<b>{disc ? fmtSigned('-', disc) : '—'}</b></div>
          <div>الإجمالي<span className="big">{fmtMoney(total)}</span></div>
          <div>
            المدفوع
            <span className="flex items-center gap-2">
              <button type="button" className="link-btn" onClick={() => setPaid(String(Math.max(total, 0)))}>الكل</button>
              <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
            </span>
          </div>
          <div>{remaining < 0 ? 'زيادة (ليك عند المورد)' : 'المتبقي (آجل)'}<b className={remaining > 0 ? 'neg' : 'ok'}>{fmtMoney(Math.abs(remaining))}</b></div>
        </div>
      </div>

      {error && <p className="error" style={{ marginBottom: 10 }}>{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn outline" onClick={() => navigate(-1)}>إلغاء</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ وإضافة للمخزن'}</button>
      </div>
    </form>
  )
}
