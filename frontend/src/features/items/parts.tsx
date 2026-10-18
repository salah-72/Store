import { Badge } from '../../components/ui'
import { daysUntil, fmtDate, hasExpiryDate, NEAR_EXPIRY_DAYS, type Unit } from '../../lib/format'
import type { Item } from './api'

export const unitName: Record<Unit, string> = { PIECE: 'قطعة', GRAM: 'وزن', ML: 'سائل' }

export function StatusBadges({ item }: { item: Pick<Item, 'stock' | 'expiredStock' | 'lowStock' | 'nearestExpiry'> }) {
  const list: { text: string; tone: '' | 'warn' | 'danger' }[] = []
  if (item.stock === 0) list.push({ text: 'نافد', tone: 'danger' })
  else {
    if (item.expiredStock > 0) list.push({ text: 'فيه منتهي', tone: 'danger' })
    if (item.lowStock) list.push({ text: 'نقص مخزون', tone: 'danger' })
    if (hasExpiryDate(item.nearestExpiry) && daysUntil(item.nearestExpiry) <= NEAR_EXPIRY_DAYS) list.push({ text: 'قرب ينتهي', tone: 'warn' })
  }
  if (list.length === 0) list.push({ text: 'متاح', tone: '' })
  return <span className="flex flex-wrap gap-1">{list.map((b) => <Badge key={b.text} tone={b.tone}>{b.text}</Badge>)}</span>
}

export function Expiry({ iso }: { iso: string | null }) {
  if (!hasExpiryDate(iso)) return <span className="mu">بدون</span>
  const d = daysUntil(iso)
  return <span className={d < 0 ? 'neg' : d <= NEAR_EXPIRY_DAYS ? 'warnc' : ''}>{fmtDate(iso)}</span>
}
