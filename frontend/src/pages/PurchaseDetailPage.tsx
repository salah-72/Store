import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Confirm from '../components/Confirm'
import { Badge, Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney, fmtNumber, fmtQty } from '../lib/format'
import { useDeletePurchase, usePurchase } from '../features/purchases/api'
import { Expiry } from '../features/items/parts'

const costName = { PIECE: 'القطعة', GRAM: 'الكيلو', ML: 'اللتر' } as const

export default function PurchaseDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: p, isPending, error } = usePurchase(id)
  const del = useDeletePurchase()
  const [confirming, setConfirming] = useState(false)

  if (isPending) return <p className="mu">جاري التحميل...</p>
  if (error) return <div><Link to="/purchases" className="link-btn">← المشتريات</Link><p className="error">{errorMessage(error)}</p></div>

  const left = Math.round((Number(p.total) - Number(p.paid)) * 100) / 100
  return (
    <div>
      <Link to="/purchases" className="link-btn">← المشتريات</Link>
      <PageHeader title={`فاتورة شراء #${p.id}`}>
        <span className="mu">{fmtDate(p.date)}</span>
        <Link to={`/purchases/${p.id}/edit`} className="btn outline">تعديل</Link>
        <button className="btn danger" onClick={() => setConfirming(true)}>حذف</button>
      </PageHeader>

      <p style={{ marginTop: -6, marginBottom: 14 }}>المورد: <Link to={`/suppliers/${p.supplier.id}`} className="ok">{p.supplier.name}</Link></p>
      {p.note && <p className="mu">{p.note}</p>}

      <div className="kpis">
        <Kpi label="المجموع" value={fmtMoney(p.subtotal)} />
        <Kpi label="الخصم" value={Number(p.discount) ? `-${fmtMoney(p.discount)}` : '—'} />
        <Kpi label="الإجمالي" value={fmtMoney(p.total)} />
        <Kpi label="المدفوع وقت الفاتورة" value={fmtMoney(p.paid)} tone="ok" />
        <Kpi label={left < 0 ? 'زيادة عند المورد' : 'المتبقي على الفاتورة'} value={fmtMoney(Math.abs(left))} tone={left > 0 ? 'danger' : 'ok'} />
      </div>

      <h3 className="h3">الأصناف</h3>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['الصنف', 'الكمية', 'الانتهاء', 'التكلفة', 'الإجمالي', 'المتبقي في المخزن'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {p.lines.map((l) => (
              <tr key={l.id}>
                <td><Link to={`/items/${l.item.id}`} className="ok">{l.item.name}</Link></td>
                <td>
                  {l.packs !== null && l.item.packName ? <>{fmtNumber(l.packs)} {l.item.packName} <span className="mu">({fmtQty(l.item.unit, l.baseQty)})</span></> : fmtQty(l.item.unit, l.baseQty)}
                </td>
                <td>{l.hasExpiry ? <Expiry iso={l.batch.expiryDate} /> : <span className="mu">بدون صلاحية</span>}</td>
                <td>{fmtMoney(Number(l.batch.unitCost) * (l.item.unit === 'PIECE' ? 1 : 1000))} <span className="mu" style={{ fontSize: 12 }}>/ {costName[l.item.unit]}</span></td>
                <td>{fmtMoney(l.lineTotal)}</td>
                <td>{fmtQty(l.item.unit, l.batch.qtyRemaining)} <span className="mu" style={{ fontSize: 12 }}>(في الباتش كله)</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p.purchaseReturns.length > 0 && (
        <>
          <h3 className="h3">مرتجعات للمورد على الفاتورة دي <Badge tone="warn">{p.purchaseReturns.length}</Badge></h3>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr>{['المرتجع', 'التاريخ', 'القيمة', 'كاش مسترد'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {p.purchaseReturns.map((r) => (
                  <tr key={r.id}><td>#{r.id}</td><td>{fmtDate(r.date)}</td><td>{fmtMoney(r.total)}</td><td>{fmtMoney(r.cashRefund)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirming && (
        <Confirm
          title="حذف فاتورة الشراء" confirmLabel="حذف الفاتورة"
          message={`هتتمسح الفاتورة #${p.id} وكمياتها هتتشال من المخزن. لو جزء منها اتباع أو اترجّع مش هتتمسح.`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => { await del.mutateAsync(p.id); navigate('/purchases', { replace: true }) }}
        />
      )}
    </div>
  )
}
