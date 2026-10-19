import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Unit } from "../../lib/format";

// كل الفلوس بتيجي من السيرفر كنص، والكميات بالوحدة الصغيرة (قطعة/جرام/مل)
export interface DayRow {
  day: string;
  count: number;
  sales: string;
  returns: string;
  net: string;
}

export interface Dashboard {
  today: {
    date: string;
    salesCount: number;
    sales: string;
    returns: string;
    net: string;
  };
  month: {
    from: string;
    to: string;
    netSales: string;
    grossProfit: string;
    expenses: string;
    netProfit: string;
  };
  receivables: {
    total: string;
    count: number;
    top: { id: number; name: string; remaining: string }[];
  };
  payables: {
    total: string;
    count: number;
    top: { id: number; name: string; remaining: string }[];
  };
  last7Days: DayRow[];
  stock: { value: string; expiredValue: string };
  alerts: {
    lowStock: {
      count: number;
      items: {
        itemId: number;
        name: string;
        unit: Unit;
        reorderLevel: number;
        sellable: number;
      }[];
    };
    nearExpiry: {
      days: number;
      count: number;
      batches: {
        batchId: number;
        itemId: number;
        name: string;
        expiryDate: string;
        daysLeft: number;
        qtyRemaining: number;
        value: string;
      }[];
    };
    expired: {
      count: number;
      value: string;
      batches: {
        batchId: number;
        itemId: number;
        name: string;
        expiryDate: string;
        qtyRemaining: number;
        value: string;
      }[];
    };
  };
}
export function useDashboard() {
  return useQuery({
    queryKey: ["stats", "dashboard"],
    queryFn: async () =>
      (await api.get("/stats/dashboard")).data.data as Dashboard,
    staleTime: 30_000,
  });
}

export interface Overview {
  period: { from: string; to: string };
  sales: {
    count: number;
    subtotal: string;
    discount: string;
    total: string;
    returns: string;
    net: string;
  };
  cost: { sold: string; returned: string; net: string };
  grossProfit: string;
  expenses: {
    total: string;
    byCategory: { category: string; amount: string; count: number }[];
  };
  purchaseDiscounts: string;
  writeOffs: string;
  netProfit: string;
  purchases: {
    count: number;
    subtotal: string;
    discount: string;
    total: string;
    returns: string;
    net: string;
  };
  cashFlow: {
    in: string;
    out: string;
    net: string;
    parts: {
      paidOnSales: string;
      customerPayments: string;
      supplierRefunds: string;
      paidOnPurchases: string;
      supplierPayments: string;
      customerRefunds: string;
      expenses: string;
    };
  };
}
export function useOverview(from: string, to: string) {
  return useQuery({
    queryKey: ["stats", "overview", from, to],
    queryFn: async () =>
      (await api.get("/stats/overview", { params: { from, to } })).data
        .data as Overview,
  });
}

export interface SalesByDay {
  period: { from: string; to: string };
  days: DayRow[];
  summary: { count: number; sales: string; returns: string; net: string };
}
export function useSalesByDay(from: string, to: string) {
  return useQuery({
    queryKey: ["stats", "by-day", from, to],
    queryFn: async () =>
      (await api.get("/stats/sales-by-day", { params: { from, to } })).data
        .data as SalesByDay,
  });
}

export interface TopItem {
  itemId: number;
  name: string;
  unit: Unit | null;
  soldQty: number;
  returnedQty: number;
  netQty: number;
  revenue: string;
}
export function useTopItems(
  from: string,
  to: string,
  by: "revenue" | "quantity",
) {
  return useQuery({
    queryKey: ["stats", "top", from, to, by],
    queryFn: async () =>
      (
        await api.get("/stats/top-items", {
          params: { from, to, by, limit: 10 },
        })
      ).data.data.items as TopItem[],
  });
}

export interface StaleStock {
  days: number;
  count: number;
  value: string;
  items: {
    itemId: number;
    name: string;
    unit: Unit;
    sellable: number;
    value: string;
  }[];
}
export function useStaleStock(days: number) {
  return useQuery({
    queryKey: ["stats", "stale", days],
    queryFn: async () =>
      (await api.get("/stats/stale-stock", { params: { days, limit: 30 } }))
        .data.data as StaleStock,
  });
}
