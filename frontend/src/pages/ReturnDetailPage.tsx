import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Confirm from '../components/Confirm'
import Modal from '../components/Modal'
import { FormActions, Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney, fmtQty, todayYmd, ymdOf } from '../lib/format'
import { returnCfg, useDeleteReturn, useReturn, useUpdateReturn, type ReturnDetail, type ReturnKind } from '../features/returns/api'

function EditForm({ kind, r, onDone }: { kind: ReturnKind; r: ReturnDetail; onDone: () => void }) {
  const save = useUpdateReturn(kind)
  const [date, setDate] = useState(ymdOf(r.date))
  const [note, setNote] = useState(r.note ?? '')
  const [cash, setCash] = useState(String(Number(r.cashRefund)))
  const [error, setError] = useState('')
  const noParty = kind === 'sale' && !r.customerId
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    try {
      await save.mutateAsync({ id: r.id, input: { date, note: note.trim() || null, ...(!noParty && { cashRefund: Number(cash) || 0 }) } })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }
  return (
    <form onSubmit={submit} className="stack">
      <p className="hint" style={{ margin: 0 }}>الأصناف والكميات مبتتعدّلش. لو غلطت فيها امسح المرتجع وسجّله من الأول.</p>
      <div><label className="label">التاريخ</label><input className="input full" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} /></div>
      {!noParty && (
        <div>
          <label className="label">{returnCfg[kind].cashLabel} (من {fmtMoney(r.total)})</label>
          <div className="flex gap-2">
            <input className="input full" type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} />
            <button type="button" className="btn outline" onClick={() => setCash(String(Number(r.total)))}>الكل</button>
          </div>
        </div>
      )}
      <div><label className="label">ملاحظة</label><input className="input full" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  )
}

export default function ReturnDetailPage() {
  const { kind: k, id: idStr } = useParams()
  const kind: ReturnKind = k === 'purchase' ? 'purchase' : 'sale'
  const id = Number(idStr)
  const cfg = returnCfg[kind]
  const navigate = useNavigate()
  const notice = (useLocation().state as { notice?: string } | null)?.notice
  const { data: r, isPending, error } = useReturn(kind, id)
  const del = useDeleteReturn(kind)
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  const back = `/returns?kind=${kind}`
  if (isPending) return <p className="mu">جاري التحميل...</p>
  if (error) return <div><Link to={back} className="link-btn">← المرتجعات</Link><p className="error">{errorMessage(error)}</p></div>

  const party = r[cfg.partyKey]
  const inv = r[kind === 'sale' ? 'sale' : 'purchase']
  const credit = Math.round((Number(r.total) - Number(r.cashRefund)) * 100) / 100
  return (
    <div>
      <Link to={back} className="link-btn">← المرتجعات</Link>
      <PageHeader title={`${cfg.single} #${r.id}`}>
        <span className="mu">{fmtDate(r.date)}</span>
        <button className="btn outline" onClick={() => setDialog('edit')}>تعديل</button>
        <button className="btn danger" onClick={() => setDialog('delete')}>حذف</button>
      </PageHeader>
      {notice && <p className="notice">{notice}</p>}

      <p style={{ marginTop: -6, marginBottom: 14 }}>
        {cfg.partyLabel}: {party ? <Link to={`/${cfg.partyPath}/${party.id}`} className="ok">{party.name}</Link> : <span className="mu">نقدي</span>}
        {inv && <> · {cfg.invoice}: <Link to={`/${cfg.invoicePath}/${inv.id}`} className="ok">#{inv.id}</Link></>}
      </p>
      {r.note && <p className="mu">{r.note}</p>}

      <div className="kpis">
        <Kpi label="قيمة المرتجع" value={fmtMoney(r.total)} />
        <Kpi label={cfg.cashLabel} value={fmtMoney(r.cashRefund)} tone="ok" />
        <Kpi label={cfg.creditLabel} value={fmtMoney(credit)} tone={credit > 0 ? 'warn' : ''} />
      </div>

      <h3 className="h3">الأصناف</h3>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['الصنف', 'الكمية', 'القيمة'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={l.id}><td><Link to={`/items/${l.item.id}`} className="ok">{l.item.name}</Link></td><td>{fmtQty(l.item.unit, l.baseQty)}</td><td>{fmtMoney(l.lineTotal)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog === 'edit' && <Modal title={`تعديل ${cfg.single} #${r.id}`} onClose={() => setDialog(null)}><EditForm kind={kind} r={r} onDone={() => setDialog(null)} /></Modal>}
      {dialog === 'delete' && (
        <Confirm
          title="حذف المرتجع" confirmLabel="حذف المرتجع"
          message={kind === 'sale'
            ? 'هيتمسح المرتجع وكمياته هتتشال من المخزن تاني. لو الكمية دي اتباعت تاني مش هيتمسح.'
            : 'هيتمسح المرتجع وكمياته هترجع للمخزن تاني.'}
          onClose={() => setDialog(null)}
          onConfirm={async () => { await del.mutateAsync(r.id); navigate(back, { replace: true }) }}
        />
      )}
    </div>
  )
}
