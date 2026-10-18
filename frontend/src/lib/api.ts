import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// في التطوير "/api" بيتحوّل للسيرفر عن طريق Vite (شوف vite.config.ts)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true, // عشان كوكي الـ refresh token
})

// الـ access token بنخزنه في الذاكرة بس (مش localStorage) عشان أأمن.
// لما الصفحة تتعمل refresh بنجيب واحد جديد من الكوكي.
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => { accessToken = t }

let onSessionExpired: () => void = () => {}
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// طلب refresh واحد بس في نفس الوقت، حتى لو 5 طلبات فشلوا مع بعض
let refreshing: Promise<string> | null = null
export function refreshAccessToken(): Promise<string> {
  refreshing ??= api
    .post('/auth/refresh', undefined, { skipAuthRefresh: true })
    .then((r) => {
      setAccessToken(r.data.accessToken)
      return r.data.accessToken as string
    })
    .finally(() => { refreshing = null })
  return refreshing
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried && !original.skipAuthRefresh) {
      original._retried = true
      try {
        const token = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${token}`
        return api(original) // نعيد الطلب الأصلي بالتوكن الجديد
      } catch {
        setAccessToken(null)
        onSessionExpired()
      }
    }
    return Promise.reject(error)
  },
)

declare module 'axios' {
  interface AxiosRequestConfig { skipAuthRefresh?: boolean }
}

// رسالة الخطأ اللي جاية من السيرفر ({ success:false, message })
export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'مفيش اتصال بالسيرفر، اتأكد من النت وجرب تاني'
    return e.response.data?.message ?? 'حصل خطأ غير متوقع'
  }
  return 'حصل خطأ غير متوقع'
}
