import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <div className="grid min-h-screen place-items-center text-slate-500">جاري التحميل...</div>
  return status === 'authed' ? <Outlet /> : <Navigate to="/login" replace />
}
