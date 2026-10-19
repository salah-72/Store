import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Unit } from '../../lib/format'
import type { PageMeta } from '../items/api'

export interface PurchaseRow {
  id: number
  supplierId: number
  date: string
  discount: string
  total: string      // بعد الخصم
  subtotal: string   // قبل الخصم
  paid: string       // اللي اتدفع وقت الفاتورة
  note: string | null
  linesCount: number
  supplier: { id: number; name: string }
}
export interface PurchaseLine {
  id: number
  itemId: number
  baseQty: number
  lineTotal: string
  packs: number | null
  hasExpiry: boolean
  item: { id: number; name: string; unit: Unit; packName: string | null; packSize: number | null }
  batch: { id: number; expiryDate: string; unitCost: string; qtyRemaining: number }
}
export interface PurchaseDetail extends Omit<PurchaseRow, 'linesCount'> {
  lines: PurchaseLine[]
  purchaseReturns: { id: number; date: string; total: string; cashRefund: string }[]
}

export interface PurchasesFilter { supplierId?: number; from: string; to: string; page: number }

export function usePurchases(f: PurchasesFilter) {
  return useQuery({
    queryKey: ['purchases', f],
    queryFn: async () => {
      const r = await api.get('/purchases', {
        params: { page: f.page, limit: 20, supplierId: f.supplierId, from: f.from || undefined, to: f.to || undefined },
      })
      return { items: r.data.data as PurchaseRow[], meta: r.data.meta as PageMeta }
    },
    placeholderData: keepPreviousData,
  })
}

export function usePurchase(id: number | null) {
  return useQuery({
    queryKey: ['purchase', id],
    enabled: id !== null,
    queryFn: async () => (await api.get(`/purchases/${id}`)).data.data as PurchaseDetail,
  })
}

export interface PurchaseLineInput {
  itemId: number
  packs?: number
  baseQty?: number
  lineTotal: number
  expiryDate: string | null   // null = بدون صلاحية (لازم يتبعت صراحةً)
}
export interface PurchaseInput {
  supplierId: number
  date?: string
  note: string | null
  paid: number
  discount: number
  lines?: PurchaseLineInput[]   // في التعديل: لو ما اتبعتش الأسطر بتفضل زي ما هي
}

// الشراء بيغيّر المخزون وأرصدة الموردين، فبنحدّث كل الشاشات المتأثرة
function useRefreshAfterChange() {
  const qc = useQueryClient()
  return () => {
    for (const k of ['purchases', 'purchase', 'items', 'item', 'suppliers', 'statement']) qc.invalidateQueries({ queryKey: [k] })
  }
}

export function useSavePurchase() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: PurchaseInput }) =>
      (id ? await api.patch(`/purchases/${id}`, input) : await api.post('/purchases', input)).data.data as PurchaseDetail,
    onSuccess: refresh,
  })
}

export function useDeletePurchase() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/purchases/${id}`)).data.data,
    onSuccess: refresh,
  })
}
