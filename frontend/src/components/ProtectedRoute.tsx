import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <div className="mu" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>جاري التحميل...</div>
  return status === 'authed' ? <Outlet /> : <Navigate to="/login" replace />
}
