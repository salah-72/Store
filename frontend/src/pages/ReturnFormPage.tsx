import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import ReturnForm from '../features/returns/ReturnForm'
import { returnCfg, type ReturnKind } from '../features/returns/api'

// /returns/new?kind=sale&invoiceId=55  (بيتفتح من صفحة الفاتورة). من غير رقم فاتورة بنطلبه.
export default function ReturnFormPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const kind: ReturnKind = params.get('kind') === 'purchase' ? 'purchase' : 'sale'
  const invoiceId = Number(params.get('invoiceId')) || null
  const [num, setNum] = useState('')
  const cfg = returnCfg[kind]

  return (
    <div>
      <Link to={invoiceId ? `/${cfg.invoicePath}/${invoiceId}` : `/returns?kind=${kind}`} className="link-btn">← {invoiceId ? `${cfg.invoice} #${invoiceId}` : 'المرتجعات'}</Link>
      <PageHeader title={`${cfg.single} جديد`} />
      {!invoiceId ? (
        <div className="card" style={{ maxWidth: 460 }}>
          <div className="stack">
            <div>
              <label className="label">نوع المرتجع</label>
              <select className="input full" value={kind} onChange={(e) => navigate(`/returns/new?kind=${e.target.value}`, { replace: true })}>
                <option value="sale">مرتجع من عميل (على فاتورة بيع)</option>
                <option value="purchase">مرتجع لمورد (على فاتورة شراء)</option>
              </select>
            </div>
            <div>
              <label className="label">رقم {cfg.invoice}</label>
              <input className="input full" type="number" min="1" value={num} onChange={(e) => setNum(e.target.value)} autoFocus placeholder="مثلاً 55" />
              <p className="hint">كل مرتجع بيتسجل على فاتورة معينة. الأسهل تفتح الفاتورة وتدوس "مرتجع".</p>
            </div>
            <button className="btn" disabled={!(Number(num) > 0)} onClick={() => navigate(`/returns/new?kind=${kind}&invoiceId=${Number(num)}`)}>متابعة</button>
          </div>
        </div>
      ) : (
        <ReturnForm key={`${kind}-${invoiceId}`} kind={kind} invoiceId={invoiceId} />
      )}
    </div>
  )
}
