import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../lib/api'
import { fmtDate, fmtMoney } from '../../lib/format'
import { configs, moveLabels, type Kind } from './config'
import { useStatement } from './api'
import Balance from './Balance'

const amt = (v: string) => (Number(v) === 0 ? <span className="mu">—</span> : fmtMoney(v))

export default function StatementTable({ kind, partyId }: { kind: Kind; partyId: number }) {
  const cfg = configs[kind]
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isPending, error } = useStatement(kind, partyId, from, to)

  return (
    <div>
      <div className="bar">
        <h3 className="h3" style={{ margin: 0, marginInlineEnd: 'auto' }}>كشف الحساب</h3>
        من <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        إلى <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && <button className="link-btn" onClick={() => { setFrom(''); setTo('') }}>مسح</button>}
      </div>
      {isPending && <p className="mu">جاري التحميل...</p>}
      {error && <p className="error">{errorMessage(error)}</p>}
      {data && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr>{['التاريخ', 'البيان', cfg.debitLabel, 'له', 'الرصيد', 'ملاحظة'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              <tr><td colSpan={4} className="mu">رصيد أول {from ? 'الفترة' : 'المدة'}</td><td><Balance kind={kind} value={data.openingBalance} /></td><td /></tr>
              {data.rows.length === 0 && <tr><td colSpan={6} className="mu" style={{ textAlign: 'center', padding: 22 }}>مفيش حركات في الفترة دي</td></tr>}
              {data.rows.map((r) => (
                <tr key={`${r.type}-${r.ref}`}>
                  <td>{fmtDate(r.date)}</td>
                  <td>
                    {r.type === 'PURCHASE'
                      ? <Link to={`/purchases/${r.ref}`} className="ok">{moveLabels[r.type]} #{r.ref}</Link>
                      : <>{moveLabels[r.type]} <span className="mu" style={{ fontSize: 12 }}>#{r.ref}</span></>}
                  </td>
                  <td>{amt(r.debit)}</td><td>{amt(r.credit)}</td>
                  <td><Balance kind={kind} value={r.balance} /></td>
                  <td className="mu">{r.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>الإجمالي / الرصيد الختامي</td><td>{fmtMoney(data.totals.debit)}</td><td>{fmtMoney(data.totals.credit)}</td><td><Balance kind={kind} value={data.closingBalance} /></td><td /></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
