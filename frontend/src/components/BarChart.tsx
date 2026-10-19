import { fmtMoney, fmtShortDay } from '../lib/format'

// أعمدة بسيطة: ارتفاع العمود نسبة من أكبر قيمة. المرور بالماوس بيظهر القيمة.
export default function BarChart({ rows, labelEvery = 1 }: { rows: { day: string; value: number }[]; labelEvery?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="ch" role="img" aria-label="مبيعات بالأيام">
      {rows.map((r, i) => (
        <i key={r.day} style={{ height: `${Math.max(2, (Math.max(r.value, 0) / max) * 100)}%` }} title={`${fmtShortDay(r.day)}: ${fmtMoney(r.value)}`}>
          {i % labelEvery === 0 && <em>{fmtShortDay(r.day)}</em>}
        </i>
      ))}
    </div>
  )
}
