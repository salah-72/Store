import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Pencil,
  Power,
  CheckCircle2,
  X,
  RotateCcw,
  PackageSearch,
  Loader2,
  Eye,
} from "lucide-react";
import Modal from "../components/Modal";
import { Pager } from "../components/ui";
import { errorMessage } from "../lib/api";
import {
  fmtMoney,
  fmtQty,
  priceSuffix,
  unitLabel,
  type Unit,
} from "../lib/format";
import { useDebounce } from "../hooks/useDebounce";
import {
  useItems,
  useSetItemActive,
  type Item,
  type ItemsFilter,
} from "../features/items/api";
import { Expiry, StatusBadges, unitName } from "../features/items/parts";
import ItemForm from "../features/items/ItemForm";

type FilterState = Omit<ItemsFilter, "search">;

const DEFAULT_FILTER: FilterState = {
  unit: "",
  active: "true",
  lowStock: false,
  page: 1,
};

const STATUS_OPTIONS: { value: ItemsFilter["active"]; label: string }[] = [
  { value: "true", label: "النشطة" },
  { value: "false", label: "المعطّلة" },
  { value: "all", label: "الكل" },
];

const HEADERS = [
  "الصنف",
  "الوحدة",
  "الكمية المتاحة",
  "سعر البيع",
  "أقرب انتهاء",
  "الحالة",
  "الإجراءات",
];

