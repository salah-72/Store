import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Undo2, X } from "lucide-react";
import { Pager } from "../../components/ui";
import { fmtDate, fmtMoney, fmtQty } from "../../lib/format";
import type { Unit } from "../../lib/format";
import { useItemPurchases } from "./api";
import { dateInputClass, Stat } from "./ItemSalesHistory";
import { Expiry } from "./parts";

const headers = [
  "الفاتورة",
  "التاريخ",
  "المورد",
  "الكمية",
  "الصلاحية",
  "سعر الشراء",
  "الإجمالي",
  "مرتجع",
];

export default function ItemPurchasesHistory({
  itemId,
  unit,
}: {
  itemId: number;
  unit: Unit;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState({ page: 1, from: "", to: "" });
  const { data, isLoading, isError, isFetching } = useItemPurchases(
    itemId,
    filter,
  );
  const set = (p: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...p }));
  const hasFilter = !!(filter.from || filter.to);
  const s = data?.summary;
  const basis = data?.item.priceBasis ?? (unit === "PIECE" ? 1 : 1000);
  const suffix =
    unit === "PIECE" ? "للقطعة" : unit === "GRAM" ? "للكيلو" : "للتر";
  // متوسط سعر الشراء للفترة (قبل خصم الفواتير)
  const avgCost =
    s && s.boughtQty > 0 ? (Number(s.boughtCost) / s.boughtQty) * basis : null;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-end gap-3 mb-3">
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
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(122px,1fr))] gap-2.5 mb-3">
          <Stat label="عدد الفواتير" value={String(s.invoices)} />
          <Stat label="الكمية المشتراة" value={fmtQty(unit, s.boughtQty)} />
          <Stat label="إجمالي المشتريات" value={fmtMoney(s.boughtCost)} />
          <Stat
            label={`متوسط سعر الشراء`}
            value={
              avgCost === null
                ? "—"
                : `${fmtMoney(Math.round(avgCost * 100) / 100)} ${suffix}`
            }
          />
          <Stat
            label="مرتجع للمورد"
            value={
              s.returnedQty > 0
                ? `${fmtQty(unit, s.returnedQty)} · ${fmtMoney(s.returnedValue)}`
                : "لا يوجد"
            }
            tone={s.returnedQty > 0 ? "bad" : undefined}
          />
          <Stat label="صافي الكمية" value={fmtQty(unit, s.netQty)} />
          <Stat label="صافي التكلفة" value={fmtMoney(s.netCost)} />
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
                <td
                  colSpan={headers.length}
                  className="p-10 text-center text-[var(--mu)]"
                >
                  جاري التحميل...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-10 text-center text-[var(--da)] font-semibold"
                >
                  تعذر تحميل سجل المشتريات
                </td>
              </tr>
            ) : !data || data.lines.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="p-10 text-center text-[var(--mu)] font-semibold"
                >
                  {hasFilter
                    ? "مفيش مشتريات للصنف ده في الفترة دي"
                    : "الصنف ده لسه ما اتشتراش"}
                </td>
              </tr>
            ) : (
              data.lines.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => navigate(`/purchases/${l.purchaseId}`)}
                  className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/purchases/${l.purchaseId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-[var(--br)] no-underline hover:underline tabular-nums"
                    >
                      #{l.purchaseId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--mu)] tabular-nums">
                    {fmtDate(l.date)}
                  </td>
                  <td className="px-4 py-3">{l.supplier.name}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtQty(unit, l.baseQty)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {l.hasExpiry ? (
                      <Expiry iso={l.expiryDate} />
                    ) : (
                      <span className="text-[var(--mu)]">بدون صلاحية</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {fmtMoney(
                      Math.round(Number(l.unitCost) * basis * 100) / 100,
                    )}{" "}
                    <span className="text-xs text-[var(--mu)]">{suffix}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(l.lineTotal)}
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
        إجمالي السطر قبل خصم الفاتورة (إن وُجد). المرتجع للمورد بيتخصم من صافي الكمية والتكلفة.
      </p>
    </section>
  );
}
