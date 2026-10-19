import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Unit } from "../../lib/format";
import type { PageMeta } from "../items/api";

export interface Adjustment {
  id: number;
  itemId: number;
  batchId: number;
  baseQty: number;
  reason: string;
  date: string;
  value: string; // تكلفة الكمية اللي اتشالت
  item: { id: number; name: string; unit: Unit };
  batch: { id: number; expiryDate: string; unitCost: string };
}

export interface AdjustmentsFilter {
  itemId?: number;
  from: string;
  to: string;
  page: number;
}

export function useAdjustments(f: AdjustmentsFilter) {
  return useQuery({
    queryKey: ["adjustments", f],
    queryFn: async () => {
      const r = await api.get("/stock-adjustments", {
        params: {
          page: f.page,
          limit: 14,
          itemId: f.itemId,
          from: f.from || undefined,
          to: f.to || undefined,
        },
      });
      return {
        items: r.data.data as Adjustment[],
        meta: r.data.meta as PageMeta,
        value: Number(r.data.summary?.value ?? 0),
      };
    },
    placeholderData: keepPreviousData,
  });
}

export interface AdjustmentInput {
  batchId: number;
  baseQty: number;
  reason: string;
  date?: string;
}

// التسوية بتغيّر مخزون الباتش
function useRefresh() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["adjustments", "items", "item", "pos-items"])
      qc.invalidateQueries({ queryKey: [k] });
  };
}
export function useCreateAdjustment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (input: AdjustmentInput) =>
      (await api.post("/stock-adjustments", input)).data.data as Adjustment,
    onSuccess: refresh,
  });
}
export function useUpdateAdjustment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: { reason: string; date: string };
    }) =>
      (await api.patch(`/stock-adjustments/${id}`, input)).data
        .data as Adjustment,
    onSuccess: refresh,
  });
}
export function useDeleteAdjustment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/stock-adjustments/${id}`)).data.data,
    onSuccess: refresh,
  });
}
