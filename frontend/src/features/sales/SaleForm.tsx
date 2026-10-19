import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Combobox from '../../components/Combobox'
import { api, errorMessage } from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'
import { bigUnitName, fmtMoney, fmtNumber, fmtQty, priceSuffix, todayYmd, toBaseQty, ymdOf } from '../../lib/format'
import type { Item } from '../items/api'
import { fetchParties, type Party } from '../parties/api'
import { useSaveSale, type SaleDetail, type SaleInput, type SaleLineInput } from './api'

// الصنف بالبيانات اللي محتاجينها للبيع. في التعديل بعض الحقول (العبوة/المتاح) مش بتيجي من السيرفر
type SellItem = Pick<Item, 'id' | 'name' | 'unit' | 'price' | 'priceBasis'> & Partial<Pick<Item, 'packName' | 'packSize' | 'sellable'>>
type CustomerLite = Pick<Party, 'id' | 'name'> & Partial<Pick<Party, 'remaining'>>

interface CartLine {
  key: number
  item: SellItem
  mode: 'qty' | 'pack'   // بالكيلو/اللتر/القطعة ولا بالعبوة
  qty: string
  price: string          // سعر الوحدة الكبيرة (كيلو/لتر/قطعة)
  total: string | null   // لو المستخدم كتب الإجمالي بنفسه
}

let nextKey = 1
const r2 = (n: number) => Math.round(n * 100) / 100
const isClean2 = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6

const newLine = (item: SellItem): CartLine => ({
  key: nextKey++, item, mode: 'qty', qty: item.unit === 'PIECE' ? '1' : '', price: String(Number(item.price)), total: null,
})

function fromSale(s: SaleDetail): CartLine[] {
  return s.lines.map((l) => {
    const item: SellItem = { id: l.item.id, name: l.item.name, unit: l.item.unit, priceBasis: l.item.priceBasis, price: '0' }
    const perBase = Number(l.unitPrice) * l.item.priceBasis
    const clean = isClean2(perBase)
    return {
      key: nextKey++, item, mode: 'qty',
      qty: String(l.item.unit === 'PIECE' ? l.baseQty : l.baseQty / 1000),
      price: String(r2(perBase)),
      total: clean ? null : String(Number(l.lineTotal)),   // سعر مش مضبوط => نثبّت الإجمالي زي ما اتباع
    }
  })
}

// الكمية بالوحدة الصغيرة، أو null لو الكمية مش صحيحة
function baseOf(l: Pick<CartLine, 'item' | 'mode' | 'qty'>): number | null {
  const n = Number(l.qty)
  if (l.qty.trim() === '' || !(n > 0)) return null
  if (l.mode === 'pack' && l.item.packSize) {
    const q = n * l.item.packSize
    return Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : null
  }
  if (l.item.unit === 'PIECE') return Number.isInteger(n) ? n : null
  const b = toBaseQty(l.item.unit, n)
  return Math.abs(n * 1000 - b) < 1e-6 ? b : null
}
function totalOf(l: CartLine): number {
  if (l.total !== null) return Number(l.total) || 0
  const b = baseOf(l)
  return b ? r2((b * (Number(l.price) || 0)) / l.item.priceBasis) : 0
}

function buildLines(lines: CartLine[], checkStock: boolean): { payload?: SaleLineInput[]; error?: string } {
  const out: SaleLineInput[] = []
  const used = new Map<number, number>()
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], n = i + 1
    const base = baseOf(l)
    if (base === null) return { error: `${l.item.name}: الكمية غير صحيحة${l.item.unit === 'PIECE' && l.mode === 'qty' ? ' (القطع لازم عدد صحيح)' : ''}` }
    if (l.total !== null ? !(Number(l.total) >= 0) : !(Number(l.price) >= 0) || l.price.trim() === '') return { error: `${l.item.name}: السعر غير صحيح` }
    if (checkStock && l.item.sellable !== undefined) {
      const total = (used.get(l.item.id) ?? 0) + base
      used.set(l.item.id, total)
      if (total > l.item.sellable) return { error: `${l.item.name}: المتاح للبيع ${fmtQty(l.item.unit, l.item.sellable)} بس (السطر ${n})` }
    }
    out.push({
      itemId: l.item.id, baseQty: base,
      ...(l.total !== null ? { lineTotal: r2(Number(l.total)) } : { price: Number(l.price) }),
    })
  }
  return { payload: out }
}
const snapshot = (lines: CartLine[]) => JSON.stringify(lines.map((l) => [l.item.id, l.mode, l.qty, l.price, l.total]))

