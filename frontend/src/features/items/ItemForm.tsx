import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/api'
import { FormActions } from '../../components/ui'
import { bigUnitName, toBaseQty, toDisplayQty, unitLabel, priceSuffix, type Unit } from '../../lib/format'
import { useSaveItem, type Item } from './api'

export default function ItemForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const save = useSaveItem()
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [unit, setUnit] = useState<Unit>(item?.unit ?? 'PIECE')
  const [price, setPrice] = useState(item ? String(Number(item.price)) : '')
  const [packName, setPackName] = useState(item?.packName ?? '')
  // الحجم وحد الطلب بنعرضهم بالكيلو/اللتر للأصناف السايبة (والسيرفر بياخدهم بالجرام/مل)
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
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label className="label">اسم الصنف (اكتب الحجم في الاسم)</label>
        <input className="input full" value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} autoFocus placeholder="مثال: ملاثيون 250 جم" />
      </div>

      <div className="form-grid" style={{ marginBottom: 0 }}>
        <div>
          <label className="label">بيتباع بـ</label>
          <select className="input full" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {(Object.keys(unitLabel) as Unit[]).map((u) => <option key={u} value={u}>{unitLabel[u]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">سعر البيع ({priceSuffix[unit]})</label>
          <input className="input full" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
      </div>
      {unit !== 'PIECE' && (
        <p className="hint">الكمية بتتخزن بالـ{unit === 'GRAM' ? 'جرام' : 'مل'} وتقدر تبيع أي كمية (مثلاً 350 {unit === 'GRAM' ? 'جم' : 'مل'})، والسعر بتكتبه لل{big} والسيستم يحسب الباقي.</p>
      )}

      <div className="form-grid" style={{ marginBottom: 0 }}>
        <div>
          <label className="label">اسم العبوة (اختياري)</label>
          <input className="input full" value={packName} onChange={(e) => setPackName(e.target.value)} maxLength={50} placeholder="كرتونة / شكارة / جركن" />
        </div>
        <div>
          <label className="label">فيها كام {big}؟</label>
          <input className="input full" type="number" min="0" step="any" value={packSize} onChange={(e) => setPackSize(e.target.value)} placeholder={unit === 'PIECE' ? '24' : '25'} />
        </div>
      </div>

      <div>
        <label className="label">حد الطلب: نبّهني لما الكمية توصل لـ ({big}) أو أقل</label>
        <input className="input full" type="number" min="0" step="any" value={reorder} onChange={(e) => setReorder(e.target.value)} />
      </div>

      <div>
        <label className="label">ملاحظات (اختياري)</label>
        <textarea className="input full" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </div>

      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  )
}
