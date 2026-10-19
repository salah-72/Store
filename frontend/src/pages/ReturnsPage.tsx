import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  SlidersHorizontal,
  RotateCcw,
  Loader2,
  Undo2,
  Info,
} from "lucide-react";
import { Pager } from "../components/ui";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney } from "../lib/format";
import {
  returnCfg,
  useReturns,
  type ReturnKind,
} from "../features/returns/api";

const DEFAULT_FILTER = { from: "", to: "", page: 1 };

const dateInputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

export default function ReturnsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind: ReturnKind =
    params.get("kind") === "purchase" ? "purchase" : "sale";
  const cfg = returnCfg[kind];
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const { data, isPending, isFetching, error } = useReturns({
    kind,
    ...filter,
  });
  const update = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));

  const activeFiltersCount = (filter.from ? 1 : 0) + (filter.to ? 1 : 0);

  const headers = [
    "المرتجع",
    cfg.partyLabel,
    cfg.invoice,
    "التاريخ",
    "البنود",
    "القيمة",
    cfg.cashLabel,
  ];

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
          <h2 className="text-xl font-bold m-0">المرتجعات</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {data
              ? `إجمالي ${data.meta.total} مرتجع مطابق`
              : "مرتجعات العملاء والموردين"}
          </p>
        </div>
        <Link
          to={`/returns/new?kind=${kind}`}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2 no-underline"
        >
          <Plus size={18} />
          مرتجع جديد
        </Link>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        className="inline-flex items-center gap-1 p-1 mb-5 bg-[var(--bg)] border border-[var(--bd)] rounded-[10px]"
      >
        {(["sale", "purchase"] as const).map((k) => {
          const selected = kind === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setParams({ kind: k });
                setFilter((f) => ({ ...f, page: 1 }));
              }}
              className={`font-[inherit] px-4 py-1.5 rounded-[7px] border-0 text-sm font-semibold cursor-pointer transition-all whitespace-nowrap ${
                selected
                  ? "bg-[var(--cd)] text-[var(--br)] shadow-sm"
                  : "bg-transparent text-[var(--mu)] hover:text-[var(--tx)]"
              }`}
            >
              {returnCfg[k].title}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة المرتجعات
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
              onClick={() => setFilter(DEFAULT_FILTER)}
              className="font-[inherit] flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[var(--bd)] bg-transparent text-[var(--da)] text-xs font-semibold cursor-pointer hover:bg-[var(--ds)] transition-colors"
            >
              <RotateCcw size={13} />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {headers.map((h) => (
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
                  {headers.map((h) => (
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
                      <Undo2 size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش مرتجعات
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {data?.items.map((r) => {
              const party = r[cfg.partyKey];
              const inv = r[cfg.invoiceKey];
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/returns/${kind}/${r.id}`)}
                  className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-bold">#{r.id}</td>
                  <td className="px-4 py-3 font-semibold">
                    {party ? (
                      party.name
                    ) : (
                      <span className="text-[var(--mu)] font-medium">نقدي</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {inv ? (
                      `#${inv}`
                    ) : (
                      <span className="text-[var(--mu)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--mu)]">
                    {fmtDate(r.date)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--mu)] font-medium">
                    {r.linesCount}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(r.total)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {Number(r.cashRefund) ? (
                      fmtMoney(r.cashRefund)
                    ) : (
                      <span className="text-[var(--mu)]">—</span>
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
        المرتجع بيرجّع الكمية للمخزن (مرتجع العميل) أو بيشيلها منه (مرتجع
        المورد)، وقيمته بتتخصم من حساب الطرف إلا لو اتردّت كاش.
      </div>
    </div>
  );
}
