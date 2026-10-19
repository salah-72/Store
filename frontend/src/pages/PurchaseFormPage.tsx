import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { useParty } from '../features/parties/api'
import { usePurchase } from '../features/purchases/api'
import PurchaseForm from '../features/purchases/PurchaseForm'

// نفس الصفحة للإضافة (/purchases/new) والتعديل (/purchases/:id/edit)
export default function PurchaseFormPage() {
  const { id } = useParams()
  const editId = id ? Number(id) : null
  const presetId = Number(useSearchParams()[0].get('supplierId')) || null
  const purchase = usePurchase(editId)
  const preset = useParty('suppliers', editId ? null : presetId)
  const back = editId ? `/purchases/${editId}` : '/purchases'

  const loading = (editId && purchase.isPending) || (!editId && presetId && preset.isPending)
  const err = purchase.error ?? preset.error

  return (
    <div>
      <Link to={back} className="link-btn">← {editId ? `فاتورة #${editId}` : 'المشتريات'}</Link>
      <PageHeader title={editId ? `تعديل فاتورة شراء #${editId}` : 'فاتورة شراء جديدة'} />
      {loading && <p className="mu">جاري التحميل...</p>}
      {err && <p className="error">{errorMessage(err)}</p>}
      {!loading && !err && <PurchaseForm initial={purchase.data} presetSupplier={preset.data} />}
    </div>
  )
}
