import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  SlidersHorizontal,
  X,
  RotateCcw,
  Loader2,
  FileX2,
  CheckCircle2,
  Info,
  Banknote,
} from "lucide-react";
import Combobox from "../components/Combobox";
import { Pager } from "../components/ui";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney } from "../lib/format";
import { fetchParties, type Party } from "../features/parties/api";
import { useSales } from "../features/sales/api";

type CustomerLite = Pick<Party, "id" | "name">;

const DEFAULT_FILTER = { cash: false, from: "", to: "", page: 1 };

const HEADERS = [
  "الفاتورة",
  "العميل",
  "التاريخ",
  "البنود",
  "الإجمالي",
  "المدفوع",
  "المتبقي على الفاتورة",
];

const dateInputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

export default function SalesPage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const { data, isPending, isFetching, error } = useSales({
    ...filter,
    customerId: customer?.id,
  });

  const update = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));

  const activeFiltersCount =
    (customer ? 1 : 0) +
    (filter.cash ? 1 : 0) +
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0);

  function resetFilters() {
    setCustomer(null);
    setFilter(DEFAULT_FILTER);
  }

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{`
        :root {
          --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
        }
        @media(prefers-color-scheme: dark){
          :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold m-0">المبيعات</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {data
              ? `إجمالي ${data.meta.total} فاتورة مطابقة`
              : "فواتير البيع للعملاء"}
          </p>
        </div>
        <Link
          to="/pos"
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2 no-underline"
        >
          <Plus size={18} />
          فاتورة بيع
        </Link>
      </div>

      {/* Filters Card */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة الفواتير
            </span>
            {activeFiltersCount > 0 && (
              <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
                {activeFiltersCount} فلتر مفعّل
              </span>
            )}
            {isFetching && !isPending && (
              <span className="flex items-center gap-1 text-xs text-[var(--mu)]">
                <Loader2 size={13} className="animate-spin" />
                جاري التحديث...
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-[inherit] flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[var(--bd)] bg-transparent text-[var(--da)] text-xs font-semibold cursor-pointer hover:bg-[var(--ds)] transition-colors"
            >
              <RotateCcw size={13} />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Customer */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              العميل
            </label>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <Combobox<CustomerLite>
                  value={customer}
                  cacheKey="customers"
                  fetcher={(s) => fetchParties("customers", s)}
                  getKey={(c) => c.id}
                  getLabel={(c) => c.name}
                  placeholder="كل العملاء"
                  onChange={(c) => {
                    setCustomer(c);
                    update({ cash: false });
                  }}
                />
              </div>
              {customer && (
                <button
                  type="button"
                  title="مسح العميل"
                  aria-label="مسح العميل"
                  onClick={() => {
                    setCustomer(null);
                    update({});
                  }}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)] transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Cash only */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              نوع البيع
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={filter.cash}
              disabled={!!customer}
              onClick={() => update({ cash: !filter.cash })}
              className={`font-[inherit] w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] border text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                filter.cash
                  ? "bg-[var(--bs)] border-[var(--br)] text-[var(--br)]"
                  : "bg-[var(--bg)] border-[var(--bd)] text-[var(--tx)] hover:bg-[var(--bs)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <Banknote size={15} />
                النقدي بس
              </span>
              <span
                className={`relative inline-block w-9 h-5 rounded-[99px] transition-colors ${
                  filter.cash ? "bg-[var(--br)]" : "bg-[var(--bd)]"
                }`}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
                  style={{ right: filter.cash ? 18 : 2 }}
                />
              </span>
            </button>
          </div>

          {/* From */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              من تاريخ
            </label>
            <input
              type="date"
              className={dateInputClass}
              value={filter.from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              إلى تاريخ
            </label>
            <input
              type="date"
              className={dateInputClass}
              value={filter.to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {HEADERS.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--bd)]">
                  {HEADERS.map((h) => (
                    <td key={h} className="px-4 py-4">
                      <div className="h-3.5 w-full max-w-[100px] rounded-[99px] bg-[var(--bd)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isPending && error && (
              <tr>
                <td
                  colSpan={7}
                  className="p-10 text-center text-[var(--da)] font-semibold"
                >
                  {errorMessage(error)}
                </td>
              </tr>
            )}

            {!isPending && !error && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[var(--mu)]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                      <FileX2 size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش فواتير بيع
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="font-[inherit] flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[var(--br)] bg-transparent text-[var(--br)] text-xs font-semibold cursor-pointer hover:bg-[var(--bs)] transition-colors"
                      >
                        <RotateCcw size={13} />
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {data?.items.map((s) => {
              const left =
                Math.round((Number(s.total) - Number(s.paid)) * 100) / 100;
              return (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/sales/${s.id}`)}
                  className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-bold">#{s.id}</td>
                  <td className="px-4 py-3 font-semibold">
                    {s.customer ? (
                      s.customer.name
                    ) : (
                      <span className="text-[var(--mu)] font-medium">نقدي</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--mu)]">
                    {fmtDate(s.date)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--mu)] font-medium">
                    {s.linesCount}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(s.total)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(s.paid)}
                  </td>
                  <td className="px-4 py-3">
                    {left <= 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2.5 py-0.5 text-xs font-semibold">
                        <CheckCircle2 size={13} />
                        مسدد
                      </span>
                    ) : (
                      <span className="font-bold tabular-nums text-[var(--da)]">
                        {fmtMoney(left)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <Pager
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            onPage={(p) => setFilter((f) => ({ ...f, page: p }))}
          />
        </div>
      )}

      {/* Hint */}
      <div className="mt-5 flex items-start gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)] px-4 py-2.5 text-xs text-[var(--mu)] font-medium leading-relaxed">
        <Info size={15} className="shrink-0 mt-0.5" />
        المتبقي ده على الفاتورة وقت البيع بس. دفعات العميل بعد كده بتظهر في كشف
        حسابه.
      </div>
    </div>
  );
}
