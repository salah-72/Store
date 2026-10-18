import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/api'
import { bigUnitName, toBaseQty, toDisplayQty, unitLabel, priceSuffix, type Unit } from '../../lib/format'
import { useSaveItem, type Item } from './api'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'

export default function ItemForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const save = useSaveItem()
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [unit, setUnit] = useState<Unit>(item?.unit ?? 'PIECE')
  const [price, setPrice] = useState(item ? String(Number(item.price)) : '')
  const [packName, setPackName] = useState(item?.packName ?? '')
  // الحجم والحد الأدنى بنعرضهم بالكيلو/اللتر للأصناف السائبة (والسيرفر بياخدهم بالجرام/مل)
  const [packSize, setPackSize] = useState(item?.packSize ? String(toDisplayQty(item.unit, item.packSize)) : '')
  const [reorder, setReorder] = useState(item ? String(toDisplayQty(item.unit, item.reorderLevel)) : '0')
  const [error, setError] = useState('')

  const big = bigUnitName(unit)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!!packName.trim() !== !!packSize.trim()) return setError('اسم العبوة وحجمها لازم يتكتبوا مع بعض أو يتسابوا فاضيين')
    try {
      await save.mutateAsync({
        id: item?.id,
        input: {
          name: name.trim(),
          description: description.trim() || null,
          unit,
          price: Number(price),
          packName: packName.trim() || null,
          packSize: packSize.trim() ? toBaseQty(unit, Number(packSize)) : null,
          reorderLevel: toBaseQty(unit, Number(reorder || 0)),
        },
      })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">اسم الصنف (اكتب الحجم في الاسم)</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} autoFocus placeholder="مثال: ملاثيون 250 جم" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">بيتباع بـ</span>
          <select className={input} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {(Object.keys(unitLabel) as Unit[]).map((u) => <option key={u} value={u}>{unitLabel[u]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">سعر البيع ({priceSuffix[unit]})</span>
          <input className={input} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
      </div>
      {unit !== 'PIECE' && (
        <p className="-mt-2 text-xs text-slate-500">
          الكمية بتتخزن بالـ{unit === 'GRAM' ? 'جرام' : 'مل'} وتقدر تبيع أي كمية (مثلاً 350 {unit === 'GRAM' ? 'جم' : 'مل'})، والسعر بتكتبه لل{big} والسيستم يحسب الباقي.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">اسم العبوة (اختياري)</span>
          <input className={input} value={packName} onChange={(e) => setPackName(e.target.value)} maxLength={50} placeholder="كرتونة / شكارة / جركن" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">فيها كام {big}؟</span>
          <input className={input} type="number" min="0" step="any" value={packSize} onChange={(e) => setPackSize(e.target.value)} placeholder={unit === 'PIECE' ? '24' : '25'} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">حد الطلب: نبّهني لما الكمية توصل لـ ({big}) أو أقل</span>
        <input className={input} type="number" min="0" step="any" value={reorder} onChange={(e) => setReorder(e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">ملاحظات (اختياري)</span>
        <textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">إلغاء</button>
        <button disabled={save.isPending} className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {save.isPending ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </form>
  )
}
