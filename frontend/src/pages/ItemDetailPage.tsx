import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Modal from '../components/Modal'
import { Badge, Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtMoney, fmtQty, priceSuffix } from '../lib/format'
import { useItem } from '../features/items/api'
import { Expiry, StatusBadges } from '../features/items/parts'
import ItemForm from '../features/items/ItemForm'
import AdjustmentForm from '../features/adjustments/AdjustmentForm'

const costLabel = { PIECE: 'تكلفة القطعة', GRAM: 'تكلفة الكيلو', ML: 'تكلفة اللتر' } as const

export default function ItemDetailPage() {
  const id = Number(useParams().id)
  const { data: item, isPending, error } = useItem(id)
  const [editing, setEditing] = useState(false)
  const [adjust, setAdjust] = useState<number | null>(null)   // رقم الباتش اللي بنسجّل عليه تالف

  if (isPending) return <p className="mu">جاري التحميل...</p>
  if (error) return <div><Link to="/items" className="link-btn">← الأصناف</Link><p className="error">{errorMessage(error)}</p></div>

  const mult = item.unit === 'PIECE' ? 1 : 1000   // التكلفة مخزنة للوحدة الصغيرة (جرام/مل)
  return (
    <div>
      <Link to="/items" className="link-btn">← الأصناف</Link>
      <PageHeader title={item.name}>
        {!item.isActive && <Badge tone="gray">معطّل</Badge>}
        <StatusBadges item={item} />
        <button className="btn outline" onClick={() => setEditing(true)}>تعديل</button>
      </PageHeader>

      <div className="kpis">
        <Kpi label="المخزون الكلي" value={fmtQty(item.unit, item.stock)} />
        <Kpi label="القابل للبيع" value={fmtQty(item.unit, item.sellable)} tone="ok" />
        <Kpi label="المنتهي" value={fmtQty(item.unit, item.expiredStock)} tone={item.expiredStock > 0 ? 'danger' : ''} />
        <Kpi label={`السعر (${priceSuffix[item.unit]})`} value={fmtMoney(item.price)} />
      </div>
      {item.description && <p className="mu">{item.description}</p>}
      {item.packName && item.packSize && <p className="mu">العبوة: {item.packName} = {fmtQty(item.unit, item.packSize)}</p>}

      <h3 className="h3">الباتشات (الأقرب انتهاءً يُباع أولًا)</h3>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['الانتهاء', 'المتبقي', 'اللي اتورد', costLabel[item.unit], 'القيمة', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {item.batches.length === 0 && <tr><td colSpan={6} className="mu" style={{ textAlign: 'center', padding: 24 }}>مفيش كمية متاحة من الصنف ده</td></tr>}
            {item.batches.map((b) => (
              <tr key={b.id}>
                <td>{b.hasExpiry ? <Expiry iso={b.expiryDate} /> : <span className="mu">بدون تاريخ</span>}</td>
                <td>{fmtQty(item.unit, b.qtyRemaining)}</td>
                <td className="mu">{fmtQty(item.unit, b.qtyReceived)}</td>
                <td>{fmtMoney(Number(b.unitCost) * mult)}</td>
                <td>{fmtMoney(Number(b.unitCost) * b.qtyRemaining)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{b.expired && <Badge tone="danger">منتهي</Badge>} <button className="link-btn" onClick={() => setAdjust(b.id)}>تسوية</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjust !== null && <Modal title="تسجيل تالف أو منتهي" onClose={() => setAdjust(null)}><AdjustmentForm presetItem={item} presetBatchId={adjust} onDone={() => setAdjust(null)} /></Modal>}
      {editing && <Modal title={`تعديل: ${item.name}`} onClose={() => setEditing(false)}><ItemForm item={item} onDone={() => setEditing(false)} /></Modal>}
    </div>
  )
}