export default function ItemsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  const debounced = useDebounce(search);

  const { data, isPending, isFetching, error } = useItems({
    ...filter,
    search: debounced,
  });

  const setActive = useSetItemActive();

  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [actionError, setActionError] = useState("");

  const update = (patch: Partial<FilterState>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));

  const activeFiltersCount =
    (search.trim() ? 1 : 0) +
    (filter.unit ? 1 : 0) +
    (filter.active !== "true" ? 1 : 0) +
    (filter.lowStock ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setFilter(DEFAULT_FILTER);
  }

  async function toggle(item: Item) {
    setActionError("");

    try {
      await setActive.mutateAsync({
        id: item.id,
        isActive: !item.isActive,
      });
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const units = Object.keys(unitLabel) as Unit[];

  const chip = (selected: boolean) =>
    `font-[inherit] px-3 py-1.5 rounded-[99px] border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
      selected
        ? "bg-[var(--br)] border-[var(--br)] text-white shadow-sm"
        : "bg-[var(--bg)] border-[var(--bd)] text-[var(--mu)] hover:bg-[var(--bs)] hover:text-[var(--br)] hover:border-[var(--br)]"
    }`;

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
          <h2 className="text-xl font-bold m-0">الأصناف</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {data
              ? `إجمالي ${data.meta.total} صنف مطابق`
              : "إدارة الأصناف والمخزون والأسعار"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          صنف جديد
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة وبحث الأصناف
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

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] gap-4">
          {/* Search */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              بحث بالاسم
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mu)] pointer-events-none"
              />
              <input
                className="font-[inherit] w-full px-3 py-2 pr-9 pl-9 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors"
                placeholder="اكتب اسم الصنف..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFilter((f) => ({ ...f, page: 1 }));
                }}
              />
              {search && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  title="مسح البحث"
                  onClick={() => {
                    setSearch("");
                    setFilter((f) => ({ ...f, page: 1 }));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full border-0 bg-transparent text-[var(--mu)] cursor-pointer hover:bg-[var(--bd)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Status + Low stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--mu)]">
                حالة الصنف
              </label>
              <div
                role="radiogroup"
                className="flex items-center gap-1 p-1 bg-[var(--bg)] border border-[var(--bd)] rounded-[10px]"
              >
                {STATUS_OPTIONS.map((o) => {
                  const selected = filter.active === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => update({ active: o.value })}
                      className={`font-[inherit] flex-1 px-3 py-1.5 rounded-[7px] border-0 text-xs font-semibold cursor-pointer transition-all ${
                        selected
                          ? "bg-[var(--cd)] text-[var(--br)] shadow-sm"
                          : "bg-transparent text-[var(--mu)] hover:text-[var(--tx)]"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--mu)]">
                المخزون
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={filter.lowStock}
                onClick={() => update({ lowStock: !filter.lowStock })}
                className={`font-[inherit] w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] border text-xs font-semibold cursor-pointer transition-colors ${
                  filter.lowStock
                    ? "bg-[var(--ws)] border-[var(--wa)] text-[var(--wa)]"
                    : "bg-[var(--bg)] border-[var(--bd)] text-[var(--tx)] hover:bg-[var(--bs)]"
                }`}
              >
                <span>الأصناف الناقصة فقط</span>
                <span
                  className={`relative inline-block w-9 h-5 rounded-[99px] transition-colors ${
                    filter.lowStock ? "bg-[var(--wa)]" : "bg-[var(--bd)]"
                  }`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
                    style={{ right: filter.lowStock ? 18 : 2 }}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Unit chips */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--mu)]">
            نوع الوحدة
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => update({ unit: "" })}
              className={chip(filter.unit === "")}
            >
              كل الأنواع
            </button>
            {units.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => update({ unit: u })}
                className={chip(filter.unit === u)}
              >
                {unitLabel[u]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-[8px] border border-[var(--bd)] bg-[var(--ds)] px-4 py-2.5 text-sm text-[var(--da)] font-semibold"
        >
          <span>{actionError}</span>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setActionError("")}
            className="w-6 h-6 flex items-center justify-center rounded-full border-0 bg-transparent text-[var(--da)] cursor-pointer hover:opacity-70"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {HEADERS.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-semibold ${
                    i === HEADERS.length - 1 ? "text-left" : ""
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
                  {HEADERS.map((h) => (
                    <td key={h} className="px-4 py-4">
                      <div className="h-3.5 w-full max-w-[110px] rounded-[99px] bg-[var(--bd)] animate-pulse" />
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
                      <PackageSearch size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش أصناف مطابقة للبحث أو الفلتر
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

            {data?.items.map((item) => {
              const rowBusy =
                setActive.isPending && setActive.variables?.id === item.id;

              return (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/items/${item.id}`)}
                  className={`border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors cursor-pointer ${
                    item.isActive ? "" : "opacity-60 bg-[var(--bg)]"
                  }`}
                >
                  {/* Item name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--tx)]">
                        {item.name}
                      </span>
                      {!item.isActive && (
                        <span className="rounded-[99px] bg-[var(--bd)] px-2.5 py-0.5 text-[11px] text-[var(--mu)] font-semibold">
                          معطّل
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Unit */}
                  <td className="px-4 py-3 text-[var(--mu)] font-medium">
                    {unitName[item.unit]}
                  </td>

                  {/* Available quantity */}
                  <td className="px-4 py-3 font-semibold tabular-nums text-[var(--tx)]">
                    {fmtQty(item.unit, item.sellable)}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    <span className="font-semibold tabular-nums text-[var(--tx)]">
                      {fmtMoney(item.price)}
                    </span>
                    <span> </span>
                    <span className="me-1 text-xs text-[var(--mu)]">
                      {priceSuffix[item.unit]}
                    </span>
                  </td>

                  {/* Expiry */}
                  <td className="px-4 py-3 text-[var(--mu)]">
                    <Expiry iso={item.nearestExpiry} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadges item={item} />
                  </td>

                  {/* Actions */}
                  <td
                    className="whitespace-nowrap px-4 py-3 text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        title="عرض التفاصيل"
                        aria-label="عرض التفاصيل"
                        onClick={() => navigate(`/items/${item.id}`)}
                        className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        title="تعديل"
                        aria-label="تعديل"
                        onClick={() => setEditing(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] cursor-pointer hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        title={item.isActive ? "تعطيل" : "تفعيل"}
                        aria-label={item.isActive ? "تعطيل" : "تفعيل"}
                        disabled={setActive.isPending}
                        onClick={() => toggle(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-[8px] border bg-[var(--cd)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          item.isActive
                            ? "border-[var(--bd)] text-[var(--da)] hover:bg-[var(--ds)] hover:border-[var(--da)]"
                            : "border-[var(--bd)] text-[var(--br)] hover:bg-[var(--bs)] hover:border-[var(--br)]"
                        }`}
                      >
                        {rowBusy ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : item.isActive ? (
                          <Power size={15} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                      </button>
                    </div>
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

      {/* Create / Edit modal */}
      {editing && (
        <Modal
          title={editing === "new" ? "صنف جديد" : `تعديل: ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <ItemForm
            item={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
