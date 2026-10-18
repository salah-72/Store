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
    e.preventDefault()          // يمنع المتصفح من إعادة تحميل الصفحة
    setError(''); setBusy(true)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-center text-2xl font-bold text-brand-700">🌱 تسجيل الدخول</h1>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">اسم المستخدم</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">كلمة السر</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button disabled={busy} className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {busy ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
