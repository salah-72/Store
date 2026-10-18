import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// الأقسام اللي هنبنيها واحد واحد. اللي "soon" مش شغال لسه.
const sections = [
  { to: '/', label: 'الرئيسية' },
  { to: '/items', label: 'الأصناف', soon: true },
  { to: '/sales', label: 'البيع', soon: true },
  { to: '/purchases', label: 'الشراء', soon: true },
  { to: '/customers', label: 'العملاء', soon: true },
  { to: '/suppliers', label: 'الموردين', soon: true },
  { to: '/expenses', label: 'المصاريف', soon: true },
  { to: '/stats', label: 'الإحصائيات', soon: true },
]

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-e border-slate-200 bg-white">
        <div className="px-5 py-4 text-lg font-bold text-brand-700">🌱 المحل</div>
        <nav className="flex-1 space-y-1 px-3">
          {sections.map((s) =>
            s.soon ? (
              <div key={s.to} className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-400">
                {s.label}<span className="text-xs">قريباً</span>
              </div>
            ) : (
              <NavLink key={s.to} to={s.to} end
                className={({ isActive }) => `block rounded-lg px-3 py-2 ${isActive ? 'bg-brand-100 font-semibold text-brand-700' : 'hover:bg-slate-100'}`}>
                {s.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="border-t border-slate-200 p-4 text-sm">
          <div className="mb-2 text-slate-500">{user?.username}</div>
          <button onClick={logout} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">تسجيل خروج</button>
        </div>
      </aside>
      <main className="flex-1 p-6"><Outlet /></main>
    </div>
  )
}
