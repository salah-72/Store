import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BarChart from '../components/BarChart'
import { Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { addDaysYmd, fmtMoney, fmtNumber, fmtQty, monthStartYmd, todayYmd, fmtSigned } from '../lib/format'
import { useOverview, useSalesByDay, useStaleStock, useTopItems } from '../features/stats/api'

const Row = ({ label, value, sub, total, tone }: { label: string; value: ReactNode; sub?: boolean; total?: boolean; tone?: string }) => (
  <tr className={`${sub ? 'sub' : ''} ${total ? 'total' : ''}`}><td>{label}</td><td className={tone}>{value}</td></tr>
)
const neg = (v: string | number) => (Number(v) ? fmtSigned('-', v) : '—')

export default function ReportsPage() {
  const today = todayYmd()
  const [range, setRange] = useState({ from: monthStartYmd(today), to: today })
  const [by, setBy] = useState<'revenue' | 'quantity'>('revenue')
  const [staleDays, setStaleDays] = useState(90)
  const valid = !!range.from && !!range.to && range.from <= range.to
  const days = valid ? (Date.parse(range.to) - Date.parse(range.from)) / 864e5 + 1 : 0
  const chartOk = valid && days <= 366

  const ov = useOverview(range.from, range.to)
  const byDay = useSalesByDay(chartOk ? range.from : '', chartOk ? range.to : '')
  const top = useTopItems(range.from, range.to, by)
  const stale = useStaleStock(staleDays)

  const presets: [string, string, string][] = [
    ['النهارده', today, today],
    ['آخر 7 أيام', addDaysYmd(today, -6), today],
    ['الشهر ده', monthStartYmd(today), today],
    ['آخر 30 يوم', addDaysYmd(today, -29), today],
    ['السنة دي', `${today.slice(0, 4)}-01-01`, today],
  ]
  const o = ov.data
  const profit = o ? Number(o.netProfit) : 0

  return (
    <div>
      <PageHeader title="التقارير">
        {presets.map(([label, from, to]) => (
          <button key={label} className={`btn sm ${range.from === from && range.to === to ? '' : 'outline'} no-print`} onClick={() => setRange({ from, to })}>{label}</button>
        ))}
        من <input type="date" className="input" value={range.from} max={range.to || today} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        إلى <input type="date" className="input" value={range.to} min={range.from} max={today} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        <button className="btn outline no-print" onClick={() => window.print()}>🖨️ طباعة</button>
      </PageHeader>
      {!valid && <p className="error">اختار فترة صحيحة (من قبل إلى).</p>}

      {valid && ov.error && <p className="error">{errorMessage(ov.error)}</p>}
      {valid && ov.isPending && <p className="mu">جاري التحميل...</p>}
      {valid && o && (
        <>
          <div className="kpis">
            <Kpi label={`صافي المبيعات (${o.sales.count} فاتورة)`} value={fmtMoney(o.sales.net)} />
            <Kpi label="مجمل الربح" value={fmtMoney(o.grossProfit)} tone="ok" />
            <Kpi label="صافي الربح" value={fmtMoney(o.netProfit)} tone={profit < 0 ? 'danger' : 'ok'} />
            <Kpi label="صافي الخزنة (داخل − خارج)" value={fmtMoney(o.cashFlow.net)} tone={Number(o.cashFlow.net) < 0 ? 'danger' : ''} />
          </div>

          <div className="two">
            <div className="card">
              <h3>الأرباح</h3>
              <table className="rep"><tbody>
                <Row label="إجمالي المبيعات (قبل الخصم)" value={fmtMoney(o.sales.subtotal)} />
                <Row label="خصومات المبيعات" value={neg(o.sales.discount)} sub />
                <Row label="مرتجعات المبيعات" value={neg(o.sales.returns)} sub />
                <Row label="صافي المبيعات" value={fmtMoney(o.sales.net)} total />
                <Row label="تكلفة البضاعة المباعة" value={neg(o.cost.net)} />
                <Row label="مجمل الربح" value={fmtMoney(o.grossProfit)} total />
                <Row label="مصاريف جانبية" value={neg(o.expenses.total)} />
                {o.expenses.byCategory.map((c) => <Row key={c.category} label={`${c.category} (${c.count})`} value={fmtMoney(c.amount)} sub />)}
                <Row label="خصومات الموردين" value={Number(o.purchaseDiscounts) ? fmtSigned('+', o.purchaseDiscounts) : '—'} />
                <Row label="تالف ومنتهي (بالتكلفة)" value={neg(o.writeOffs)} />
                <Row label="صافي الربح" value={fmtMoney(o.netProfit)} total tone={profit < 0 ? 'neg' : 'ok'} />
              </tbody></table>
              <p className="hint" style={{ marginBottom: 0 }}>الربح محسوب من تكلفة الباتشات اللي اتباعت منها فعلاً، مش من سعر الصنف الحالي.</p>
            </div>

            <div className="card">
              <h3>حركة الخزنة</h3>
              <table className="rep"><tbody>
                <Row label="داخل" value={fmtMoney(o.cashFlow.in)} total />
                <Row label="مبيعات مدفوعة" value={fmtMoney(o.cashFlow.parts.paidOnSales)} sub />
                <Row label="دفعات من العملاء" value={fmtMoney(o.cashFlow.parts.customerPayments)} sub />
                <Row label="مرتجعات مستردة من الموردين" value={fmtMoney(o.cashFlow.parts.supplierRefunds)} sub />
                <Row label="خارج" value={fmtMoney(o.cashFlow.out)} total />
                <Row label="مشتريات مدفوعة" value={fmtMoney(o.cashFlow.parts.paidOnPurchases)} sub />
                <Row label="دفعات للموردين" value={fmtMoney(o.cashFlow.parts.supplierPayments)} sub />
                <Row label="مرتجعات مرجّعة للعملاء" value={fmtMoney(o.cashFlow.parts.customerRefunds)} sub />
                <Row label="مصاريف" value={fmtMoney(o.cashFlow.parts.expenses)} sub />
                <Row label="الصافي" value={fmtMoney(o.cashFlow.net)} total tone={Number(o.cashFlow.net) < 0 ? 'neg' : 'ok'} />
              </tbody></table>
              <h3 style={{ marginTop: 16 }}>المشتريات</h3>
              <table className="rep"><tbody>
                <Row label={`فواتير الشراء (${o.purchases.count})`} value={fmtMoney(o.purchases.subtotal)} />
                <Row label="خصومات الموردين" value={neg(o.purchases.discount)} sub />
                <Row label="مرتجعات للموردين" value={neg(o.purchases.returns)} sub />
                <Row label="صافي المشتريات" value={fmtMoney(o.purchases.net)} total />
              </tbody></table>
            </div>
          </div>
        </>
      )}

      {chartOk && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>المبيعات بالأيام</h3>
          {byDay.isPending && <p className="mu">جاري التحميل...</p>}
          {byDay.error && <p className="error">{errorMessage(byDay.error)}</p>}
          {byDay.data && (
            <>
              <BarChart rows={byDay.data.days.map((x) => ({ day: x.day, value: Number(x.net) }))} labelEvery={Math.ceil(byDay.data.days.length / 12)} />
              <p className="hint" style={{ margin: 0 }}>
                {fmtNumber(byDay.data.summary.count)} فاتورة · مبيعات {fmtMoney(byDay.data.summary.sales)} · مرتجعات {fmtMoney(byDay.data.summary.returns)} · الصافي {fmtMoney(byDay.data.summary.net)}
              </p>
            </>
          )}
        </div>
      )}
      {valid && !chartOk && <p className="hint">الرسم اليومي بيدعم فترة لحد سنة بس.</p>}

      <div className="two">
        <div className="card">
          <h3>أكثر الأصناف مبيعاً
            <select className="input no-print" style={{ marginInlineStart: 10 }} value={by} onChange={(e) => setBy(e.target.value as typeof by)}>
              <option value="revenue">بالإيراد</option><option value="quantity">بالكمية</option>
            </select>
          </h3>
          {top.error && <p className="error">{errorMessage(top.error)}</p>}
          <table className="tbl mini"><thead><tr>{['الصنف', 'الكمية (صافي)', 'الإيراد'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>
            {top.isPending && <tr><td colSpan={3} className="mu">جاري التحميل...</td></tr>}
            {top.data?.length === 0 && <tr><td colSpan={3} className="mu">مفيش مبيعات في الفترة دي</td></tr>}
            {top.data?.map((t) => (
              <tr key={t.itemId}>
                <td><Link to={`/items/${t.itemId}`} className="ok">{t.name}</Link></td>
                <td>{t.unit ? fmtQty(t.unit, t.netQty) : t.netQty}{t.returnedQty > 0 && <span className="mu" style={{ fontSize: 12 }}> (مرتجع {t.unit ? fmtQty(t.unit, t.returnedQty) : t.returnedQty})</span>}</td>
                <td>{fmtMoney(t.revenue)}</td>
              </tr>
            ))}
          </tbody></table>
        </div>

        <div className="card">
          <h3>مخزون راكد
            <select className="input no-print" style={{ marginInlineStart: 10 }} value={staleDays} onChange={(e) => setStaleDays(Number(e.target.value))}>
              {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>من {d} يوم</option>)}
            </select>
          </h3>
          {stale.error && <p className="error">{errorMessage(stale.error)}</p>}
          {stale.data && <p className="hint" style={{ marginTop: 0 }}>{stale.data.count} صنف ما اتباعش ولا اتورّد من {stale.data.days} يوم، قيمته {fmtMoney(stale.data.value)}.</p>}
          <table className="tbl mini"><thead><tr>{['الصنف', 'المتاح', 'القيمة'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>
            {stale.isPending && <tr><td colSpan={3} className="mu">جاري التحميل...</td></tr>}
            {stale.data?.items.length === 0 && <tr><td colSpan={3} className="mu">مفيش مخزون راكد 👌</td></tr>}
            {stale.data?.items.map((i) => (
              <tr key={i.itemId}><td><Link to={`/items/${i.itemId}`} className="ok">{i.name}</Link></td><td>{fmtQty(i.unit, i.sellable)}</td><td>{fmtMoney(i.value)}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  )
}
