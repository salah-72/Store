import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PageMeta } from "../items/api";

export interface Expense {
  id: number;
  category: string;
  amount: string;
  date: string;
  note: string | null;
}
export interface CategoryTotal {
  category: string;
  amount: string;
  count: number;
}
export interface ExpensesFilter {
  category: string;
  search: string;
  from: string;
  to: string;
  page: number;
}

export function useExpenses(f: ExpensesFilter) {
  return useQuery({
    queryKey: ["expenses", f],
    queryFn: async () => {
      const r = await api.get("/expenses", {
        params: {
          page: f.page,
          limit: 14,
          category: f.category || undefined,
          search: f.search || undefined,
          from: f.from || undefined,
          to: f.to || undefined,
        },
      });
      return {
        items: r.data.data as Expense[],
        meta: r.data.meta as PageMeta,
        sum: Number(r.data.summary?.amount ?? 0),
        byCategory: (r.data.summary?.byCategory ?? []) as CategoryTotal[],
      };
    },
    placeholderData: keepPreviousData,
  });
}

// التصنيفات المستخدمة قبل كده (اقتراحات وقت الكتابة)
export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () =>
      (await api.get("/expenses/categories")).data.data as {
        category: string;
        count: number;
      }[],
    staleTime: 60_000,
  });
}

export interface ExpenseInput {
  category: string;
  amount: number;
  date?: string;
  note: string | null;
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["expenses", "expense-categories"])
      qc.invalidateQueries({ queryKey: [k] });
  };
}
export function useSaveExpense() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: ExpenseInput }) =>
      (id
        ? await api.patch(`/expenses/${id}`, input)
        : await api.post("/expenses", input)
      ).data.data as Expense,
    onSuccess: refresh,
  });
}
export function useDeleteExpense() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/expenses/${id}`)).data.data,
    onSuccess: refresh,
  });
}
