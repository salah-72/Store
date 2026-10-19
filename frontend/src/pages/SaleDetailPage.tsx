import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Confirm from '../components/Confirm'
import { Badge, Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney, fmtQty, hasExpiryDate } from '../lib/format'
import { useDeleteSale, useSale } from '../features/sales/api'
import { Expiry } from '../features/items/parts'

const perName = { PIECE: 'قطعة', GRAM: 'كجم', ML: 'لتر' } as const

export default function SaleDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: s, isPending, error } = useSale(id)
  const del = useDeleteSale()
  const [confirming, setConfirming] = useState(false)

  // بعد "حفظ وطباعة" بنفتح نافذة الطباعة أول ما الفاتورة تظهر
  const wantsPrint = params.get('print') === '1'
  useEffect(() => {
    if (!wantsPrint || !s) return
    const t = setTimeout(() => { window.print(); setParams({}, { replace: true }) }, 300)
    return () => clearTimeout(t)
  }, [wantsPrint, s, setParams])

  if (isPending) return <p className="mu">جاري التحميل...</p>
  if (error) return <div><Link to="/sales" className="link-btn">← المبيعات</Link><p className="error">{errorMessage(error)}</p></div>

  const left = Math.round((Number(s.total) - Number(s.paid)) * 100) / 100
  const unitPriceShown = (l: (typeof s.lines)[number]) => Number(l.unitPrice) * l.item.priceBasis

  return (
    <div>
      <Link to="/sales" className="link-btn no-print">← المبيعات</Link>
      <PageHeader title={`فاتورة بيع #${s.id}`}>
        <span className="mu">{fmtDate(s.date)}</span>
        <button className="btn outline no-print" onClick={() => window.print()}>🖨️ طباعة</button>
        <Link to={`/sales/${s.id}/edit`} className="btn outline no-print">تعديل</Link>
        <button className="btn danger no-print" onClick={() => setConfirming(true)}>حذف</button>
      </PageHeader>

      <p style={{ marginTop: -6, marginBottom: 14 }}>
        العميل: {s.customer ? <Link to={`/customers/${s.customer.id}`} className="ok">{s.customer.name}</Link> : <span className="mu">نقدي</span>}
      </p>
      {s.note && <p className="mu">{s.note}</p>}

      <div className="kpis">
        <Kpi label="المجموع" value={fmtMoney(s.subtotal)} />
        <Kpi label="الخصم" value={Number(s.discount) ? `-${fmtMoney(s.discount)}` : '—'} />
        <Kpi label="الإجمالي" value={fmtMoney(s.total)} />
        <Kpi label="المدفوع وقت الفاتورة" value={fmtMoney(s.paid)} tone="ok" />
        <Kpi label={left < 0 ? 'زيادة للعميل' : 'المتبقي على الفاتورة'} value={fmtMoney(Math.abs(left))} tone={left > 0 ? 'danger' : 'ok'} />
        <div className="no-print"><Kpi label="الربح (من تكلفة الباتشات)" value={fmtMoney(s.profit)} tone={Number(s.profit) < 0 ? 'danger' : 'ok'} /></div>
      </div>

      <h3 className="h3">الأصناف</h3>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {['الصنف', 'الكمية', 'السعر', 'الإجمالي'].map((h) => <th key={h}>{h}</th>)}
              {['التكلفة', 'الربح', 'اتباع من باتش'].map((h) => <th key={h} className="no-print">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr key={l.id}>
                <td><Link to={`/items/${l.item.id}`} className="ok">{l.item.name}</Link></td>
                <td>{fmtQty(l.item.unit, l.baseQty)}</td>
                <td>{fmtMoney(Math.round(unitPriceShown(l) * 100) / 100)} <span className="mu" style={{ fontSize: 12 }}>/ {perName[l.item.unit]}</span></td>
                <td>{fmtMoney(l.lineTotal)}</td>
                <td className="no-print">{fmtMoney(l.cost)}</td>
                <td className="no-print">{fmtMoney(l.profit)} {l.belowCost && <Badge tone="danger">تحت التكلفة</Badge>}</td>
                <td className="no-print">
                  {l.batches.map((b) => (
                    <div key={b.id} style={{ fontSize: 12 }}>
                      {fmtQty(l.item.unit, b.baseQty)} · {hasExpiryDate(b.batch.expiryDate) ? <Expiry iso={b.batch.expiryDate} /> : <span className="mu">بدون صلاحية</span>}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {s.returns.length > 0 && (
        <div className="no-print">
          <h3 className="h3">مرتجعات على الفاتورة دي <Badge tone="warn">{s.returns.length}</Badge></h3>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr>{['المرتجع', 'التاريخ', 'القيمة', 'كاش مرجّع'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{s.returns.map((r) => <tr key={r.id}><td>#{r.id}</td><td>{fmtDate(r.date)}</td><td>{fmtMoney(r.total)}</td><td>{fmtMoney(r.cashRefund)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {confirming && (
        <Confirm
          title="حذف فاتورة البيع" confirmLabel="حذف الفاتورة"
          message={`هتتمسح الفاتورة #${s.id} وكمياتها هترجع للمخزن في نفس الباتشات اللي اتباعت منها. لو عليها مرتجعات مش هتتمسح.`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => { await del.mutateAsync(s.id); navigate('/sales', { replace: true }) }}
        />
      )}
    </div>
  )
}
