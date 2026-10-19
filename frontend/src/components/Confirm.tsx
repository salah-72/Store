import { useState } from 'react'
import { errorMessage } from '../lib/api'
import Modal from './Modal'

// نافذة تأكيد لعمليات الحذف
export default function Confirm({ title, message, confirmLabel = 'تأكيد', onConfirm, onClose }: {
  title: string; message: string; confirmLabel?: string; onConfirm: () => Promise<unknown>; onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run() {
    setBusy(true); setError('')
    try { await onConfirm() } catch (e) { setError(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="stack">
        <p style={{ margin: 0 }}>{message}</p>
        {error && <p className="error">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn outline" onClick={onClose} disabled={busy}>إلغاء</button>
          <button className="btn danger" onClick={run} disabled={busy}>{busy ? 'جاري التنفيذ...' : confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
