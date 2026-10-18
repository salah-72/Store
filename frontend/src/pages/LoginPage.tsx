import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { errorMessage } from '../lib/api'

export default function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authed') return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={onSubmit} className="card login-box stack">
      <h2 style={{ textAlign: 'center', margin: 0, fontSize: 20 }}>🌿 مبيدات الفلاح</h2>
      <p className="mu" style={{ textAlign: 'center', margin: 0 }}>سجّل دخولك لإدارة المحل</p>
      <div>
        <label className="label">اسم المستخدم</label>
        <input className="input full" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" />
      </div>
      <div>
        <label className="label">كلمة المرور</label>
        <input className="input full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn full" disabled={busy}>{busy ? 'جاري الدخول...' : 'دخول'}</button>
    </form>
  )
}
