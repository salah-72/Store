import { errorMessage } from '../../lib/api'
import { daysUntil, fmtDate, fmtMoney, fmtQty, NEAR_EXPIRY_DAYS, priceSuffix } from '../../lib/format'
import { useItem, type Batch, type Item } from './api'

function ExpiryCell({ b }: { b: Batch }) {
  if (!b.hasExpiry) return <span className="text-slate-400">بدون تاريخ</span>
  const days = daysUntil(b.expiryDate)
  const cls = b.expired ? 'font-semibold text-red-600' : days <= NEAR_EXPIRY_DAYS ? 'font-semibold text-amber-600' : ''
  return (
    <span className={cls}>
      {fmtDate(b.expiryDate)} {b.expired ? '(منتهي)' : days <= NEAR_EXPIRY_DAYS ? `(باقي ${days} يوم)` : ''}
    </span>
  )
}

const costLabel = { PIECE: 'تكلفة القطعة', GRAM: 'تكلفة الكيلو', ML: 'تكلفة اللتر' } as const

export default function ItemDetails({ id }: { id: number }) {
  const { data, isPending, error } = useItem(id)
  if (isPending) return <p className="text-slate-500">جاري التحميل...</p>
  if (error) return <p className="text-red-600">{errorMessage(error)}</p>
  const item: Item & { batches: Batch[] } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">السعر ({priceSuffix[item.unit]})</div><div className="font-bold">{fmtMoney(item.price)}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">الكمية الكلية</div><div className="font-bold">{fmtQty(item.unit, item.stock)}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">صالح للبيع</div><div className="font-bold">{fmtQty(item.unit, item.sellable)}</div></div>
      </div>
      {item.description && <p className="text-sm text-slate-600">{item.description}</p>}

      <div>
        <h3 className="mb-2 font-semibold">الباتشات (التوريدات المتاحة — الأقرب انتهاءً الأول)</h3>
        {item.batches.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-slate-500">مفيش كمية متاحة من الصنف ده</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200 text-start">
                <th className="py-2 text-start font-normal">تاريخ الانتهاء</th>
                <th className="py-2 text-start font-normal">المتبقي</th>
                <th className="py-2 text-start font-normal">اللي اتورد</th>
                <th className="py-2 text-start font-normal">{costLabel[item.unit]}</th>
              </tr>
            </thead>
            <tbody>
              {item.batches.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="py-2"><ExpiryCell b={b} /></td>
                  <td className="py-2">{fmtQty(item.unit, b.qtyRemaining)}</td>
                  <td className="py-2 text-slate-500">{fmtQty(item.unit, b.qtyReceived)}</td>
                  <td className="py-2">{fmtMoney(Number(b.unitCost) * (item.unit === 'PIECE' ? 1 : 1000))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
