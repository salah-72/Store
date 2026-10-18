import { useAuth } from '../auth/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">أهلاً {user?.username} 👋</h1>
      <p className="text-slate-600">
        تسجيل الدخول شغال والفرونت اند متوصل بالسيرفر. جرّب صفحة الأصناف من القائمة.
      </p>
    </div>
  )
}
