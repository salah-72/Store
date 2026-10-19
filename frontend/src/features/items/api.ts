import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Unit } from "../../lib/format";

export interface Item {
  id: number;
  name: string;
  description: string | null;
  unit: Unit;
  price: string; // السيرفر بيبعت الفلوس كنص، بنحوّلها بـ Number() وقت العرض
  priceBasis: number;
  packName: string | null;
  packSize: number | null;
  reorderLevel: number;
  isActive: boolean;
  stock: number; // إجمالي الكمية
  sellable: number; // الكمية الصالحة للبيع (غير المنتهية)
  expiredStock: number;
  nearestExpiry: string | null;
  lowStock: boolean;
}
export interface Batch {
  id: number;
  expiryDate: string;
  unitCost: string;
  qtyReceived: number;
  qtyRemaining: number;
  hasExpiry: boolean;
  expired: boolean;
}
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ItemsFilter {
  search: string;
  unit: "" | Unit;
  active: "true" | "false" | "all";
  lowStock: boolean;
  page: number;
}

export function useItems(f: ItemsFilter) {
  return useQuery({
    queryKey: ["items", f],
    queryFn: async () => {
      const r = await api.get("/items", {
        params: {
          page: f.page,
          limit: 14,
          active: f.active,
          search: f.search || undefined,
          unit: f.unit || undefined,
          lowStock: f.lowStock ? "true" : undefined,
        },
      });
      return { items: r.data.data as Item[], meta: r.data.meta as PageMeta };
    },
    placeholderData: keepPreviousData, // الجدول القديم يفضل ظاهر لحد ما الجديد يوصل
  });
}

export function useItem(id: number | null) {
  return useQuery({
    queryKey: ["item", id],
    enabled: id !== null,
    queryFn: async () =>
      (await api.get(`/items/${id}`)).data.data as Item & { batches: Batch[] },
  });
}

export interface ItemInput {
  name: string;
  description: string | null;
  unit: Unit;
  price: number;
  packName: string | null;
  packSize: number | null;
  reorderLevel: number;
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: ItemInput }) =>
      id
        ? (await api.patch(`/items/${id}`, input)).data.data
        : (await api.post("/items", input)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["item"] });
    },
  });
}

export function useSetItemActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/items/${id}/status`, { isActive })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["item"] });
    },
  });
}

export async function fetchItems(search: string): Promise<Item[]> {
  const r = await api.get("/items", {
    params: { search: search || undefined, limit: 20, active: "true" },
  });
  return r.data.data as Item[];
}
