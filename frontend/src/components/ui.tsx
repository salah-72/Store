import type { ReactNode } from 'react'

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="bar"><h2>{title}</h2>{children}</div>
}
export function Kpi({ label, value, tone = '' }: { label: string; value: ReactNode; tone?: '' | 'ok' | 'warn' | 'danger' }) {
  return <div className={`kpi ${tone}`}><span>{label}</span><b>{value}</b></div>
}
export function Badge({ tone = '', children }: { tone?: '' | 'warn' | 'danger' | 'gray'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="pager">
      <button className="btn outline sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button>
      <span>صفحة {page} من {totalPages} ({total})</span>
      <button className="btn outline sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>التالي</button>
    </div>
  )
}
export function FormActions({ onCancel, busy, label = 'حفظ' }: { onCancel: () => void; busy: boolean; label?: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className="btn outline" onClick={onCancel}>إلغاء</button>
      <button className="btn" disabled={busy}>{busy ? 'جاري الحفظ...' : label}</button>
    </div>
  )
}
