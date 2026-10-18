import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { Badge, PageHeader, Pager } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fmtMoney, fmtQty, priceSuffix, unitLabel, type Unit } from '../lib/format'
import { useDebounce } from '../hooks/useDebounce'
import { useItems, useSetItemActive, type Item, type ItemsFilter } from '../features/items/api'
import { Expiry, StatusBadges, unitName } from '../features/items/parts'
import ItemForm from '../features/items/ItemForm'

export default function ItemsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Omit<ItemsFilter, 'search'>>({ unit: '', active: 'true', lowStock: false, page: 1 })
  const debounced = useDebounce(search)
  const { data, isPending, isFetching, error } = useItems({ ...filter, search: debounced })
  const setActive = useSetItemActive()
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [actionError, setActionError] = useState('')
  const update = (patch: Partial<typeof filter>) => setFilter((f) => ({ ...f, page: 1, ...patch }))

  async function toggle(item: Item) {
    setActionError('')
    try { await setActive.mutateAsync({ id: item.id, isActive: !item.isActive }) }
    catch (e) { setActionError(errorMessage(e)) }
  }

  return (
    <div>
      <PageHeader title="الأصناف">
        <input className="input" placeholder="بحث بالاسم" value={search} onChange={(e) => { setSearch(e.target.value); setFilter((f) => ({ ...f, page: 1 })) }} />
        <select className="input" value={filter.unit} onChange={(e) => update({ unit: e.target.value as Unit | '' })}>
          <option value="">كل الأنواع</option>
          {(Object.keys(unitLabel) as Unit[]).map((u) => <option key={u} value={u}>{unitLabel[u]}</option>)}
        </select>
        <select className="input" value={filter.active} onChange={(e) => update({ active: e.target.value as ItemsFilter['active'] })}>
          <option value="true">النشطة</option><option value="false">المعطّلة</option><option value="all">الكل</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filter.lowStock} onChange={(e) => update({ lowStock: e.target.checked })} /> الناقص بس</label>
        <button className="btn" onClick={() => setEditing('new')}>+ صنف جديد</button>
      </PageHeader>
      {isFetching && !isPending && <p className="hint" style={{ marginTop: -8 }}>جاري التحديث...</p>}
      {actionError && <p className="error" style={{ marginBottom: 10 }}>{actionError}</p>}

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{['الصنف', 'النوع', 'الكمية المتاحة', 'السعر', 'أقرب انتهاء', 'الحالة', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>جاري التحميل...</td></tr>}
            {error && <tr><td colSpan={7} className="neg" style={{ textAlign: 'center', padding: 28 }}>{errorMessage(error)}</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={7} className="mu" style={{ textAlign: 'center', padding: 28 }}>مفيش أصناف مطابقة</td></tr>}
            {data?.items.map((item) => (
              <tr key={item.id} className={`clickable ${item.isActive ? '' : 'dim'}`} onClick={() => navigate(`/items/${item.id}`)}>
                <td><b>{item.name}</b> {!item.isActive && <Badge tone="gray">معطّل</Badge>}</td>
                <td>{unitName[item.unit]}</td>
                <td>{fmtQty(item.unit, item.sellable)}</td>
                <td>{fmtMoney(item.price)} <span className="mu" style={{ fontSize: 12 }}>{priceSuffix[item.unit]}</span></td>
                <td><Expiry iso={item.nearestExpiry} /></td>
                <td><StatusBadges item={item} /></td>
                <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'end' }}>
                  <button className="link-btn" onClick={() => setEditing(item)}>تعديل</button>
                  <button className="link-btn" disabled={setActive.isPending} onClick={() => toggle(item)}>{item.isActive ? 'تعطيل' : 'تفعيل'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => setFilter((f) => ({ ...f, page: p }))} />}

      {editing && (
        <Modal title={editing === 'new' ? 'صنف جديد' : `تعديل: ${editing.name}`} onClose={() => setEditing(null)}>
          <ItemForm item={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
