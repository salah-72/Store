import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Combobox from '../components/Combobox'
import { Badge, PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney } from '../lib/format'
import { fetchParties, type Party } from '../features/parties/api'
import { useSales } from '../features/sales/api'

type CustomerLite = Pick<Party, 'id' | 'name'>

export default function SalesPage() {
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerLite | null>(null)
  const [filter, setFilter] = useState({ cash: false, from: '', to: '', page: 1 })
  const { data, isPending, isFetching, error } = useSales({ ...filter, customerId: customer?.id })
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  return (
    <div>
      <PageHeader title="المبيعات">
        <div style={{ width: 210 }} className="flex items-center gap-1">
          <Combobox<CustomerLite>
            value={customer} cacheKey="customers" fetcher={(s) => fetchParties('customers', s)} getKey={(c) => c.id} getLabel={(c) => c.name}
            placeholder="كل العملاء" onChange={(c) => { setCustomer(c); update({ cash: false }) }}
          />
          {customer && <button className="link-btn" title="مسح" onClick={() => { setCustomer(null); update({}) }}>×</button>}
        </div>
        <label className="check">
          <input type="checkbox" checked={filter.cash} disabled={!!customer} onChange={(e) => update({ cash: e.target.checked })} /> النقدي بس
        </label>
        من <input type="date" className="input" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        إلى <input type="date" className="input" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        <Link to="/pos" className="btn">+ فاتورة بيع</Link>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['الفاتورة', 'العميل', 'التاريخ', 'البنود', 'الإجمالي', 'المدفوع', 'المتبقي على الفاتورة'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={7} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش فواتير بيع</td></tr>}
            {data?.items.map((s) => {
              const left = Math.round((Number(s.total) - Number(s.paid)) * 100) / 100
              return (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/sales/${s.id}`)}>
                  <td><b>#{s.id}</b></td>
                  <td>{s.customer ? s.customer.name : <span className="mu">نقدي</span>}</td>
                  <td>{fmtDate(s.date)}</td>
                  <td>{s.linesCount}</td>
                  <td>{fmtMoney(s.total)}</td>
                  <td>{fmtMoney(s.paid)}</td>
                  <td>{left <= 0 ? <Badge>مسدد</Badge> : <span className="neg">{fmtMoney(left)}</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}
      <p className="hint">المتبقي ده على الفاتورة وقت البيع بس. دفعات العميل بعد كده بتظهر في كشف حسابه.</p>
    </div>
  )
}
