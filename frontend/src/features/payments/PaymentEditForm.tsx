import { useState, type FormEvent } from 'react'
import { FormActions } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { todayYmd, ymdOf } from '../../lib/format'
import { useUpdatePayment, type PaymentRow } from './api'

export default function PaymentEditForm({ payment, onDone }: { payment: PaymentRow; onDone: () => void }) {
  const update = useUpdatePayment()
  const [amount, setAmount] = useState(String(Number(payment.amount)))
  const [date, setDate] = useState(ymdOf(payment.date))
  const [note, setNote] = useState(payment.note ?? '')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!(Number(amount) > 0)) return setError('اكتب مبلغ أكبر من صفر')
    try {
      await update.mutateAsync({ id: payment.id, input: { amount: Number(amount), date, note: note.trim() || null } })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }
  return (
    <form onSubmit={onSubmit} className="stack">
      <p style={{ margin: 0 }}><b>{payment.party.name}</b> · {payment.direction === 'IN' ? 'دفعة مستلمة من عميل' : 'دفعة مدفوعة لمورد'}</p>
      <div>
        <label className="label">المبلغ</label>
        <input className="input full" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">التاريخ</label>
        <input className="input full" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <label className="label">ملاحظة (اختياري)</label>
        <input className="input full" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={update.isPending} label="حفظ التعديل" />
    </form>
  )
}
