import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// الأقسام زي التصميم. اللي "soon" لسه ما اتبناش.
const groups: { title: string; items: { to: string; label: string; soon?: boolean }[] }[] = [
  { title: 'الرئيسية', items: [{ to: '/', label: '🏠 لوحة التحكم' }, { to: '/pos', label: '🧾 الكاشير' }] },
  { title: 'المخزن', items: [{ to: '/items', label: '📦 الأصناف' }, { to: '/adjustments', label: '🗑️ التالف والمنتهي' }] },
  { title: 'المعاملات', items: [
    { to: '/sales', label: '💰 المبيعات' }, { to: '/purchases', label: '📥 المشتريات' },
    { to: '/returns', label: '↩️ المرتجعات' }, { to: '/payments', label: '💵 الدفعات' } ] },
  { title: 'الأطراف', items: [{ to: '/customers', label: '👥 العملاء' }, { to: '/suppliers', label: '🚚 الموردين' }] },
  { title: 'المال', items: [{ to: '/expenses', label: '💸 المصاريف' }, { to: '/reports', label: '📊 التقارير' }] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="app">
      <nav className="sidebar">
        <h1>🌿 مبيدات الفلاح</h1>
        {groups.map((g) => (
          <div key={g.title}>
            <small>{g.title}</small>
            {g.items.map((i) =>
              i.soon ? (
                <div key={i.to} className="nav-item soon">{i.label}<em>قريباً</em></div>
              ) : (
                <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>{i.label}</NavLink>
              ),
            )}
          </div>
        ))}
        <small>الحساب</small>
        <NavLink to="/account" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>👤 {user?.username}</NavLink>
        <button className="nav-item" onClick={logout}>🔐 تسجيل خروج</button>
      </nav>
      <main className="main"><Outlet /></main>
    </div>
  )
}
