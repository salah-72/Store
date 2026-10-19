import { useState } from 'react'
import { Link } from 'react-router-dom'
import Combobox from '../components/Combobox'
import Confirm from '../components/Confirm'
import Modal from '../components/Modal'
import { Badge, Kpi, PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney } from '../lib/format'
import { fetchParties, type Party } from '../features/parties/api'
import type { Kind } from '../features/parties/config'
import PaymentForm from '../features/parties/PaymentForm'
import { useDeletePayment, usePayments, type PaymentRow } from '../features/payments/api'
import PaymentEditForm from '../features/payments/PaymentEditForm'

// نافذة تسجيل دفعة جديدة: اختار نوع الطرف، بعدين الطرف، وبعدها نفس نموذج الدفعة اللي في صفحة العميل/المورد
function NewPayment({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<Kind>('customers')
  const [party, setParty] = useState<Party | null>(null)
  return (
    <div className="stack">
      <div className="flex gap-2">
        <button type="button" className={`btn ${kind === 'customers' ? '' : 'outline'} full`} onClick={() => { setKind('customers'); setParty(null) }}>دفعة من عميل</button>
        <button type="button" className={`btn ${kind === 'suppliers' ? '' : 'outline'} full`} onClick={() => { setKind('suppliers'); setParty(null) }}>دفعة لمورد</button>
      </div>
      <div>
        <label className="label">{kind === 'customers' ? 'العميل' : 'المورد'}</label>
        <Combobox<Party>
          key={kind} value={party} cacheKey={kind} fetcher={(s) => fetchParties(kind, s)} getKey={(p) => p.id} getLabel={(p) => p.name}
          placeholder="ابحث بالاسم..." autoFocus onChange={setParty}
        />
      </div>
      {party && <PaymentForm key={`${kind}-${party.id}`} kind={kind} party={party} onDone={onDone} />}
    </div>
  )
}

export default function PaymentsPage() {
  const [type, setType] = useState<'' | 'customer' | 'supplier'>('')
  const [party, setParty] = useState<Pick<Party, 'id' | 'name'> | null>(null)
  const [filter, setFilter] = useState({ from: '', to: '', page: 1 })
  const [dialog, setDialog] = useState<'new' | { edit: PaymentRow } | { del: PaymentRow } | null>(null)
  const del = useDeletePayment()
  const { data, isPending, isFetching, error } = usePayments({ type, partyId: party?.id, ...filter })
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))
  const kind: Kind | null = type === 'customer' ? 'customers' : type === 'supplier' ? 'suppliers' : null

  return (
    <div>
      <PageHeader title="الدفعات">
        <select className="input" value={type} onChange={(e) => { setType(e.target.value as typeof type); setParty(null); update({}) }}>
          <option value="">كل الدفعات</option>
          <option value="customer">من العملاء</option>
          <option value="supplier">للموردين</option>
        </select>
        {kind && (
          <div style={{ width: 200 }} className="flex items-center gap-1">
            <Combobox<Pick<Party, 'id' | 'name'>>
              key={kind} value={party} cacheKey={kind} fetcher={(s) => fetchParties(kind, s)} getKey={(p) => p.id} getLabel={(p) => p.name}
              placeholder={kind === 'customers' ? 'كل العملاء' : 'كل الموردين'} onChange={(p) => { setParty(p); update({}) }}
            />
            {party && <button className="link-btn" title="مسح" onClick={() => { setParty(null); update({}) }}>×</button>}
          </div>
        )}
        من <input type="date" className="input" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        إلى <input type="date" className="input" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        <button className="btn" onClick={() => setDialog('new')}>+ دفعة</button>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}

      {data && <div className="kpis"><Kpi label={`إجمالي الدفعات في النتيجة (${data.meta.total})`} value={fmtMoney(data.sum)} /></div>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['#', 'التاريخ', 'النوع', 'الطرف', 'المبلغ', 'ملاحظة', ''].map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={7} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش دفعات</td></tr>}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{fmtDate(p.date)}</td>
                <td>{p.direction === 'IN' ? <Badge>مستلمة من عميل</Badge> : <Badge tone="warn">مدفوعة لمورد</Badge>}</td>
                <td><Link to={`/${p.type === 'CUSTOMER' ? 'customers' : 'suppliers'}/${p.party.id}`} className="ok">{p.party.name}</Link></td>
                <td><b>{fmtMoney(p.amount)}</b></td>
                <td className="mu">{p.note}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="link-btn" onClick={() => setDialog({ edit: p })}>تعديل</button>
                  <button className="link-btn" onClick={() => setDialog({ del: p })}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}

      {dialog === 'new' && <Modal title="تسجيل دفعة" onClose={() => setDialog(null)}><NewPayment onDone={() => setDialog(null)} /></Modal>}
      {dialog && typeof dialog === 'object' && 'edit' in dialog && (
        <Modal title={`تعديل دفعة #${dialog.edit.id}`} onClose={() => setDialog(null)}><PaymentEditForm payment={dialog.edit} onDone={() => setDialog(null)} /></Modal>
      )}
      {dialog && typeof dialog === 'object' && 'del' in dialog && (
        <Confirm
          title="حذف الدفعة" confirmLabel="حذف"
          message={`هتتمسح دفعة ${fmtMoney(dialog.del.amount)} (${dialog.del.party.name}) ورصيده هيرجع زي ما كان قبلها.`}
          onClose={() => setDialog(null)}
          onConfirm={async () => { await del.mutateAsync(dialog.del.id); setDialog(null) }}
        />
      )}
    </div>
  )
}
