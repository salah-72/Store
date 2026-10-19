import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import SaleForm from '../features/sales/SaleForm'
import { useSale } from '../features/sales/api'

export default function SaleFormPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data, isPending, error } = useSale(id)
  return (
    <div>
      <Link to={`/sales/${id}`} className="link-btn">← فاتورة #{id}</Link>
      <PageHeader title={`تعديل فاتورة بيع #${id}`} />
      {isPending && <p className="mu">جاري التحميل...</p>}
      {error && <p className="error">{errorMessage(error)}</p>}
      {data && <SaleForm initial={data} onSaved={(s, print) => navigate(`/sales/${s.id}${print ? '?print=1' : ''}`, { replace: true })} />}
    </div>
  )
}
