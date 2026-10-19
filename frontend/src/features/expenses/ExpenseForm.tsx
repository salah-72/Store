import { useState, type FormEvent } from 'react'
import { FormActions } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { todayYmd, ymdOf } from '../../lib/format'
import { useExpenseCategories, useSaveExpense, type Expense } from './api'

export default function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const save = useSaveExpense()
  const cats = useExpenseCategories()
  const [category, setCategory] = useState(expense?.category ?? '')
  const [amount, setAmount] = useState(expense ? String(Number(expense.amount)) : '')
  const [date, setDate] = useState(expense ? ymdOf(expense.date) : todayYmd())
  const [note, setNote] = useState(expense?.note ?? '')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!category.trim()) return setError('اكتب التصنيف (مثلاً: إيجار، كهرباء، مرتبات)')
    if (!(Number(amount) > 0)) return setError('اكتب مبلغ أكبر من صفر')
    try {
      await save.mutateAsync({ id: expense?.id, input: { category: category.trim(), amount: Number(amount), date, note: note.trim() || null } })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }
  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label className="label">التصنيف</label>
        <input className="input full" list="exp-cats" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={50} autoFocus placeholder="إيجار / كهرباء / مرتبات..." />
        <datalist id="exp-cats">{cats.data?.map((c) => <option key={c.category} value={c.category} />)}</datalist>
        <p className="hint">اختار من اللي اتكتب قبل كده أو اكتب تصنيف جديد.</p>
      </div>
      <div className="form-grid" style={{ marginBottom: 0 }}>
        <div>
          <label className="label">المبلغ</label>
          <input className="input full" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="label">التاريخ</label>
          <input className="input full" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">ملاحظة (اختياري)</label>
        <input className="input full" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  )
}
