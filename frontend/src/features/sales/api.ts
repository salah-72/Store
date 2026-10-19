import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Unit } from "../../lib/format";
import type { PageMeta } from "../items/api";

export interface SaleRow {
  id: number;
  customerId: number | null; // null = بيع نقدي
  date: string;
  discount: string;
  total: string; // بعد الخصم
  subtotal: string; // قبل الخصم
  paid: string;
  note: string | null;
  linesCount: number;
  customer: { id: number; name: string } | null;
}
export interface SaleLine {
  id: number;
  itemId: number;
  baseQty: number;
  unitPrice: string; // سعر الوحدة الصغيرة (جرام/مل/قطعة)
  lineTotal: string;
  cost: string;
  profit: string;
  belowCost: boolean;
  item: { id: number; name: string; unit: Unit; priceBasis: number };
  batches: {
    id: number;
    batchId: number;
    baseQty: number;
    unitCost: string;
    batch: { expiryDate: string };
  }[];
}
export interface SaleDetail extends Omit<SaleRow, "linesCount" | "customer"> {
  customer: { id: number; name: string; phone: string } | null;
  cost: string;
  profit: string;
  lines: SaleLine[];
  returns: { id: number; date: string; total: string; cashRefund: string }[];
}

export interface SalesFilter {
  customerId?: number;
  cash: boolean;
  from: string;
  to: string;
  page: number;
}

export function useSales(f: SalesFilter) {
  return useQuery({
    queryKey: ["sales", f],
    queryFn: async () => {
      const r = await api.get("/sales", {
        params: {
          page: f.page,
          limit: 14,
          customerId: f.customerId,
          cash: f.cash ? "true" : undefined,
          from: f.from || undefined,
          to: f.to || undefined,
        },
      });
      return { items: r.data.data as SaleRow[], meta: r.data.meta as PageMeta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: ["sale", id],
    enabled: id !== null,
    queryFn: async () =>
      (await api.get(`/sales/${id}`)).data.data as SaleDetail,
  });
}

export interface SaleLineInput {
  itemId: number;
  baseQty: number;
  price?: number; // سعر مختلف عن سعر الصنف (لكل وحدة الصنف الكبيرة: كيلو/لتر/قطعة)
  lineTotal?: number; // أو إجمالي السطر مباشرة (مش الاتنين مع بعض)
}
export interface SaleInput {
  customerId: number | null;
  date?: string;
  note: string | null;
  discount: number;
  paid: number;
  lines?: SaleLineInput[]; // في التعديل: لو ما اتبعتش الأسطر بتفضل زي ما هي
}

// البيع بيغيّر المخزون وأرصدة العملاء والإحصائيات
function useRefreshAfterChange() {
  const qc = useQueryClient();
  return () => {
    for (const k of [
      "sales",
      "sale",
      "items",
      "item",
      "customers",
      "statement",
      "pos-items",
    ])
      qc.invalidateQueries({ queryKey: [k] });
  };
}

export function useSaveSale() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: SaleInput }) =>
      (id
        ? await api.patch(`/sales/${id}`, input)
        : await api.post("/sales", input)
      ).data.data as SaleDetail,
    onSuccess: refresh,
  });
}

export function useDeleteSale() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/sales/${id}`)).data.data,
    onSuccess: refresh,
  });
}
