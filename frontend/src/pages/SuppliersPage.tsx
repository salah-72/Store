import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { errorMessage } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { useDebounce } from "../hooks/useDebounce";
import { useSuppliers } from "../features/suppliers/api";
import SupplierForm from "../features/suppliers/SupplierForm";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "debt">("all");
  const [activeFilter, setActiveFilter] = useState<"true" | "false" | "all">(
    "true",
  );
  const debounced = useDebounce(search);

  const {
    data: suppliers,
    isPending,
    isFetching,
    error,
  } = useSuppliers(debounced, filterType === "debt", activeFilter);
  const [isCreating, setIsCreating] = useState(false);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold m-0">الموردين</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm"
        >
          + مورد جديد
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-[var(--cd)] border border-[var(--bd)] p-3.5 rounded-[10px] shadow-xs">
        <input
          className="font-[inherit] px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm w-full sm:w-64 outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors"
          placeholder="بحث باسم المورد أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="font-[inherit] px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] cursor-pointer transition-colors font-medium"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | "debt")}
        >
          <option value="all">كل الحسابات</option>
          <option value="debt">علينا ليهم فلوس بس</option>
        </select>

        <select
          className="font-[inherit] px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] cursor-pointer transition-colors font-medium"
          value={activeFilter}
          onChange={(e) =>
            setActiveFilter(e.target.value as "true" | "false" | "all")
          }
        >
          <option value="true">النشطين فقط</option>
          <option value="false">المعطّلين فقط</option>
          <option value="all">الكل (النشط والمعطل)</option>
        </select>

        {isFetching && (
          <span className="text-xs text-[var(--mu)] ms-auto">
            جاري التحديث...
          </span>
        )}
      </div>

      {/* جدول الموردين */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {[
                "المورد",
                "التليفون",
                "إجمالي التوريدات",
                "المدفوع له",
                "المتبقي علينا",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[var(--mu)]">
                  جاري التحميل...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td
                  colSpan={5}
                  className="p-10 text-center text-[var(--da)] font-semibold"
                >
                  {errorMessage(error)}
                </td>
              </tr>
            )}
            {suppliers?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[var(--mu)]">
                  مفيش موردين مطابقين للبحث
                </td>
              </tr>
            )}
            {suppliers?.map((sup) => {
              const isCleared = sup.remaining <= 0;
              return (
                <tr
                  key={sup.id}
                  onClick={() => navigate(`/suppliers/${sup.id}`)}
                  className={`border-b border-[var(--bd)] hover:bg-[var(--bs)] transition-colors cursor-pointer ${sup.isActive === false ? "opacity-60 bg-[var(--bg)]" : ""}`}
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
                  <td className="px-4 py-3 text-[var(--mu)] font-medium">
                    {sup.phone || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {fmtMoney(sup.totalPurchased)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {fmtMoney(sup.totalPaid)}
                  </td>
                  <td className="px-4 py-3">
                    {isCleared ? (
                      <span className="inline-block rounded-[99px] bg-[var(--bs)] px-3 py-1 text-xs font-semibold text-[var(--br)]">
                        مسدد
                      </span>
                    ) : (
                      <span className="font-bold text-[var(--da)]">
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
