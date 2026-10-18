import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Modal from '../components/Modal'
import { Badge, Kpi, PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtMoney } from '../lib/format'
import { configs, type Kind } from '../features/parties/config'
import { netTotal, useParty } from '../features/parties/api'
import Balance from '../features/parties/Balance'
import PartyForm from '../features/parties/PartyForm'
import PaymentForm from '../features/parties/PaymentForm'
import StatementTable from '../features/parties/StatementTable'

export default function PartyDetailPage({ kind }: { kind: Kind }) {
  const cfg = configs[kind]
  const id = Number(useParams().id)
  const { data: p, isPending, error } = useParty(kind, id)
  const [dialog, setDialog] = useState<'edit' | 'pay' | null>(null)

  if (isPending) return <p className="mu">جاري التحميل...</p>
  if (error) return <div><Link to={`/${kind}`} className="link-btn">← {cfg.title}</Link><p className="error">{errorMessage(error)}</p></div>

  const remaining = Number(p.remaining)
  return (
    <div>
      <Link to={`/${kind}`} className="link-btn">← {cfg.title}</Link>
      <PageHeader title={p.name}>
        {!p.isActive && <Badge tone="gray">معطّل</Badge>}
        {p.phone && <span className="mu" dir="ltr">{p.phone}</span>}
        <button className="btn" onClick={() => setDialog('pay')}>{kind === 'customers' ? 'تسجيل دفعة' : 'دفعة للمورد'}</button>
        <button className="btn outline" onClick={() => setDialog('edit')}>تعديل</button>
      </PageHeader>

      <div className="kpis">
        <Kpi label={cfg.netLabel.replace('مشترياته', 'المشتريات')} value={fmtMoney(netTotal(p))} />
        <Kpi label="المرتجعات" value={fmtMoney(p.totalReturns)} />
        <Kpi label={cfg.paidLabel} value={fmtMoney(p.totalPaid)} tone="ok" />
        <Kpi label={remaining < 0 ? (kind === 'customers' ? 'رصيد دائن له' : 'رصيد ليا عنده') : cfg.remainingLabel}
          value={<Balance kind={kind} value={p.remaining} />} tone={remaining > 0 ? 'danger' : 'ok'} />
      </div>
      {Number(p.openingBalance) !== 0 && <p className="hint" style={{ marginBottom: 10 }}>الرصيد الافتتاحي: {fmtMoney(p.openingBalance)}</p>}

      <StatementTable kind={kind} partyId={id} />

      {dialog === 'pay' && <Modal title={cfg.paymentTitle} onClose={() => setDialog(null)}><PaymentForm kind={kind} party={p} onDone={() => setDialog(null)} /></Modal>}
      {dialog === 'edit' && <Modal title={`تعديل: ${p.name}`} onClose={() => setDialog(null)}><PartyForm kind={kind} party={p} onDone={() => setDialog(null)} /></Modal>}
    </div>
  )
}
