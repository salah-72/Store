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

// رسايل السيرفر بالإنجليزي، هنا بنترجم المعروف منها. اللي مش معروف بيظهر زي ما هو.
const messages: Record<string, string> = {
  'Invalid username or password': 'اسم المستخدم أو كلمة السر غلط',
  'Too many login attempts, please try again after 15 minutes': 'محاولات دخول غلط كتير، جرب تاني بعد 15 دقيقة',
  'too many requests from same ip, try again later': 'طلبات كتير في وقت قصير، استنى شوية وجرب تاني',
  'Item name must be unique': 'اسم الصنف موجود قبل كده',
  'Item not found': 'الصنف مش موجود',
  'Unit cannot be changed after the item has stock movements': 'مينفعش تغيّر وحدة صنف اتحرك عليه مخزون',
  'This record is used by other records': 'ده مرتبط بعمليات تانية ومينفعش يتعمل عليه كده',
  'A record with the same unique value already exists': 'البيانات دي موجودة قبل كده',
  'Record not found': 'مش موجود',
  'A supplier with this name already exists': 'فيه مورد بنفس الاسم ده',
  'A customer with this name already exists': 'فيه عميل بنفس الاسم ده',
  'Supplier not found': 'المورد مش موجود',
  'Customer not found': 'العميل مش موجود',
  'Payment not found': 'الدفعة مش موجودة',
  'Two requests collided: please try again': 'حصل تعارض بين طلبين، جرب تاني',
  'The database was busy: please try again': 'السيرفر مشغول، جرب تاني',
  'Something went wrong!': 'حصل خطأ في السيرفر',
}
const fields: Record<string, string> = {
  name: 'الاسم', description: 'الوصف', unit: 'الوحدة', price: 'السعر',
  packName: 'اسم العبوة', packSize: 'حجم العبوة', reorderLevel: 'حد الطلب',
  phone: 'التليفون', openingBalance: 'الرصيد الافتتاحي', amount: 'المبلغ', date: 'التاريخ', note: 'الملاحظة',
}

export function errorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return 'حصل خطأ غير متوقع'
  if (!e.response) return 'مفيش اتصال بالسيرفر، اتأكد من النت وجرب تاني'
  const d = e.response.data as { message?: string; errors?: { field: string; message: string }[] } | undefined
  if (d?.errors?.length) {
    const first = d.errors[0]
    return `بيانات غير صحيحة${first.field ? ` (${fields[first.field] ?? first.field})` : ''}: ${first.message}`
  }
  const m = d?.message
  return m ? (messages[m] ?? m) : 'حصل خطأ غير متوقع'
}
