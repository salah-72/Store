import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="mu" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>جاري التحميل...</div>
  // بنفتكر الصفحة اللي كان عايزها عشان نرجّعه ليها بعد الدخول
  return status === 'authed' ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}
