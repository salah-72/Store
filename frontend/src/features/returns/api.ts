import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Unit } from "../../lib/format";
import type { PageMeta } from "../items/api";

// مرتجع البيع (من العميل) ومرتجع الشراء (للمورد) نفس الشكل تقريباً، فبنتعامل معاهم بنفس الكود
export type ReturnKind = "sale" | "purchase";

export const returnCfg = {
  sale: {
    path: "/sale-returns",
    title: "مرتجعات العملاء",
    single: "مرتجع بيع",
    partyLabel: "العميل",
    partyKey: "customer",
    partyPath: "customers",
    filterParam: "customerId",
    invoice: "فاتورة البيع",
    invoiceKey: "saleId",
    invoicePath: "sales",
    lineField: "saleLineId",
    cashLabel: "الفلوس المرجّعة للعميل",
    creditLabel: "بتتخصم من حساب العميل",
  },
  purchase: {
    path: "/purchase-returns",
    title: "مرتجعات الموردين",
    single: "مرتجع شراء",
    partyLabel: "المورد",
    partyKey: "supplier",
    partyPath: "suppliers",
    filterParam: "supplierId",
    invoice: "فاتورة الشراء",
    invoiceKey: "purchaseId",
    invoicePath: "purchases",
    lineField: "purchaseLineId",
    cashLabel: "الفلوس المستردة من المورد",
    creditLabel: "بتتخصم من حسابنا عند المورد",
  },
} as const;

type PartyRef = { id: number; name: string } | null;
export interface ReturnRow {
  id: number;
  date: string;
  total: string;
  cashRefund: string;
  note: string | null;
  linesCount: number;
  customerId?: number | null;
  saleId?: number | null;
  purchaseId?: number | null;
  customer?: PartyRef; // مرتجع بيع (null = نقدي)
  supplier?: PartyRef; // مرتجع شراء
}

export interface ReturnLine {
  id: number;
  baseQty: number;
  lineTotal: string;
  item: { id: number; name: string; unit: Unit };
  batch: { id: number; expiryDate: string };
}
export interface ReturnDetail extends Omit<ReturnRow, "linesCount"> {
  sale?: { id: number; date: string; total: string } | null;
  purchase?: { id: number; date: string; total: string } | null;
  lines: ReturnLine[];
}

export interface ReturnsFilter {
  kind: ReturnKind;
  partyId?: number;
  from: string;
  to: string;
  page: number;
}

export function useReturns(f: ReturnsFilter) {
  return useQuery({
    queryKey: ["returns", f],
    queryFn: async () => {
      const r = await api.get(returnCfg[f.kind].path, {
        params: {
          page: f.page,
          limit: 14,
          from: f.from || undefined,
          to: f.to || undefined,
          [returnCfg[f.kind].filterParam]: f.partyId,
        },
      });
      return {
        items: r.data.data as ReturnRow[],
        meta: r.data.meta as PageMeta,
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useReturn(kind: ReturnKind, id: number | null) {
  return useQuery({
    queryKey: ["return", kind, id],
    enabled: id !== null,
    queryFn: async () =>
      (await api.get(`${returnCfg[kind].path}/${id}`)).data
        .data as ReturnDetail,
  });
}

// الكميات اللي لسه ينفع تترجّع من فاتورة معينة (كلها بالوحدة الصغيرة: قطعة/جرام/مل)
export interface ReturnableLine {
  lineId: number; // saleLineId أو purchaseLineId
  itemId: number;
  itemName: string;
  qty: number; // اتباع / اتشرى
  returned: number;
  returnable: number;
  inStock?: number; // مرتجع الشراء بس: الموجود في المخزن
  netUnitValue: number; // قيمة الوحدة الصغيرة بعد خصم الفاتورة
}
export interface Returnable {
  customerId?: number | null;
  supplierId?: number;
  lines: ReturnableLine[];
}

export function useReturnable(kind: ReturnKind, invoiceId: number | null) {
  return useQuery({
    queryKey: ["returnable", kind, invoiceId],
    enabled: invoiceId !== null,
    queryFn: async (): Promise<Returnable> => {
      const d = (
        await api.get(`${returnCfg[kind].path}/returnable/${invoiceId}`)
      ).data.data;
      return {
        customerId: d.customerId,
        supplierId: d.supplierId,
        lines: d.lines.map((l: Record<string, number | string>) => ({
          lineId: (l.saleLineId ?? l.purchaseLineId) as number,
          itemId: l.itemId as number,
          itemName: l.itemName as string,
          qty: (l.sold ?? l.bought) as number,
          returned: (l.returned ?? l.returnedFromBatch) as number,
          returnable: l.returnable as number,
          inStock: l.inStock as number | undefined,
          netUnitValue: Number(l.netUnitValue),
        })),
      };
    },
    staleTime: 0,
  });
}

export interface ReturnInput {
  invoiceId: number;
  date?: string;
  note: string | null;
  cashRefund?: number;
  lines: { lineId: number; baseQty: number }[];
}

// المرتجع بيرجّع/بيشيل مخزون وبيغيّر أرصدة الأطراف والفواتير
function useRefresh() {
  const qc = useQueryClient();
  return () => {
    for (const k of [
      "returns",
      "return",
      "returnable",
      "sales",
      "sale",
      "purchases",
      "purchase",
      "items",
      "item",
      "customers",
      "suppliers",
      "statement",
    ])
      qc.invalidateQueries({ queryKey: [k] });
  };
}

export function useCreateReturn(kind: ReturnKind) {
  const refresh = useRefresh();
  const c = returnCfg[kind];
  return useMutation({
    mutationFn: async (i: ReturnInput) =>
      (
        await api.post(c.path, {
          [c.invoiceKey]: i.invoiceId,
          date: i.date,
          note: i.note,
          cashRefund: i.cashRefund,
          lines: i.lines.map((l) => ({
            [c.lineField]: l.lineId,
            baseQty: l.baseQty,
          })),
        })
      ).data.data as ReturnDetail,
    onSuccess: refresh,
  });
}

export function useUpdateReturn(kind: ReturnKind) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: { date?: string; note?: string | null; cashRefund?: number };
    }) =>
      (await api.patch(`${returnCfg[kind].path}/${id}`, input)).data
        .data as ReturnDetail,
    onSuccess: refresh,
  });
}

export function useDeleteReturn(kind: ReturnKind) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`${returnCfg[kind].path}/${id}`)).data.data,
    onSuccess: refresh,
  });
}
