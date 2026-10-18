import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/api'
import { FormActions } from '../../components/ui'
import { fmtMoney } from '../../lib/format'
import { configs, type Kind } from './config'
import { useCreatePayment, type Party } from './api'
import Balance from './Balance'

export default function PaymentForm({ kind, party, onDone }: { kind: Kind; party: Party; onDone: () => void }) {
  const cfg = configs[kind]
  const create = useCreatePayment(kind)
  const remaining = Number(party.remaining)
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : '')   // نقترح المتبقي كله
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const over = Number(amount) > remaining && remaining >= 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await create.mutateAsync({ partyId: party.id, input: { amount: Number(amount), date: date || undefined, note: note.trim() || null } })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="card" style={{ marginBottom: 0, background: 'var(--bs)' }}>
        <b>{party.name}</b>
        <div style={{ marginTop: 4 }}>الرصيد الحالي: <Balance kind={kind} value={party.remaining} /></div>
        <p className="hint">{cfg.paymentHint}</p>
      </div>
      <div>
        <label className="label">المبلغ</label>
        <input className="input full" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        {over && <p className="hint warnc">المبلغ أكبر من المتبقي ({fmtMoney(remaining)}) — الزيادة هتتسجل رصيد دائن.</p>}
      </div>
      <div>
        <label className="label">التاريخ (سيبه فاضي لو النهارده)</label>
        <input className="input full" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">ملاحظة (اختياري)</label>
        <input className="input full" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={create.isPending} label="تسجيل الدفعة" />
    </form>
  )
}
