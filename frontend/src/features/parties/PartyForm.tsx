import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/api'
import { FormActions } from '../../components/ui'
import { configs, type Kind } from './config'
import { useSaveParty, type Party } from './api'

export default function PartyForm({ kind, party, onDone }: { kind: Kind; party?: Party; onDone: () => void }) {
  const cfg = configs[kind]
  const save = useSaveParty(kind)
  const [name, setName] = useState(party?.name ?? '')
  const [phone, setPhone] = useState(party?.phone ?? '')
  const [opening, setOpening] = useState(party ? String(Number(party.openingBalance)) : '0')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await save.mutateAsync({ id: party?.id, input: { name: name.trim(), phone: phone.trim(), openingBalance: Number(opening || 0) } })
      onDone()
    } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label className="label">الاسم</label>
        <input className="input full" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus />
      </div>
      <div>
        <label className="label">التليفون (اختياري)</label>
        <input className="input full" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} inputMode="tel" />
      </div>
      <div>
        <label className="label">الرصيد الافتتاحي (فلوس قديمة قبل السيستم)</label>
        <input className="input full" type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} />
        <p className="hint">{cfg.openingHint}</p>
      </div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  )
}
