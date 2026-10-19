import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PageMeta } from "../items/api";

export interface PaymentRow {
  id: number;
  customerId: number | null;
  supplierId: number | null;
  amount: string;
  date: string;
  note: string | null;
  type: "CUSTOMER" | "SUPPLIER";
  direction: "IN" | "OUT"; // IN = قبضنا من عميل ، OUT = دفعنا لمورد
  party: { id: number; name: string };
}

export interface PaymentsFilter {
  type: "" | "customer" | "supplier";
  partyId?: number;
  from: string;
  to: string;
  page: number;
}

export function usePayments(f: PaymentsFilter) {
  return useQuery({
    queryKey: ["payments", f],
    queryFn: async () => {
      const r = await api.get("/payments", {
        params: {
          page: f.page,
          limit: 14,
          type: f.type || undefined,
          from: f.from || undefined,
          to: f.to || undefined,
          customerId: f.type === "customer" ? f.partyId : undefined,
          supplierId: f.type === "supplier" ? f.partyId : undefined,
        },
      });
      return {
        items: r.data.data as PaymentRow[],
        meta: r.data.meta as PageMeta,
        sum: Number(r.data.summary?.amount ?? 0),
      };
    },
    placeholderData: keepPreviousData,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["payments", "customers", "suppliers", "statement"])
      qc.invalidateQueries({ queryKey: [k] });
  };
}

export function useUpdatePayment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: { amount: number; date: string; note: string | null };
    }) => (await api.patch(`/payments/${id}`, input)).data.data,
    onSuccess: refresh,
  });
}

export function useDeletePayment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/payments/${id}`)).data.data,
    onSuccess: refresh,
  });
}
