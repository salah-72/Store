import { useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Undo2, X } from "lucide-react";
import { Pager } from "../../components/ui";
import { fmtDate, fmtMoney, fmtQty } from "../../lib/format";
import type { Unit } from "../../lib/format";
import { useItemSales } from "./api";

const dateInputClass =
  "font-[inherit] px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

const headers = [
  "الفاتورة",
  "التاريخ",
  "العميل",
  "الكمية",
  "سعر الوحدة",
  "الإجمالي",
  "الربح",
  "مرتجع",
];

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "bad"
      ? "text-[var(--da)]"
      : tone === "good"
        ? "text-[var(--br)]"
        : "text-[var(--tx)]";
  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs px-4 py-3">
      <div className="text-xs font-medium text-[var(--mu)] mb-1">{label}</div>
      <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export default function ItemSalesHistory({
  itemId,
  unit,
}: {
  itemId: number;
  unit: Unit;
}) {
  const [filter, setFilter] = useState({ page: 1, from: "", to: "" });
  const { data, isLoading, isError, isFetching } = useItemSales(itemId, filter);
  const set = (p: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...p }));
  const hasFilter = !!(filter.from || filter.to);
  const s = data?.summary;
  const basis = data?.item.priceBasis ?? (unit === "PIECE" ? 1 : 1000);
  const suffix = unit === "PIECE" ? "للقطعة" : unit === "GRAM" ? "للكيلو" : "للتر";

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="flex items-center gap-2 text-base font-bold m-0">
          <Receipt size={18} className="text-[var(--br)]" />
          سجل المبيعات
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--mu)]">
            من
            <input
              type="date"
              className={dateInputClass}
              value={filter.from}
              max={filter.to || undefined}
              onChange={(e) => set({ from: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--mu)]">
            إلى
            <input
              type="date"
              className={dateInputClass}
              value={filter.to}
              min={filter.from || undefined}
              onChange={(e) => set({ to: e.target.value })}
            />
          </label>
          {hasFilter && (
            <button
              onClick={() => set({ from: "", to: "" })}
              className="font-[inherit] inline-flex items-center gap-1 px-3 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-xs font-semibold text-[var(--mu)] cursor-pointer hover:border-[var(--br)] hover:text-[var(--br)] transition-colors"
            >
              <X size={14} />
              مسح
            </button>
          )}
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Stat label="عدد الفواتير" value={String(s.invoices)} />
          <Stat label="الكمية المباعة" value={fmtQty(unit, s.soldQty)} />
          <Stat label="إيراد المبيعات" value={fmtMoney(s.soldRevenue)} />
          <Stat
            label="مرتجع"
            value={
              s.returnedQty > 0
                ? `${fmtQty(unit, s.returnedQty)} · ${fmtMoney(s.returnedRevenue)}`
                : "لا يوجد"
            }
            tone={s.returnedQty > 0 ? "bad" : undefined}
          />
          <Stat label="صافي الكمية" value={fmtQty(unit, s.netQty)} />
          <Stat label="صافي الإيراد" value={fmtMoney(s.netRevenue)} />
          <Stat
            label="صافي الربح"
            value={fmtMoney(s.netProfit)}
            tone={s.netProfit < 0 ? "bad" : "good"}
          />
        </div>
      )}

      <div
        className={`overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs transition-opacity ${
          isFetching && !isLoading ? "opacity-70" : ""
        }`}
      >
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={headers.length} className="p-10 text-center text-[var(--mu)]">
                  جاري التحميل...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={headers.length} className="p-10 text-center text-[var(--da)] font-semibold">
                  تعذر تحميل سجل المبيعات
                </td>
              </tr>
            ) : !data || data.lines.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="p-10 text-center text-[var(--mu)] font-semibold">
                  {hasFilter ? "مفيش مبيعات للصنف ده في الفترة دي" : "الصنف ده لسه ما اتباعش"}
                </td>
              </tr>
            ) : (
              data.lines.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/sales/${l.saleId}`}
                      className="font-bold text-[var(--br)] no-underline hover:underline tabular-nums"
                    >
                      #{l.saleId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--mu)] tabular-nums">{fmtDate(l.date)}</td>
                  <td className="px-4 py-3">
                    {l.customer ? (
                      l.customer.name
                    ) : (
                      <span className="text-[var(--mu)]">نقدي</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{fmtQty(unit, l.baseQty)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {fmtMoney(Math.round(Number(l.unitPrice) * basis * 100) / 100)}{" "}
                    <span className="text-xs text-[var(--mu)]">{suffix}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{fmtMoney(l.lineTotal)}</td>
                  <td
                    className={`px-4 py-3 font-semibold tabular-nums ${
                      l.belowCost ? "text-[var(--da)]" : ""
                    }`}
                    title={l.belowCost ? "اتباع بأقل من التكلفة" : undefined}
                  >
                    {fmtMoney(l.profit)}
                  </td>
                  <td className="px-4 py-3">
                    {l.returnedQty > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--ws)] border border-[var(--wa)]/30 px-2.5 py-0.5 text-xs font-semibold text-[var(--wa)] tabular-nums">
                        <Undo2 size={12} />
                        {fmtQty(unit, l.returnedQty)}
                      </span>
                    ) : (
                      <span className="text-[var(--mu)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <Pager
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          onPage={(p) => setFilter((f) => ({ ...f, page: p }))}
        />
      )}

      <p className="mt-2 text-xs text-[var(--mu)]">
        الربح لكل سطر محسوب قبل خصم الفاتورة (إن وُجد)، والمرتجع محسوب في صافي الكمية والإيراد والربح.
      </p>
    </section>
  );
}
