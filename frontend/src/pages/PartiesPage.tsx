import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { Badge, PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtMoney } from '../lib/format'
import { useDebounce } from '../hooks/useDebounce'
import { configs, type Kind } from '../features/parties/config'
import { netTotal, useParties, useSetPartyActive, type Party, type PartiesFilter } from '../features/parties/api'
import PartyForm from '../features/parties/PartyForm'
import PaymentForm from '../features/parties/PaymentForm'
import Balance from '../features/parties/Balance'

type Dialog = { type: 'form'; party?: Party } | { type: 'pay'; party: Party } | null

export default function PartiesPage({ kind }: { kind: Kind }) {
  const cfg = configs[kind]
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Omit<PartiesFilter, 'search'>>({ active: 'true', debt: false, page: 1 })
  const debounced = useDebounce(search)
  const { data, isPending, isFetching, error } = useParties(kind, { ...filter, search: debounced })
  const setActive = useSetPartyActive(kind)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [actionError, setActionError] = useState('')
  const close = () => setDialog(null)
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  async function toggle(p: Party) {
    setActionError('')
    try { await setActive.mutateAsync({ id: p.id, isActive: !p.isActive }) }
    catch (e) { setActionError(errorMessage(e)) }
  }

  return (
    <div>
      <PageHeader title={cfg.title}>
        <input className="input" placeholder="بحث بالاسم أو التليفون" value={search} onChange={(e) => { setSearch(e.target.value); setFilter((f) => ({ ...f, page: 1 })) }} />
        <select className="input" value={filter.active} onChange={(e) => update({ active: e.target.value as PartiesFilter['active'] })}>
          <option value="true">النشطين</option><option value="false">المعطّلين</option><option value="all">الكل</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filter.debt} onChange={(e) => update({ debt: e.target.checked })} /> {cfg.debtFilterLabel}</label>
        <button className="btn" onClick={() => setDialog({ type: 'form' })}>{cfg.newLabel}</button>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}
      {actionError && <p className="error" style={{ marginBottom: 10 }}>{actionError}</p>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{[cfg.single, 'التليفون', cfg.netLabel, cfg.paidLabel, cfg.remainingLabel, ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={6} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={6} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={6} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش نتائج</td></tr>}
            {data?.items.map((p) => (
              <tr key={p.id} className={`clickable ${p.isActive ? '' : 'dim'}`} onClick={() => navigate(`/${kind}/${p.id}`)}>
                <td><b>{p.name}</b> {!p.isActive && <Badge tone="gray">معطّل</Badge>}</td>
                <td dir="ltr" style={{ textAlign: 'start' }}>{p.phone || '—'}</td>
                <td>{fmtMoney(netTotal(p))}</td>
                <td>{fmtMoney(p.totalPaid)}</td>
                <td><Balance kind={kind} value={p.remaining} /></td>
                <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'end' }}>
                  <button className="link-btn strong" onClick={() => setDialog({ type: 'pay', party: p })}>دفعة</button>
                  <button className="link-btn" onClick={() => setDialog({ type: 'form', party: p })}>تعديل</button>
                  <button className="link-btn" disabled={setActive.isPending} onClick={() => toggle(p)}>{p.isActive ? 'تعطيل' : 'تفعيل'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}

      {dialog?.type === 'form' && (
        <Modal title={dialog.party ? `تعديل: ${dialog.party.name}` : cfg.newLabel.replace('+ ', '')} onClose={close}><PartyForm kind={kind} party={dialog.party} onDone={close} /></Modal>
      )}
      {dialog?.type === 'pay' && <Modal title={cfg.paymentTitle} onClose={close}><PaymentForm kind={kind} party={dialog.party} onDone={close} /></Modal>}
    </div>
  )
}