// ---------- شبكة الأصناف (يسار) ----------
function ProductPicker({ onPick }: { onPick: (i: Item) => void }) {
  const [text, setText] = useState('')
  const search = useDebounce(text, 250)
  const { data = [], isFetching } = useQuery({
    queryKey: ['pos-items', search.trim()],
    queryFn: async () =>
      (await api.get('/items', { params: { search: search.trim() || undefined, limit: 36, active: 'true' } })).data.data as Item[],
    staleTime: 10_000,
  })
  function pick(i: Item) { if (i.sellable > 0) { onPick(i); setText('') } }
  return (
    <div className="card">
      <input
        className="input full" autoFocus autoComplete="off" placeholder="ابحث باسم الصنف... (Enter يضيف أول نتيجة)"
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const first = data.find((i) => i.sellable > 0); if (first) pick(first) } }}
      />
      <div className="pg">
        {data.map((i) => (
          <button key={i.id} type="button" className={`p ${i.sellable <= 0 ? 'off' : ''}`} disabled={i.sellable <= 0} onClick={() => pick(i)}>
            <b>{i.name}</b>
            <span>{fmtNumber(i.price)} ج {i.unit !== 'PIECE' && <small>/ {bigUnitName(i.unit)}</small>}</span>
            <small className={i.sellable <= 0 || i.lowStock ? 'neg' : 'mu'}>{i.sellable <= 0 ? 'نفد' : `متاح ${fmtQty(i.unit, i.sellable)}`}</small>
          </button>
        ))}
      </div>
      {data.length === 0 && <p className="mu" style={{ textAlign: 'center', margin: '18px 0 4px' }}>{isFetching ? 'جاري البحث...' : 'مفيش أصناف'}</p>}
    </div>
  )
}

// ---------- سطر في السلة ----------
function CartRow({ line, onChange, onRemove }: { line: CartLine; onChange: (p: Partial<CartLine>) => void; onRemove: () => void }) {
  const { item } = line
  const hasPack = !!item.packSize
  const mode = hasPack ? line.mode : 'qty'
  const base = baseOf({ item, mode, qty: line.qty })
  const total = totalOf(line)
  const unitName = bigUnitName(item.unit)
  const qtyBad = line.qty.trim() !== '' && base === null
  const over = base !== null && item.sellable !== undefined && base > item.sellable

  function onTotal(v: string) {
    const patch: Partial<CartLine> = { total: v }
    // بيع بالمبلغ: لو الكمية فاضية والسعر معروف نحسب الكمية من المبلغ
    if (line.qty.trim() === '' && item.unit !== 'PIECE' && Number(line.price) > 0 && Number(v) > 0) {
      patch.qty = String(Math.round((Number(v) / Number(line.price)) * 1000) / 1000)
      patch.mode = 'qty'
    }
    onChange(v === '' ? { total: null } : patch)
  }

  return (
    <div className="cart-line">
      <div className="line-head" style={{ marginBottom: 6 }}>
        <b>{item.name}</b>
        <button type="button" className="link-btn" title="شيل الصنف" onClick={onRemove}>✕</button>
      </div>
      <div className="cart-grid">
        <div>
          <label className="label">الكمية</label>
          <div className="flex gap-1">
            {hasPack && (
              <select className="input" style={{ flexShrink: 0 }} value={mode} onChange={(e) => onChange({ mode: e.target.value as 'qty' | 'pack', qty: '', total: null })}>
                <option value="qty">{unitName}</option>
                <option value="pack">{item.packName}</option>
              </select>
            )}
            <input
              id={`qty-${line.key}`} className="input full" type="number" min="0" step="any" inputMode="decimal"
              value={line.qty} onChange={(e) => onChange({ qty: e.target.value, total: null })}
            />
          </div>
        </div>
        <div>
          <label className="label">السعر {item.unit !== 'PIECE' && `/ ${unitName}`}</label>
          <input className="input full" type="number" min="0" step="0.01" inputMode="decimal" value={line.price} onChange={(e) => onChange({ price: e.target.value, total: null })} />
        </div>
        <div>
          <label className="label">الإجمالي</label>
          <input className="input full" type="number" min="0" step="0.01" inputMode="decimal" value={line.total ?? (base ? String(total) : '')} onChange={(e) => onTotal(e.target.value)} />
        </div>
      </div>
      <p className={`hint ${qtyBad || over ? 'neg' : ''}`} style={{ margin: '4px 0 0' }}>
        {qtyBad ? (item.unit === 'PIECE' && mode === 'qty' ? 'القطع لازم عدد صحيح' : 'الكمية غير صحيحة')
          : over ? `المتاح للبيع ${fmtQty(item.unit, item.sellable!)} بس`
          : base !== null ? `= ${fmtQty(item.unit, base)}${line.total !== null ? ' · إجمالي معدّل' : ''}`
          : item.sellable !== undefined ? `متاح ${fmtQty(item.unit, item.sellable)} · ${priceSuffix[item.unit]}` : ''}
      </p>
    </div>
  )
}

