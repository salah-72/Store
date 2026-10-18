import { PageHeader } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  return (
    <div>
      <PageHeader title="لوحة التحكم" />
      <div className="card">
        <b>أهلاً {user?.username} 👋</b>
        <p className="mu" style={{ marginBottom: 0 }}>الأرقام (المبيعات والأرباح والمديونيات) هتتضاف هنا بعد ما نخلص صفحات البيع والشراء.</p>
      </div>
    </div>
  )
}
