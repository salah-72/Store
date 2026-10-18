import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { configs, type Kind } from './config'
import type { PageMeta } from '../items/api'

export interface Party {
  id: number
  name: string
  phone: string
  openingBalance: string
  isActive: boolean
  totalPurchases?: string   // موردين
  totalSales?: string       // عملاء
  netPurchases?: string
  netSales?: string
  totalReturns: string
  totalPaid: string
  remaining: string         // + = عليه/علينا له ، - = له/ليا عنده
}
export const netTotal = (p: Party) => p.netPurchases ?? p.netSales ?? '0'

export interface PartiesFilter { search: string; active: 'true' | 'false' | 'all'; debt: boolean; page: number }

export function useParties(kind: Kind, f: PartiesFilter) {
  return useQuery({
    queryKey: [kind, f],
    queryFn: async () => {
      const r = await api.get(`/${kind}`, {
        params: {
          page: f.page, limit: 20, active: f.active, search: f.search || undefined,
          [configs[kind].debtFilterParam]: f.debt ? 'true' : undefined,
        },
      })
      return { items: r.data.data as Party[], meta: r.data.meta as PageMeta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useParty(kind: Kind, id: number) {
  return useQuery({
    queryKey: [kind, 'one', id],
    queryFn: async () => (await api.get(`/${kind}/${id}`)).data.data as Party,
  })
}

export interface PartyInput { name: string; phone: string; openingBalance: number }

export function useSaveParty(kind: Kind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: PartyInput }) =>
      id ? (await api.patch(`/${kind}/${id}`, input)).data.data : (await api.post(`/${kind}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  })
}

export function useSetPartyActive(kind: Kind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/${kind}/${id}/status`, { isActive })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  })
}

export interface StatementRow {
  date: string
  type: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'RETURN'
  ref: number
  debit: string
  credit: string
  note: string | null
  balance: string
}
export interface Statement {
  openingBalance: string
  rows: StatementRow[]
  totals: { debit: string; credit: string }
  closingBalance: string
}

export function useStatement(kind: Kind, id: number, from: string, to: string) {
  return useQuery({
    queryKey: ['statement', kind, id, from, to],
    queryFn: async () =>
      (await api.get(`/${kind}/${id}/statement`, { params: { from: from || undefined, to: to || undefined } })).data.data as Statement & { supplier?: { name: string }; customer?: { name: string } },
  })
}

export interface PaymentInput { amount: number; date?: string; note: string | null }

export function useCreatePayment(kind: Kind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ partyId, input }: { partyId: number; input: PaymentInput }) =>
      (await api.post('/payments', { [configs[kind].paymentField]: partyId, ...input })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind] })
      qc.invalidateQueries({ queryKey: ['statement'] })
    },
  })
}
