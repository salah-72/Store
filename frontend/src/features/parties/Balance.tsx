import { fmtMoney } from '../../lib/format'
import { configs, type Kind } from './config'

// الرصيد: موجب = (عليه لينا / علينا له) ، سالب = العكس ، صفر = متصفّي
export default function Balance({ kind, value }: { kind: Kind; value: string | number }) {
  const n = Math.round(Number(value) * 100) / 100
  const cfg = configs[kind]
  if (n === 0) return <span className="mu">متصفّي</span>
  return (
    <span className={n > 0 ? 'neg' : 'ok'}>
      {fmtMoney(Math.abs(n))} <span style={{ fontSize: 12, fontWeight: 400 }}>{n > 0 ? cfg.owesLabel : cfg.creditLabel}</span>
    </span>
  )
}
