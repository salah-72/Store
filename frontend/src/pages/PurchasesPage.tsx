import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Combobox from '../components/Combobox'
import { Badge, PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney } from '../lib/format'
import { fetchParties, type Party } from '../features/parties/api'
import { usePurchases, type PurchasesFilter } from '../features/purchases/api'

type SupplierLite = Pick<Party, 'id' | 'name'>

export default function PurchasesPage() {
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<SupplierLite | null>(null)
  const [filter, setFilter] = useState({ from: '', to: '', page: 1 })
  const { data, isPending, isFetching, error } = usePurchases({ ...filter, supplierId: supplier?.id } as PurchasesFilter)
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  return (
    <div>
      <PageHeader title="المشتريات">
        <div style={{ width: 210 }} className="flex items-center gap-1">
          <Combobox<SupplierLite>
            value={supplier} cacheKey="suppliers" fetcher={(s) => fetchParties('suppliers', s)} getKey={(s) => s.id} getLabel={(s) => s.name}
            placeholder="كل الموردين" onChange={(s) => { setSupplier(s); update({}) }}
          />
          {supplier && <button className="link-btn" title="مسح" onClick={() => { setSupplier(null); update({}) }}>×</button>}
        </div>
        من <input type="date" className="input" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        إلى <input type="date" className="input" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        <Link to="/purchases/new" className="btn">+ فاتورة شراء</Link>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['الفاتورة', 'المورد', 'التاريخ', 'البنود', 'الإجمالي', 'المدفوع', 'المتبقي على الفاتورة'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={7} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش فواتير شراء</td></tr>}
            {data?.items.map((p) => {
              const left = Math.round((Number(p.total) - Number(p.paid)) * 100) / 100
              return (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/purchases/${p.id}`)}>
                  <td><b>#{p.id}</b></td>
                  <td>{p.supplier.name}</td>
                  <td>{fmtDate(p.date)}</td>
                  <td>{p.linesCount}</td>
                  <td>{fmtMoney(p.total)}</td>
                  <td>{fmtMoney(p.paid)}</td>
                  <td>{left <= 0 ? <Badge>مسدد</Badge> : <span className="neg">{fmtMoney(left)}</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}
      <p className="hint">المتبقي ده على الفاتورة وقت الشراء بس. الدفعات اللي بتتسجل بعدها بتظهر في كشف حساب المورد.</p>
    </div>
  )
}
