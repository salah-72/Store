import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney } from '../lib/format'
import { returnCfg, useReturns, type ReturnKind } from '../features/returns/api'

export default function ReturnsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const kind: ReturnKind = params.get('kind') === 'purchase' ? 'purchase' : 'sale'
  const cfg = returnCfg[kind]
  const [filter, setFilter] = useState({ from: '', to: '', page: 1 })
  const { data, isPending, isFetching, error } = useReturns({ kind, ...filter })
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  return (
    <div>
      <PageHeader title="المرتجعات">
        من <input type="date" className="input" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        إلى <input type="date" className="input" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        <Link to={`/returns/new?kind=${kind}`} className="btn">+ مرتجع جديد</Link>
      </PageHeader>

      <div className="tabs">
        {(['sale', 'purchase'] as const).map((k) => (
          <button key={k} className={`tab ${kind === k ? 'active' : ''}`} onClick={() => { setParams({ kind: k }); setFilter((f) => ({ ...f, page: 1 })) }}>{returnCfg[k].title}</button>
        ))}
      </div>
      {isFetching && !isPending && <p className="hint">جاري التحديث...</p>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['المرتجع', cfg.partyLabel, cfg.invoice, 'التاريخ', 'البنود', 'القيمة', cfg.cashLabel].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={7} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش مرتجعات</td></tr>}
            {data?.items.map((r) => {
              const party = r[cfg.partyKey]
              const inv = r[cfg.invoiceKey]
              return (
                <tr key={r.id} className="clickable" onClick={() => navigate(`/returns/${kind}/${r.id}`)}>
                  <td><b>#{r.id}</b></td>
                  <td>{party ? party.name : <span className="mu">نقدي</span>}</td>
                  <td>{inv ? `#${inv}` : <span className="mu">—</span>}</td>
                  <td>{fmtDate(r.date)}</td>
                  <td>{r.linesCount}</td>
                  <td>{fmtMoney(r.total)}</td>
                  <td>{Number(r.cashRefund) ? fmtMoney(r.cashRefund) : <span className="mu">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}
      <p className="hint">المرتجع بيرجّع الكمية للمخزن (مرتجع العميل) أو بيشيلها منه (مرتجع المورد)، وقيمته بتتخصم من حساب الطرف إلا لو اتردّت كاش.</p>
    </div>
  )
}