// ---------- الفاتورة كلها ----------
export default function SaleForm({ initial, presetCustomer, onSaved }: { initial?: SaleDetail; presetCustomer?: CustomerLite; onSaved: (sale: SaleDetail, print: boolean) => void }) {
  const save = useSaveSale()
  const isEdit = !!initial

  const [customer, setCustomer] = useState<CustomerLite | null>(initial?.customer ?? presetCustomer ?? null)
  const [date, setDate] = useState(initial ? ymdOf(initial.date) : todayYmd())
  const [discount, setDiscount] = useState(initial && Number(initial.discount) ? String(Number(initial.discount)) : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [paid, setPaid] = useState(initial?.customer ? String(Number(initial.paid)) : '')
  const [paidTouched, setPaidTouched] = useState(!!initial?.customer)
  const [lines, setLines] = useState<CartLine[]>(() => (initial ? fromSale(initial) : []))
  const [initialSnap] = useState(() => snapshot(lines))
  const [error, setError] = useState('')

  // بعد إضافة صنف (أو الضغط عليه تاني) نحط المؤشر على خانة الكمية بتاعته
  const [focusKey, setFocusKey] = useState<{ key: number } | null>(null)
  useEffect(() => { if (focusKey) document.getElementById(`qty-${focusKey.key}`)?.focus() }, [focusKey])

  const patch = (key: number, p: Partial<CartLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)))

  function addItem(item: Item) {
    const exists = lines.find((l) => l.item.id === item.id)
    if (exists) {
      if (item.unit === 'PIECE' && exists.mode === 'qty') patch(exists.key, { qty: String((Number(exists.qty) || 0) + 1), total: null })
      setFocusKey({ key: exists.key })
      return
    }
    const l = newLine(item)
    setLines((ls) => [...ls, l])
    if (item.unit !== 'PIECE') setFocusKey({ key: l.key })
  }

  const subtotal = r2(lines.reduce((s, l) => s + totalOf(l), 0))
  const disc = Number(discount) || 0
  const total = r2(subtotal - disc)
  const hasCustomer = customer !== null
  const paidN = hasCustomer && paidTouched ? Number(paid) || 0 : total
  const remaining = r2(total - paidN)

  async function submit(print: boolean) {
    setError('')
    if (lines.length === 0) return setError('ضيف صنف واحد على الأقل')
    if (disc < 0) return setError('الخصم مينفعش يكون بالسالب')
    if (disc > subtotal) return setError('الخصم أكبر من إجمالي الفاتورة')
    if (paidN < 0) return setError('المدفوع مينفعش يكون بالسالب')
    if (paidN > total) return setError('المدفوع أكبر من إجمالي الفاتورة. سجّل الزيادة كدفعة من صفحة العميل')
    // في التعديل: لو الأصناف ما اتغيرتش مابنبعتهاش (عشان مايتعدلش المخزون من غير داعي)
    let linesPayload: SaleLineInput[] | undefined
    if (!isEdit || snapshot(lines) !== initialSnap) {
      const r = buildLines(lines, !isEdit)
      if (r.error) return setError(r.error)
      linesPayload = r.payload
    }
    const input: SaleInput = { customerId: customer?.id ?? null, date, note: note.trim() || null, discount: disc, paid: paidN, ...(linesPayload && { lines: linesPayload }) }
    try {
      onSaved(await save.mutateAsync({ id: initial?.id, input }), print)
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <div className="pos">
      <div>
        {isEdit && <p className="notice">تعديل الأصناف بيرجّع الكميات القديمة للمخزن وبيسحب الجديدة من أقرب باتش بينتهي (FEFO).</p>}
        <ProductPicker onPick={addItem} />
      </div>

      <div className="card pos-cart">
        <label className="label">العميل</label>
        <div className="flex items-center gap-1">
          <Combobox<CustomerLite>
            value={customer} cacheKey="customers" fetcher={(s) => fetchParties('customers', s)} getKey={(c) => c.id} getLabel={(c) => c.name}
            placeholder="عميل نقدي (اضغط للبحث عن عميل)" onChange={(c) => { setCustomer(c); setPaidTouched(false) }}
            renderOption={(c) => <><span>{c.name}</span>{Number(c.remaining) > 0 && <span className="neg" style={{ fontSize: 12 }}>عليه {fmtMoney(c.remaining!)}</span>}</>}
          />
          {customer && <button type="button" className="link-btn" title="بيع نقدي" onClick={() => { setCustomer(null); setPaidTouched(false) }}>✕</button>}
        </div>
        {customer && Number(customer.remaining) !== 0 && customer.remaining !== undefined && (
          <p className="hint" style={{ margin: '4px 0 0' }}>{Number(customer.remaining) > 0 ? `عليه حالياً ${fmtMoney(customer.remaining)}` : `له عندنا ${fmtMoney(Math.abs(Number(customer.remaining)))}`}</p>
        )}

        <div style={{ marginTop: 10 }}>
          {lines.length === 0 && <p className="mu" style={{ textAlign: 'center', padding: '22px 0' }}>اختار الأصناف من القايمة 👈</p>}
          {lines.map((l) => (
            <CartRow key={l.key} line={l} onChange={(p) => patch(l.key, p)} onRemove={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
          ))}
        </div>

        <div className="sum">
          <div>المجموع<b>{fmtMoney(subtotal)}</b></div>
          <div>خصم<input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div>الإجمالي<span className="big">{fmtMoney(total)}</span></div>
          <div>
            المدفوع
            {hasCustomer ? (
              <span className="flex items-center gap-2">
                <button type="button" className="link-btn" onClick={() => { setPaid(String(Math.max(total, 0))); setPaidTouched(true) }}>الكل</button>
                <button type="button" className="link-btn" onClick={() => { setPaid('0'); setPaidTouched(true) }}>آجل</button>
                <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={paidTouched ? paid : String(Math.max(total, 0))} onChange={(e) => { setPaid(e.target.value); setPaidTouched(true) }} />
              </span>
            ) : <b>{fmtMoney(total)}</b>}
          </div>
          {hasCustomer && <div>المتبقي (آجل)<b className={remaining > 0 ? 'neg' : 'ok'}>{fmtMoney(remaining)}</b></div>}
        </div>

        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          <input className="input full" placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <input className="input" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} title="تاريخ الفاتورة" />
        </div>

        {error && <p className="error" style={{ margin: '10px 0 0' }}>{error}</p>}
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <button type="button" className="btn full" disabled={save.isPending} onClick={() => submit(false)}>{save.isPending ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ'}</button>
          <button type="button" className="btn outline full" disabled={save.isPending} onClick={() => submit(true)}>{isEdit ? 'حفظ وطباعة' : 'حفظ وطباعة'}</button>
        </div>
      </div>
    </div>
  )
}
