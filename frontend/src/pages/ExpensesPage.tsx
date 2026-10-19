import { useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Loader2,
  Pencil,
  Trash2,
  ReceiptText,
  Wallet,
  Info,
} from "lucide-react";
import Confirm from "../components/Confirm";
import Modal from "../components/Modal";
import { Pager } from "../components/ui";
import { useDebounce } from "../hooks/useDebounce";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney } from "../lib/format";
import {
  useDeleteExpense,
  useExpenses,
  type Expense,
} from "../features/expenses/api";
import ExpenseForm from "../features/expenses/ExpenseForm";

const DEFAULT_FILTER = { category: "", search: "", from: "", to: "", page: 1 };

const dateInputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

const chip = (selected: boolean) =>
  `font-[inherit] px-3 py-1.5 rounded-[99px] border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
    selected
      ? "bg-[var(--br)] border-[var(--br)] text-white shadow-sm"
      : "bg-[var(--bg)] border-[var(--bd)] text-[var(--mu)] hover:bg-[var(--bs)] hover:text-[var(--br)] hover:border-[var(--br)]"
  }`;

export default function ExpensesPage() {
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const debounced = useDebounce(filter.search, 300);
  const [dialog, setDialog] = useState<
    "new" | { edit: Expense } | { del: Expense } | null
  >(null);
  const del = useDeleteExpense();
  const { data, isPending, isFetching, error } = useExpenses({
    ...filter,
    search: debounced,
  });
  const update = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));

  const activeFiltersCount =
    (filter.category ? 1 : 0) +
    (filter.search.trim() ? 1 : 0) +
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0);

  const headers = ["التاريخ", "التصنيف", "المبلغ", "ملاحظة", "الإجراءات"];

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
          <h2 className="text-xl font-bold m-0">المصاريف</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {data
              ? `إجمالي ${data.meta.total} مصروف مطابق`
              : "المصاريف الجانبية للمحل"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog("new")}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          مصروف
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة وبحث المصاريف
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              بحث في الملاحظات
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mu)] pointer-events-none"
              />
              <input
                className="font-[inherit] w-full px-3 py-2 pr-9 pl-9 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors"
                placeholder="بحث في الملاحظات..."
                value={filter.search}
                onChange={(e) => update({ search: e.target.value })}
              />
              {filter.search && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  title="مسح البحث"
                  onClick={() => update({ search: "" })}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full border-0 bg-transparent text-[var(--mu)] cursor-pointer hover:bg-[var(--bd)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

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

        {/* Categories */}
        {data && data.byCategory.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              التصنيف
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => update({ category: "" })}
                className={chip(filter.category === "")}
              >
                الكل
              </button>
              {data.byCategory.map((c) => (
                <button
                  key={c.category}
                  type="button"
                  onClick={() =>
                    update({
                      category:
                        filter.category === c.category ? "" : c.category,
                    })
                  }
                  className={chip(filter.category === c.category)}
                >
                  {c.category} · {fmtMoney(c.amount)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sum */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 shadow-xs flex items-center gap-3 sm:col-span-2 lg:col-span-2">
            <span className="w-11 h-11 shrink-0 flex items-center justify-center rounded-[10px] bg-[var(--ws)] text-[var(--wa)]">
              <Wallet size={22} />
            </span>
            <div className="min-w-0">
              <span className="block text-xs text-[var(--mu)] font-medium mb-0.5">
                إجمالي المصاريف
                {filter.category ? ` (${filter.category})` : ""} —{" "}
                {data.meta.total} مصروف
              </span>
              <span className="block text-xl font-bold tabular-nums text-[var(--wa)] truncate">
                {fmtMoney(data.sum)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-semibold ${
                    i === headers.length - 1 ? "text-left" : ""
                  }`}
                >
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
                  colSpan={5}
                  className="p-10 text-center text-[var(--da)] font-semibold"
                >
                  {errorMessage(error)}
                </td>
              </tr>
            )}

            {!isPending && !error && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[var(--mu)]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                      <ReceiptText size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش مصاريف
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilter(DEFAULT_FILTER)}
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

            {data?.items.map((x) => (
              <tr
                key={x.id}
                className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
              >
                <td className="px-4 py-3 text-[var(--mu)]">
                  {fmtDate(x.date)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-[99px] bg-[var(--ws)] text-[var(--wa)] px-2.5 py-0.5 text-xs font-semibold">
                    {x.category}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  {fmtMoney(x.amount)}
                </td>
                <td className="px-4 py-3 text-[var(--mu)] max-w-[280px] truncate">
                  {x.note || "—"}
                </td>
                <td className="px-4 py-3 text-left">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      title="تعديل"
                      aria-label="تعديل"
                      onClick={() => setDialog({ edit: x })}
                      className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] cursor-pointer hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      aria-label="حذف"
                      onClick={() => setDialog({ del: x })}
                      className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--da)] cursor-pointer hover:border-[var(--da)] hover:bg-[var(--ds)] transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
        المصاريف الجانبية (إيجار، كهرباء، مرتبات...) بتتخصم من الربح في
        الإحصائيات.
      </div>

      {dialog === "new" && (
        <Modal title="مصروف جديد" onClose={() => setDialog(null)}>
          <ExpenseForm onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog && typeof dialog === "object" && "edit" in dialog && (
        <Modal title="تعديل مصروف" onClose={() => setDialog(null)}>
          <ExpenseForm expense={dialog.edit} onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog && typeof dialog === "object" && "del" in dialog && (
        <Confirm
          title="حذف المصروف"
          confirmLabel="حذف"
          message={`هيتمسح مصروف ${dialog.del.category} بمبلغ ${fmtMoney(dialog.del.amount)}.`}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await del.mutateAsync(dialog.del.id);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
