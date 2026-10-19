import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtMoney } from '../lib/format'
import { useParty } from '../features/parties/api'
import SaleForm from '../features/sales/SaleForm'
import type { SaleDetail } from '../features/sales/api'

// شاشة الكاشير: فاتورة بيع جديدة. بعد الحفظ بتتفضى جاهزة للعميل اللي بعده.
export default function PosPage() {
  const navigate = useNavigate()
  const [formKey, setFormKey] = useState(0)
  const [last, setLast] = useState<SaleDetail | null>(null)
  // /pos?customerId=5 بيفتح الفاتورة والعميل مختار (من صفحة العميل)
  const presetId = Number(useSearchParams()[0].get('customerId')) || null
  const preset = useParty('customers', presetId)

  function onSaved(sale: SaleDetail, print: boolean) {
    if (print) return navigate(`/sales/${sale.id}?print=1`)
    setLast(sale)
    setFormKey((k) => k + 1)   // يفضّي الفاتورة
  }

  return (
    <div>
      <PageHeader title="الكاشير">
        <Link to="/sales" className="btn outline">كل المبيعات</Link>
      </PageHeader>
      {last && (
        <p className="notice">
          ✅ اتحفظت فاتورة <Link to={`/sales/${last.id}`} className="ok"><b>#{last.id}</b></Link> بإجمالي {fmtMoney(last.total)}
          {last.customer ? ` على ${last.customer.name}` : ' (نقدي)'}.
        </p>
      )}
      {presetId && preset.isPending && <p className="mu">جاري التحميل...</p>}
      {preset.error && <p className="error">{errorMessage(preset.error)}</p>}
      {!(presetId && preset.isPending) && <SaleForm key={formKey} presetCustomer={preset.data} onSaved={onSaved} />}
    </div>
  )
}
