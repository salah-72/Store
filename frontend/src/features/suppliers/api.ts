import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  openingBalance: number;
  totalPurchased: number;
  totalPaid: number;
  remaining: number;
  isActive?: boolean;
};

export type PurchaseItem = {
  id: number;
  date: string;
  invoiceNumber: string | null;
  details?: string;
  total: number;
  paid: number;
};

export function useSuppliers(
  search?: string,
  debtOnly?: boolean,
  activeFilter: string = "true",
) {
  return useQuery({
    queryKey: ["suppliers", search, debtOnly, activeFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (activeFilter !== "all") queryParams.set("active", activeFilter);

      const res = await api.get<any>(`/suppliers?${queryParams.toString()}`);
      const data =
        res.data?.data?.suppliers ||
        res.data?.suppliers ||
        res.data?.data ||
        res.data;
      let list = Array.isArray(data) ? (data as Supplier[]) : [];

      if (debtOnly) {
        list = list.filter((s) => s.remaining > 0);
      }

      if (activeFilter === "true") {
        list = list.filter((s) => s.isActive !== false);
      } else if (activeFilter === "false") {
        list = list.filter((s) => s.isActive === false);
      }

      return list;
    },
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: ["supplier", id],
    enabled: !isNaN(id),
    queryFn: async () => {
      const res = await api.get<any>(`/suppliers/${id}`);
      return res.data?.data || res.data;
    },
  });
}

export function useSaveSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      phone?: string;
      openingBalance: number;
    }) => {
      const res = await api.post("/suppliers", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useSetSupplierActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await api.patch(`/suppliers/${id}/status`, { isActive });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", variables.id] });
    },
  });
}
