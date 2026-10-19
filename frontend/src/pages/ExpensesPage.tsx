import { useState } from 'react'
import Confirm from '../components/Confirm'
import Modal from '../components/Modal'
import { Kpi, PageHeader, Pager } from '../components/ui'
import { useDebounce } from '../hooks/useDebounce'
import { errorMessage } from '../lib/api'
import { fmtDate, fmtMoney } from '../lib/format'
import { useDeleteExpense, useExpenses, type Expense } from '../features/expenses/api'
import ExpenseForm from '../features/expenses/ExpenseForm'

export default function ExpensesPage() {
  const [filter, setFilter] = useState({ category: '', search: '', from: '', to: '', page: 1 })
  const debounced = useDebounce(filter.search, 300)
  const [dialog, setDialog] = useState<'new' | { edit: Expense } | { del: Expense } | null>(null)
  const del = useDeleteExpense()
  const { data, isPending, isFetching, error } = useExpenses({ ...filter, search: debounced })
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  return (
    <div>
      <PageHeader title="المصاريف">
        <input className="input" placeholder="بحث في الملاحظات..." value={filter.search} onChange={(e) => update({ search: e.target.value })} />
        من <input type="date" className="input" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        إلى <input type="date" className="input" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        <button className="btn" onClick={() => setDialog('new')}>+ مصروف</button>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}

      {data && (
        <>
          <div className="kpis"><Kpi label={`إجمالي المصاريف${filter.category ? ` (${filter.category})` : ''} — ${data.meta.total} مصروف`} value={fmtMoney(data.sum)} tone="warn" /></div>
          {data.byCategory.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
              <button className={`btn sm ${filter.category === '' ? '' : 'outline'}`} onClick={() => update({ category: '' })}>الكل</button>
              {data.byCategory.map((c) => (
                <button key={c.category} className={`btn sm ${filter.category === c.category ? '' : 'outline'}`} onClick={() => update({ category: filter.category === c.category ? '' : c.category })}>
                  {c.category} · {fmtMoney(c.amount)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['التاريخ', 'التصنيف', 'المبلغ', 'ملاحظة', ''].map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={5} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={5} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={5} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش مصاريف</td></tr>}
            {data?.items.map((x) => (
              <tr key={x.id}>
                <td>{fmtDate(x.date)}</td>
                <td>{x.category}</td>
                <td><b>{fmtMoney(x.amount)}</b></td>
                <td className="mu">{x.note}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="link-btn" onClick={() => setDialog({ edit: x })}>تعديل</button>
                  <button className="link-btn" onClick={() => setDialog({ del: x })}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}
      <p className="hint">المصاريف الجانبية (إيجار، كهرباء، مرتبات...) بتتخصم من الربح في الإحصائيات.</p>

      {dialog === 'new' && <Modal title="مصروف جديد" onClose={() => setDialog(null)}><ExpenseForm onDone={() => setDialog(null)} /></Modal>}
      {dialog && typeof dialog === 'object' && 'edit' in dialog && (
        <Modal title="تعديل مصروف" onClose={() => setDialog(null)}><ExpenseForm expense={dialog.edit} onDone={() => setDialog(null)} /></Modal>
      )}
      {dialog && typeof dialog === 'object' && 'del' in dialog && (
        <Confirm title="حذف المصروف" confirmLabel="حذف" message={`هيتمسح مصروف ${dialog.del.category} بمبلغ ${fmtMoney(dialog.del.amount)}.`}
          onClose={() => setDialog(null)} onConfirm={async () => { await del.mutateAsync(dialog.del.id); setDialog(null) }} />
      )}
    </div>
  )
}
