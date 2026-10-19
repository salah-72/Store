import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, refreshAccessToken, setAccessToken, setSessionExpiredHandler } from '../lib/api'

export interface User { id: number; username: string }
type Status = 'loading' | 'authed' | 'guest'

interface AuthValue {
  user: User | null
  status: Status
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  notice: string | null                       // رسالة بتظهر في صفحة الدخول (انتهت الجلسة / اتغيرت كلمة المرور)
  endSession: (notice?: string) => void       // إنهاء الجلسة محلياً من غير نداء للسيرفر
}
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const qc = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)

  // بنمسح الكاش كمان عشان بيانات الحساب ده ماتظهرش لمشرف تاني على نفس الجهاز
  const clear = useCallback((msg?: string) => {
    setAccessToken(null); setUser(null); setStatus('guest'); setNotice(msg ?? null); qc.clear()
  }, [qc])

  // أول ما الموقع يفتح: نحاول نجيب access token من كوكي الـ refresh (يعني لسه مسجل دخول)
  useEffect(() => {
    setSessionExpiredHandler(() => clear('الجلسة انتهت، سجّل دخولك تاني'))
    refreshAccessToken()
      .then(() => api.get('/auth/me'))
      .then((r) => { setUser(r.data.user); setStatus('authed') })
      .catch(() => clear())
  }, [clear])

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.post('/auth/login', { username, password }, { skipAuthRefresh: true })
    setAccessToken(r.data.accessToken)
    setUser(r.data.user)
    setNotice(null)
    setStatus('authed')
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* نخرج حتى لو فشل الطلب */ }
    clear()
  }, [clear])

  const value = useMemo(() => ({ user, status, login, logout, notice, endSession: clear }), [user, status, login, logout, notice, clear])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth لازم يتستخدم جوه AuthProvider')
  return ctx
}
