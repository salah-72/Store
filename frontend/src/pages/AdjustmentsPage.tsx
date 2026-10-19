import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Combobox from '../components/Combobox'
import Confirm from '../components/Confirm'
import Modal from '../components/Modal'
import { FormActions, Kpi, PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney, fmtQty, hasExpiryDate, todayYmd, ymdOf } from '../lib/format'
import { fetchItems, type Item } from '../features/items/api'
import { Expiry } from '../features/items/parts'
import { useAdjustments, useDeleteAdjustment, useUpdateAdjustment, type Adjustment } from '../features/adjustments/api'
import AdjustmentForm from '../features/adjustments/AdjustmentForm'

type ItemLite = Pick<Item, 'id' | 'name'>

function EditForm({ adj, onDone }: { adj: Adjustment; onDone: () => void }) {
  const save = useUpdateAdjustment()
  const [reason, setReason] = useState(adj.reason)
  const [date, setDate] = useState(ymdOf(adj.date))
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!reason.trim()) return setError('اكتب السبب')
    try { await save.mutateAsync({ id: adj.id, input: { reason: reason.trim(), date } }); onDone() } catch (err) { setError(errorMessage(err)) }
  }
  return (
    <form onSubmit={submit} className="stack">
      <p className="hint" style={{ margin: 0 }}>الكمية مبتتعدّلش. لو غلطت فيها امسح التسوية (الكمية هترجع للمخزن) وسجّلها من الأول.</p>
      <div><label className="label">السبب</label><input className="input full" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={150} /></div>
      <div><label className="label">التاريخ</label><input className="input full" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} /></div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  )
}

export default function AdjustmentsPage() {
  const [item, setItem] = useState<ItemLite | null>(null)
  const [filter, setFilter] = useState({ from: '', to: '', page: 1 })
  const [dialog, setDialog] = useState<'new' | { edit: Adjustment } | { del: Adjustment } | null>(null)
  const del = useDeleteAdjustment()
  const { data, isPending, isFetching, error } = useAdjustments({ itemId: item?.id, ...filter })
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  return (
    <div>
      <PageHeader title="التالف والمنتهي">
        <div style={{ width: 210 }} className="flex items-center gap-1">
          <Combobox<ItemLite> value={item} cacheKey="items" fetcher={fetchItems} getKey={(i) => i.id} getLabel={(i) => i.name} placeholder="كل الأصناف" onChange={(i) => { setItem(i); update({}) }} />
          {item && <button className="link-btn" title="مسح" onClick={() => { setItem(null); update({}) }}>×</button>}
        </div>
        من <input type="date" className="input" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        إلى <input type="date" className="input" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        <button className="btn" onClick={() => setDialog('new')}>+ تسجيل تالف</button>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}

      {data && <div className="kpis"><Kpi label={`إجمالي الخسارة (${data.meta.total} تسوية)`} value={fmtMoney(data.value)} tone="danger" /></div>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['التاريخ', 'الصنف', 'الانتهاء', 'الكمية', 'السبب', 'الخسارة', ''].map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={7} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش تسويات</td></tr>}
            {data?.items.map((a) => (
              <tr key={a.id}>
                <td>{fmtDate(a.date)}</td>
                <td><Link to={`/items/${a.item.id}`} className="ok">{a.item.name}</Link></td>
                <td>{hasExpiryDate(a.batch.expiryDate) ? <Expiry iso={a.batch.expiryDate} /> : <span className="mu">بدون</span>}</td>
                <td>{fmtQty(a.item.unit, a.baseQty)}</td>
                <td>{a.reason}</td>
                <td className="neg">{fmtMoney(a.value)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="link-btn" onClick={() => setDialog({ edit: a })}>تعديل</button>
                  <button className="link-btn" onClick={() => setDialog({ del: a })}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}
      <p className="hint">التسوية بتشيل الكمية من الباتش وبتتحسب خسارة بتكلفته. تقدر تسجّلها من هنا أو من زر "تسوية" جنب الباتش في صفحة الصنف.</p>

      {dialog === 'new' && <Modal title="تسجيل تالف أو منتهي" onClose={() => setDialog(null)}><AdjustmentForm onDone={() => setDialog(null)} /></Modal>}
      {dialog && typeof dialog === 'object' && 'edit' in dialog && (
        <Modal title={`تعديل تسوية #${dialog.edit.id}`} onClose={() => setDialog(null)}><EditForm adj={dialog.edit} onDone={() => setDialog(null)} /></Modal>
      )}
      {dialog && typeof dialog === 'object' && 'del' in dialog && (
        <Confirm title="حذف التسوية" confirmLabel="حذف"
          message={`هتتمسح التسوية و${fmtQty(dialog.del.item.unit, dialog.del.baseQty)} من "${dialog.del.item.name}" هترجع للمخزن.`}
          onClose={() => setDialog(null)} onConfirm={async () => { await del.mutateAsync(dialog.del.id); setDialog(null) }} />
      )}
    </div>
  )
}
