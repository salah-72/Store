import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Loader2,
  Truck,
  CheckCircle2,
} from "lucide-react";
import Modal from "../components/Modal";
import { errorMessage } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { useDebounce } from "../hooks/useDebounce";
import { useSuppliers } from "../features/suppliers/api";
import SupplierForm from "../features/suppliers/SupplierForm";

type DebtFilter = "all" | "debt";
type ActiveFilter = "true" | "false" | "all";

const DEBT_OPTIONS: { value: DebtFilter; label: string }[] = [
  { value: "all", label: "كل الحسابات" },
  { value: "debt", label: "علينا ليهم فلوس بس" },
];

const ACTIVE_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "true", label: "النشطين" },
  { value: "false", label: "المعطّلين" },
  { value: "all", label: "الكل" },
];

const HEADERS = [
  "المورد",
  "التليفون",
  "إجمالي التوريدات",
  "المدفوع له",
  "المتبقي علينا",
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="flex items-center gap-1 p-1 bg-[var(--bg)] border border-[var(--bd)] rounded-[10px]"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`font-[inherit] flex-1 px-3 py-1.5 rounded-[7px] border-0 text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
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
  );
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<DebtFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("true");
  const debounced = useDebounce(search);

  const {
    data: suppliers,
    isPending,
    isFetching,
    error,
  } = useSuppliers(debounced, filterType === "debt", activeFilter);
  const [isCreating, setIsCreating] = useState(false);

  const activeFiltersCount =
    (search.trim() ? 1 : 0) +
    (filterType !== "all" ? 1 : 0) +
    (activeFilter !== "true" ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setFilterType("all");
    setActiveFilter("true");
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

      {/* الشريط العلوي */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold m-0">الموردين</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {suppliers
              ? `إجمالي ${suppliers.length} مورد مطابق`
              : "إدارة الموردين وحساباتهم"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          مورد جديد
        </button>
      </div>

      {/* الفلاتر */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة وبحث الموردين
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              بحث
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mu)] pointer-events-none"
              />
              <input
                className="font-[inherit] w-full px-3 py-2 pr-9 pl-9 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors"
                placeholder="باسم المورد أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  title="مسح البحث"
                  onClick={() => setSearch("")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full border-0 bg-transparent text-[var(--mu)] cursor-pointer hover:bg-[var(--bd)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              الحساب
            </label>
            <Segmented
              options={DEBT_OPTIONS}
              value={filterType}
              onChange={setFilterType}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              حالة المورد
            </label>
            <Segmented
              options={ACTIVE_OPTIONS}
              value={activeFilter}
              onChange={setActiveFilter}
            />
          </div>
        </div>
      </div>

      {/* جدول الموردين */}
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
                  colSpan={5}
                  className="p-10 text-center text-[var(--da)] font-semibold"
                >
                  {errorMessage(error)}
                </td>
              </tr>
            )}

            {!isPending && !error && suppliers?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[var(--mu)]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                      <Truck size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش موردين مطابقين للبحث
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

            {suppliers?.map((sup) => {
              const isCleared = sup.remaining <= 0;
              return (
                <tr
                  key={sup.id}
                  onClick={() => navigate(`/suppliers/${sup.id}`)}
                  className={`border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors cursor-pointer ${
                    sup.isActive === false ? "opacity-60 bg-[var(--bg)]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-[var(--tx)]">
                      {sup.name}
                    </span>
                    {sup.isActive === false && (
                      <span className="ms-2 rounded-[99px] bg-[var(--bd)] px-2 py-0.5 text-[11px] text-[var(--mu)] font-semibold">
                        معطّل
                      </span>
                    )}
                  </td>
                  <td
                    dir="ltr"
                    className="px-4 py-3 text-start text-[var(--mu)] font-medium tabular-nums"
                  >
                    {sup.phone || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(sup.totalPurchased)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(sup.totalPaid)}
                  </td>
                  <td className="px-4 py-3">
                    {isCleared ? (
                      <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--bs)] px-2.5 py-0.5 text-xs font-semibold text-[var(--br)]">
                        <CheckCircle2 size={13} />
                        مسدد
                      </span>
                    ) : (
                      <span className="font-bold tabular-nums text-[var(--da)]">
                        {fmtMoney(sup.remaining)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isCreating && (
        <Modal title="مورد جديد" onClose={() => setIsCreating(false)}>
          <SupplierForm onDone={() => setIsCreating(false)} />
        </Modal>
      )}
    </div>
  );
}
