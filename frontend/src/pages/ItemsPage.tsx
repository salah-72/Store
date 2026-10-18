import { useState } from 'react'
import Modal from '../components/Modal'
import { errorMessage } from '../lib/api'
import { daysUntil, fmtDate, fmtMoney, fmtQty, NEAR_EXPIRY_DAYS, priceSuffix, unitLabel, type Unit } from '../lib/format'
import { useDebounce } from '../hooks/useDebounce'
import { useItems, useSetItemActive, type Item, type ItemsFilter } from '../features/items/api'
import ItemForm from '../features/items/ItemForm'
import ItemDetails from '../features/items/ItemDetails'

function Badges({ item }: { item: Item }) {
  const list: { text: string; cls: string }[] = []
  const red = 'bg-red-100 text-red-700', amber = 'bg-amber-100 text-amber-700'
  if (item.stock === 0) list.push({ text: 'نافد', cls: red })
  else {
    if (item.expiredStock > 0) list.push({ text: 'فيه منتهي', cls: red })
    if (item.lowStock) list.push({ text: 'ناقص', cls: amber })
    if (item.nearestExpiry && daysUntil(item.nearestExpiry) <= NEAR_EXPIRY_DAYS) list.push({ text: 'قرب ينتهي', cls: amber })
  }
  if (list.length === 0) list.push({ text: 'متاح', cls: 'bg-brand-100 text-brand-700' })
  return <div className="flex flex-wrap gap-1">{list.map((b) => <span key={b.text} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>{b.text}</span>)}</div>
}

function Expiry({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-slate-400">—</span>
  const d = daysUntil(iso)
  return <span className={d < 0 ? 'text-red-600' : d <= NEAR_EXPIRY_DAYS ? 'text-amber-600' : ''}>{fmtDate(iso)}</span>
}

const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'

export default function ItemsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Omit<ItemsFilter, 'search'>>({ unit: '', active: 'true', lowStock: false, page: 1 })
  const debounced = useDebounce(search)
  const { data, isPending, isFetching, error } = useItems({ ...filter, search: debounced })
  const setActive = useSetItemActive()

  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  async function toggle(item: Item) {
    setActionError('')
    try { await setActive.mutateAsync({ id: item.id, isActive: !item.isActive }) }
    catch (e) { setActionError(errorMessage(e)) }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">الأصناف</h1>
        <button onClick={() => setEditing('new')} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">+ صنف جديد</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className={`${field} w-64`} placeholder="ابحث باسم الصنف..." value={search} onChange={(e) => { setSearch(e.target.value); setFilter((f) => ({ ...f, page: 1 })) }} />
        <select className={field} value={filter.unit} onChange={(e) => update({ unit: e.target.value as Unit | '' })}>
          <option value="">كل الأنواع</option>
          {(Object.keys(unitLabel) as Unit[]).map((u) => <option key={u} value={u}>{unitLabel[u]}</option>)}
        </select>
        <select className={field} value={filter.active} onChange={(e) => update({ active: e.target.value as ItemsFilter['active'] })}>
          <option value="true">النشطة</option>
          <option value="false">المعطّلة</option>
          <option value="all">الكل</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filter.lowStock} onChange={(e) => update({ lowStock: e.target.checked })} /> الناقص بس
        </label>
        {isFetching && <span className="text-sm text-slate-400">جاري التحديث...</span>}
      </div>

      {actionError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {['الصنف', 'السعر', 'الكمية المتاحة', 'أقرب انتهاء', 'الحالة', ''].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isPending && <tr><td colSpan={6} className="p-8 text-center text-slate-500">جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={6} className="p-8 text-center text-red-600">{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">مفيش أصناف مطابقة</td></tr>}
            {data?.items.map((item) => (
              <tr key={item.id} className={`border-t border-slate-100 hover:bg-slate-50 ${item.isActive ? '' : 'opacity-60'}`}>
                <td className="px-4 py-3">
                  <button onClick={() => setViewing(item.id)} className="font-semibold text-brand-700 hover:underline">{item.name}</button>
                  {!item.isActive && <span className="ms-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">معطّل</span>}
                </td>
                <td className="px-4 py-3">{fmtMoney(item.price)} <span className="text-xs text-slate-400">{priceSuffix[item.unit]}</span></td>
                <td className="px-4 py-3">{fmtQty(item.unit, item.sellable)}</td>
                <td className="px-4 py-3"><Expiry iso={item.nearestExpiry} /></td>
                <td className="px-4 py-3"><Badges item={item} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-end">
                  <button onClick={() => setEditing(item)} className="rounded-lg px-2 py-1 hover:bg-slate-100">تعديل</button>
                  <button onClick={() => toggle(item)} disabled={setActive.isPending} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">{item.isActive ? 'تعطيل' : 'تفعيل'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">السابق</button>
          <span>صفحة {data.meta.page} من {data.meta.totalPages} ({data.meta.total} صنف)</span>
          <button disabled={filter.page >= data.meta.totalPages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">التالي</button>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'صنف جديد' : `تعديل: ${editing.name}`} onClose={() => setEditing(null)}>
          <ItemForm item={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
      {viewing !== null && (
        <Modal title="تفاصيل الصنف" onClose={() => setViewing(null)} wide>
          <ItemDetails id={viewing} />
        </Modal>
      )}
    </div>
  )
}
