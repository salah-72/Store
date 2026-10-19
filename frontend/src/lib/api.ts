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
  'Purchase not found': 'فاتورة الشراء مش موجودة',
  'Purchase date cannot be in the future': 'تاريخ الفاتورة مينفعش يكون في المستقبل',
  'This purchase has returns to the supplier: delete them first': 'الفاتورة دي عليها مرتجعات للمورد، امسح المرتجعات الأول',
  'This purchase has returns, so its supplier cannot change': 'الفاتورة عليها مرتجعات فمينفعش تغيّر المورد',
  'Part of this purchase was already sold or returned, so it cannot be deleted': 'جزء من الفاتورة دي اتباع أو اترجّع، فمينفعش تتمسح',
  'Part of this purchase was already returned to the supplier: keep at least the returned quantity, or delete the return first': 'جزء من الفاتورة اترجّع للمورد: سيب على الأقل الكمية المرتجعة أو امسح المرتجع الأول',
  'At least one line is required': 'لازم تضيف صنف واحد على الأقل',
  'Sale not found': 'فاتورة البيع مش موجودة',
  'Items not found': 'فيه صنف في الفاتورة مش موجود',
  'This sale has returns: delete them first': 'الفاتورة دي عليها مرتجعات، امسح المرتجعات الأول',
  'This sale has returns, so its customer cannot change': 'الفاتورة عليها مرتجعات فمينفعش تغيّر العميل',
  'This sale has returns, so its lines cannot change: delete the returns first': 'الفاتورة عليها مرتجعات فمينفعش تعدّل أصنافها، امسح المرتجعات الأول',
  'A sale without a customer must be paid in full: choose a customer for a credit sale': 'البيع من غير عميل لازم يتدفع بالكامل. اختار عميل لو البيع آجل',
  'Sale return not found': 'مرتجع البيع مش موجود',
  'Purchase return not found': 'مرتجع الشراء مش موجود',
  'The returned goods were already sold again, so this return cannot be deleted': 'البضاعة المرتجعة اتباعت تاني، فمينفعش تمسح المرتجع',
  'A return without a customer account must be refunded in cash in full': 'المرتجع من غير عميل لازم يترد كاش بالكامل',
  'Return date cannot be before the sale date': 'تاريخ المرتجع مينفعش يكون قبل تاريخ الفاتورة',
  'Stock adjustment not found': 'التسوية مش موجودة',
  'Batch not found': 'الباتش مش موجود',
  'Expense not found': 'المصروف مش موجود',
  'Category is required': 'اكتب التصنيف',
  'Reason is required': 'اكتب السبب',
  'Amount must be greater than zero': 'المبلغ لازم يكون أكبر من صفر',
  'password must be at least 6 character': 'كلمة المرور لازم تكون 6 حروف على الأقل',
  'password must be less than 50': 'كلمة المرور لازم تكون أقل من 50 حرف',
  'username is required': 'اكتب اسم المستخدم',
  'name must be less than 30': 'اسم المستخدم لازم يكون أقل من 30 حرف',
  'old password is required': 'اكتب كلمة المرور الحالية',
  'passwords do not match': 'كلمتين المرور مش متطابقين',
  'Old password is wrong': 'كلمة المرور الحالية غلط',
  'You are the only admin': 'ده المشرف الوحيد، مينفعش يتمسح',
  'this username is used': 'اسم المستخدم ده مستخدم قبل كده',
  'Access denied, no token provided': 'لازم تسجل دخول الأول',
  'Invalid or expired token': 'الجلسة انتهت، سجّل دخولك تاني',
  'admin not found': 'المشرف مش موجود',
  'User no longer exists': 'الحساب ده اتمسح',
  'refresh token not exist, log in again': 'الجلسة انتهت، سجّل دخولك تاني',
  'Two requests collided: please try again': 'حصل تعارض بين طلبين، جرب تاني',
  'The database was busy: please try again': 'السيرفر مشغول، جرب تاني',
  'Something went wrong!': 'حصل خطأ في السيرفر',
}
// رسايل فيها أرقام وأسماء متغيرة
const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Line (\d+): "(.+)" is already expired \((.+)\)$/, (m) => `السطر ${m[1]}: "${m[2]}" تاريخ انتهائه (${m[3]}) فات`],
  [/^Line (\d+): "(.+)" has no pack size, send baseQty instead$/, (m) => `السطر ${m[1]}: "${m[2]}" ملوش عبوة محددة، اكتب الكمية مباشرة`],
  [/^Line (\d+): (.+) packs of "(.+)" is not a whole number of units$/, (m) => `السطر ${m[1]}: ${m[2]} عبوة من "${m[3]}" مش بتطلع عدد صحيح من الوحدات`],
  [/^Line (\d+): quantity is out of range$/, (m) => `السطر ${m[1]}: الكمية خارج الحد المسموح`],
  [/^Line (\d+): item (\d+) not found$/, (m) => `السطر ${m[1]}: الصنف مش موجود`],
  [/^Discount \((.+)\) cannot exceed the invoice subtotal \((.+)\)$/, (m) => `الخصم (${m[1]}) أكبر من إجمالي الفاتورة (${m[2]})`],
  [/^Not enough stock of "(.+)": requested (\d+), available (\d+) \(expired batches are not sold\)$/, (m) => `مخزون "${m[1]}" مش كفاية: المطلوب ${m[2]} والمتاح ${m[3]} (بوحدة الصنف الصغيرة، والمنتهي مش بيتباع)`],
  [/^Only (\d+) of "(.+)" can still be returned (?:from|against) this invoice$/, (m) => `"${m[2]}": اللي ينفع يترجّع من الفاتورة ${m[1]} بس (بالوحدة الصغيرة)`],
  [/^Cannot return (\d+) of "(.+)": only (\d+) are still in stock \(the rest was sold\)$/, (m) => `"${m[2]}": الباقي في المخزن ${m[3]} بس (بالوحدة الصغيرة)، والباقي اتباع`],
  [/^Cash refund must be between 0 and the return total \((.+)\)$/, (m) => `الفلوس المرجّعة لازم تكون من 0 لحد قيمة المرتجع (${m[1]})`],
  [/^Line (\d+) does not belong to (?:sale|purchase) (\d+)$/, () => 'السطر ده مش من الفاتورة دي'],
  [/^Cannot take out (\d+): only (\d+) are in stock in this batch$/, (m) => `مينفعش تشيل ${m[1]} (بالوحدة الصغيرة): الموجود في الباتش ${m[2]} بس`],
  [/^Cannot take (\d+) units of this item$/, () => 'مينفعش تنقص الكمية دي، جزء منها اتباع أو اترجّع'],
]
const fields: Record<string, string> = {
  supplierId: 'المورد', itemId: 'الصنف', lineTotal: 'إجمالي السطر', baseQty: 'الكمية', packs: 'العبوات',
  expiryDate: 'تاريخ الانتهاء', paid: 'المدفوع', discount: 'الخصم', lines: 'الأصناف',
  saleId: 'فاتورة البيع', purchaseId: 'فاتورة الشراء', cashRefund: 'الفلوس المرجّعة',
  name: 'الاسم', description: 'الوصف', unit: 'الوحدة', price: 'السعر',
  packName: 'اسم العبوة', packSize: 'حجم العبوة', reorderLevel: 'حد الطلب',
  phone: 'التليفون', openingBalance: 'الرصيد الافتتاحي', amount: 'المبلغ', date: 'التاريخ', note: 'الملاحظة', username: 'اسم المستخدم', password: 'كلمة المرور', oldPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة', passwordConfirm: 'تأكيد كلمة المرور', category: 'التصنيف', reason: 'السبب', batchId: 'الباتش', saleLineId: 'بند الفاتورة', purchaseLineId: 'بند الفاتورة',
}

export function errorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) return 'حصل خطأ غير متوقع'
  if (!e.response) return 'مفيش اتصال بالسيرفر، اتأكد من النت وجرب تاني'
  const d = e.response.data as { message?: string; errors?: { field: string; message: string }[] } | undefined
  if (d?.errors?.length) {
    const first = d.errors[0]
    const parts = first.field.split('.')
    const row = parts[0] === 'lines' && parts.length >= 3 ? `السطر ${Number(parts[1]) + 1} - ` : ''
    const last = parts[parts.length - 1]
    return `بيانات غير صحيحة${last ? ` (${row}${fields[last] ?? last})` : ''}: ${messages[first.message] ?? first.message}`
  }
  const m = d?.message
  if (!m) return 'حصل خطأ غير متوقع'
  if (messages[m]) return messages[m]
  for (const [re, fn] of patterns) { const mm = m.match(re); if (mm) return fn(mm) }
  return m
}
