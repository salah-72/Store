import { Link } from 'react-router-dom'
import BarChart from '../components/BarChart'
import { Badge, Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney, fmtQty } from '../lib/format'
import { useDashboard } from '../features/stats/api'
import { useAuth } from '../auth/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: d, isPending, error } = useDashboard()

  if (isPending) return <div><PageHeader title="لوحة التحكم" /><p className="mu">جاري التحميل...</p></div>
  if (error) return <div><PageHeader title="لوحة التحكم" /><p className="error">{errorMessage(error)}</p></div>

  const profit = Number(d.month.netProfit)
  const a = d.alerts
  const noAlerts = a.lowStock.count + a.nearExpiry.count + a.expired.count === 0
  return (
    <div>
      <PageHeader title={`أهلاً ${user?.username ?? ''} 👋`}>
        <Link to="/pos" className="btn">🧾 كاشير</Link>
        <Link to="/purchases/new" className="btn outline">+ فاتورة شراء</Link>
      </PageHeader>

      <div className="kpis">
        <Kpi label={`مبيعات النهارده (${d.today.salesCount} فاتورة)`} value={fmtMoney(d.today.net)} tone="ok" />
        <Kpi label="صافي ربح الشهر" value={fmtMoney(d.month.netProfit)} tone={profit < 0 ? 'danger' : 'ok'} />
        <Kpi label={`مديونيات العملاء (${d.receivables.count})`} value={fmtMoney(d.receivables.total)} tone="warn" />
        <Kpi label={`مستحقات الموردين (${d.payables.count})`} value={fmtMoney(d.payables.total)} tone={Number(d.payables.total) > 0 ? 'danger' : ''} />
        <Kpi label="قيمة المخزون (بالتكلفة)" value={fmtMoney(d.stock.value)} />
      </div>

      <div className="two">
        <div className="card">
          <h3>صافي مبيعات آخر 7 أيام</h3>
          <BarChart rows={d.last7Days.map((x) => ({ day: x.day, value: Number(x.net) }))} />
          <p className="hint" style={{ margin: 0 }}>
            الشهر ده: صافي مبيعات {fmtMoney(d.month.netSales)} · مجمل ربح {fmtMoney(d.month.grossProfit)} · مصاريف {fmtMoney(d.month.expenses)}
          </p>
        </div>

        <div className="card">
          <h3>تنبيهات المخزون</h3>
          {noAlerts && <p className="mu">مفيش تنبيهات 👌</p>}
          <table className="tbl mini"><tbody>
            {a.expired.batches.map((b) => (
              <tr key={`e${b.batchId}`}><td><Link to={`/items/${b.itemId}`} className="ok">{b.name}</Link></td><td><Badge tone="danger">منتهي — خسارة محتملة {fmtMoney(b.value)}</Badge></td></tr>
            ))}
            {a.lowStock.items.map((i) => (
              <tr key={`l${i.itemId}`}><td><Link to={`/items/${i.itemId}`} className="ok">{i.name}</Link></td><td><Badge tone="danger">{i.sellable === 0 ? 'نفد' : `باقي ${fmtQty(i.unit, i.sellable)}`}</Badge></td></tr>
            ))}
            {a.nearExpiry.batches.map((b) => (
              <tr key={`n${b.batchId}`}><td><Link to={`/items/${b.itemId}`} className="ok">{b.name}</Link></td><td><Badge tone="warn">ينتهي بعد {b.daysLeft} يوم ({fmtDate(b.expiryDate)})</Badge></td></tr>
            ))}
          </tbody></table>
          {(a.expired.count > 0 || a.nearExpiry.count > 0 || a.lowStock.count > 0) && (
            <p className="hint" style={{ marginBottom: 0 }}>
              {a.expired.count > 0 && <>فيه {a.expired.count} باتش منتهي بقيمة {fmtMoney(a.expired.value)} — <Link to="/adjustments" className="ok">سجّله تالف</Link>. </>}
              {a.lowStock.count > 10 && `ونقص مخزون في ${a.lowStock.count} صنف. `}
              {a.nearExpiry.count > 10 && `و${a.nearExpiry.count} باتش قرب ينتهي (خلال ${a.nearExpiry.days} يوم).`}
            </p>
          )}
        </div>
      </div>

      <div className="two">
        <div className="card">
          <h3>أكبر المدينين <Link to="/customers" className="link-btn">الكل</Link></h3>
          <table className="tbl mini"><tbody>
            {d.receivables.top.length === 0 && <tr><td className="mu">مفيش مديونيات</td></tr>}
            {d.receivables.top.map((c) => <tr key={c.id}><td><Link to={`/customers/${c.id}`} className="ok">{c.name}</Link></td><td className="neg">{fmtMoney(c.remaining)}</td></tr>)}
          </tbody></table>
        </div>
        <div className="card">
          <h3>مستحقات الموردين <Link to="/suppliers" className="link-btn">الكل</Link></h3>
          <table className="tbl mini"><tbody>
            {d.payables.top.length === 0 && <tr><td className="mu">مفيش مستحقات</td></tr>}
            {d.payables.top.map((s) => <tr key={s.id}><td><Link to={`/suppliers/${s.id}`} className="ok">{s.name}</Link></td><td className="neg">{fmtMoney(s.remaining)}</td></tr>)}
          </tbody></table>
        </div>
      </div>
    </div>
  )
}
