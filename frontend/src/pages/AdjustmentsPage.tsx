import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  SlidersHorizontal,
  X,
  RotateCcw,
  Loader2,
  Pencil,
  Trash2,
  PackageX,
  TrendingDown,
  Info,
} from "lucide-react";
import Combobox from "../components/Combobox";
import Confirm from "../components/Confirm";
import Modal from "../components/Modal";
import { FormActions, Pager } from "../components/ui";
import { errorMessage } from "../lib/api";
import {
  fmtDate,
  fmtMoney,
  fmtQty,
  hasExpiryDate,
  todayYmd,
  ymdOf,
} from "../lib/format";
import { fetchItems, type Item } from "../features/items/api";
import { Expiry } from "../features/items/parts";
import {
  useAdjustments,
  useDeleteAdjustment,
  useUpdateAdjustment,
  type Adjustment,
} from "../features/adjustments/api";
import AdjustmentForm from "../features/adjustments/AdjustmentForm";

type ItemLite = Pick<Item, "id" | "name">;

const DEFAULT_FILTER = { from: "", to: "", page: 1 };

const dateInputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

function EditForm({ adj, onDone }: { adj: Adjustment; onDone: () => void }) {
  const save = useUpdateAdjustment();
  const [reason, setReason] = useState(adj.reason);
  const [date, setDate] = useState(ymdOf(adj.date));
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!reason.trim()) return setError("اكتب السبب");
    try {
      await save.mutateAsync({
        id: adj.id,
        input: { reason: reason.trim(), date },
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      <p className="hint" style={{ margin: 0 }}>
        الكمية مبتتعدّلش. لو غلطت فيها امسح التسوية (الكمية هترجع للمخزن)
        وسجّلها من الأول.
      </p>
      <div>
        <label className="label">السبب</label>
        <input
          className="input full"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={150}
        />
      </div>
      <div>
        <label className="label">التاريخ</label>
        <input
          className="input full"
          type="date"
          value={date}
          max={todayYmd()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  );
}

export default function AdjustmentsPage() {
  const [item, setItem] = useState<ItemLite | null>(null);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [dialog, setDialog] = useState<
    "new" | { edit: Adjustment } | { del: Adjustment } | null
  >(null);
  const del = useDeleteAdjustment();
  const { data, isPending, isFetching, error } = useAdjustments({
    itemId: item?.id,
    ...filter,
  });
  const update = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));

  const activeFiltersCount =
    (item ? 1 : 0) + (filter.from ? 1 : 0) + (filter.to ? 1 : 0);

  function resetFilters() {
    setItem(null);
    setFilter(DEFAULT_FILTER);
  }

  const headers = [
    "التاريخ",
    "الصنف",
    "الانتهاء",
    "الكمية",
    "السبب",
    "الخسارة",
    "الإجراءات",
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
          <h2 className="text-xl font-bold m-0">التالف والمنتهي</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {data
              ? `إجمالي ${data.meta.total} تسوية مطابقة`
              : "تسويات الكميات التالفة والمنتهية"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog("new")}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          تسجيل تالف
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة التسويات
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              الصنف
            </label>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <Combobox<ItemLite>
                  value={item}
                  cacheKey="items"
                  fetcher={fetchItems}
                  getKey={(i) => i.id}
                  getLabel={(i) => i.name}
                  placeholder="كل الأصناف"
                  onChange={(i) => {
                    setItem(i);
                    update({});
                  }}
                />
              </div>
              {item && (
                <button
                  type="button"
                  title="مسح الصنف"
                  aria-label="مسح الصنف"
                  onClick={() => {
                    setItem(null);
                    update({});
                  }}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)] transition-colors"
                >
                  <X size={15} />
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
      </div>

      {/* Sum */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 shadow-xs flex items-center gap-3 sm:col-span-2">
            <span className="w-11 h-11 shrink-0 flex items-center justify-center rounded-[10px] bg-[var(--ds)] text-[var(--da)]">
              <TrendingDown size={22} />
            </span>
            <div className="min-w-0">
              <span className="block text-xs text-[var(--mu)] font-medium mb-0.5">
                إجمالي الخسارة ({data.meta.total} تسوية)
              </span>
              <span className="block text-xl font-bold tabular-nums text-[var(--da)] truncate">
                {fmtMoney(data.value)}
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
                      <div className="h-3.5 w-full max-w-[90px] rounded-[99px] bg-[var(--bd)] animate-pulse" />
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
                      <PackageX size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش تسويات
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

            {data?.items.map((a) => (
              <tr
                key={a.id}
                className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
              >
                <td className="px-4 py-3 text-[var(--mu)]">
                  {fmtDate(a.date)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/items/${a.item.id}`}
                    className="text-[var(--br)] font-bold no-underline hover:underline"
                  >
                    {a.item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {hasExpiryDate(a.batch.expiryDate) ? (
                    <Expiry iso={a.batch.expiryDate} />
                  ) : (
                    <span className="text-[var(--mu)]">بدون</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  {fmtQty(a.item.unit, a.baseQty)}
                </td>
                <td className="px-4 py-3 max-w-[240px] truncate">{a.reason}</td>
                <td className="px-4 py-3 font-bold tabular-nums text-[var(--da)]">
                  {fmtMoney(a.value)}
                </td>
                <td className="px-4 py-3 text-left">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      title="تعديل"
                      aria-label="تعديل"
                      onClick={() => setDialog({ edit: a })}
                      className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] cursor-pointer hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      aria-label="حذف"
                      onClick={() => setDialog({ del: a })}
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
        التسوية بتشيل الكمية من الباتش وبتتحسب خسارة بتكلفته. تقدر تسجّلها من
        هنا أو من زر "تسوية" جنب الباتش في صفحة الصنف.
      </div>

      {dialog === "new" && (
        <Modal title="تسجيل تالف أو منتهي" onClose={() => setDialog(null)}>
          <AdjustmentForm onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog && typeof dialog === "object" && "edit" in dialog && (
        <Modal
          title={`تعديل تسوية #${dialog.edit.id}`}
          onClose={() => setDialog(null)}
        >
          <EditForm adj={dialog.edit} onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog && typeof dialog === "object" && "del" in dialog && (
        <Confirm
          title="حذف التسوية"
          confirmLabel="حذف"
          message={`هتتمسح التسوية و${fmtQty(dialog.del.item.unit, dialog.del.baseQty)} من "${dialog.del.item.name}" هترجع للمخزن.`}
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
