import { useState, type FormEvent } from "react";
import Modal from "../components/Modal";
import { errorMessage } from "../lib/api";
import {
  daysUntil,
  fmtDate,
  fmtMoney,
  fmtQty,
  NEAR_EXPIRY_DAYS,
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
import ItemForm from "../features/items/ItemForm";
import ItemDetails from "../features/items/ItemDetails";

function Badges({ item }: { item: Item }) {
  const list: { text: string; cls: string }[] = [];
  const red = "bg-[var(--ds)] text-[var(--da)]",
    amber = "bg-[var(--ws)] text-[var(--wa)]";
  if (item.stock === 0) list.push({ text: "نافد", cls: red });
  else {
    if (item.expiredStock > 0) list.push({ text: "منتهي", cls: red });
    if (item.lowStock) list.push({ text: "ناقص", cls: amber });
    if (item.nearestExpiry && daysUntil(item.nearestExpiry) <= NEAR_EXPIRY_DAYS)
      list.push({ text: "قرب ينتهي", cls: amber });
  }
  if (list.length === 0)
    list.push({ text: "متاح", cls: "bg-[var(--bs)] text-[var(--br)]" });
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((b) => (
        <span
          key={b.text}
          className={`rounded-[99px] px-2 py-0.5 text-xs font-semibold ${b.cls}`}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

function Expiry({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-[var(--mu)]">—</span>;
  const d = daysUntil(iso);
  return (
    <span
      className={
        d < 0
          ? "text-[var(--da)] font-bold"
          : d <= NEAR_EXPIRY_DAYS
            ? "text-[var(--wa)] font-bold"
            : ""
      }
    >
      {fmtDate(iso)}
    </span>
  );
}

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Omit<ItemsFilter, "search">>({
    unit: "",
    active: "true",
    lowStock: false,
    page: 1,
  });
  const debounced = useDebounce(search);
  const { data, isPending, isFetching, error } = useItems({
    ...filter,
    search: debounced,
  });
  const setActive = useSetItemActive();

  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const update = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));

  async function toggle(item: Item) {
    setActionError("");
    try {
      await setActive.mutateAsync({ id: item.id, isActive: !item.isActive });
    } catch (e) {
      setActionError(errorMessage(e));
    }
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

      {/* شريط العنوان والأزرار */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold m-0">الأصناف</h2>
        <button
          onClick={() => setEditing("new")}
          className="font-[inherit] px-3.5 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity"
        >
          + صنف جديد
        </button>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="font-[inherit] px-3 py-1.5 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-[var(--tx)] text-sm w-64 outline-none focus:border-[var(--br)]"
          placeholder="ابحث باسم الصنف..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setFilter((f) => ({ ...f, page: 1 }));
          }}
        />
        <select
          className="font-[inherit] px-3 py-1.5 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)]"
          value={filter.unit}
          onChange={(e) => update({ unit: e.target.value as Unit | "" })}
        >
          <option value="">كل الأنواع</option>
          {(Object.keys(unitLabel) as Unit[]).map((u) => (
            <option key={u} value={u}>
              {unitLabel[u]}
            </option>
          ))}
        </select>
        <select
          className="font-[inherit] px-3 py-1.5 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)]"
          value={filter.active}
          onChange={(e) =>
            update({ active: e.target.value as ItemsFilter["active"] })
          }
        >
          <option value="true">النشطة</option>
          <option value="false">المعطّلة</option>
          <option value="all">الكل</option>
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer text-[var(--tx)] select-none">
          <input
            type="checkbox"
            checked={filter.lowStock}
            onChange={(e) => update({ lowStock: e.target.checked })}
            className="accent-[var(--br)]"
          />
          الناقص بس
        </label>
        {isFetching && (
          <span className="text-xs text-[var(--mu)]">جاري التحديث...</span>
        )}
      </div>

      {actionError && (
        <p className="mb-3 rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] px-3 py-2 text-sm text-[var(--da)]">
          {actionError}
        </p>
      )}

      {/* جدول عرض الأصناف */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px]">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {[
                "الصنف",
                "السعر",
                "الكمية المتاحة",
                "أقرب انتهاء",
                "الحالة",
                "",
              ].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--mu)]">
                  جاري التحميل...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--da)]">
                  {errorMessage(error)}
                </td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--mu)]">
                  مفيش أصناف مطابقة
                </td>
              </tr>
            )}
            {data?.items.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-[var(--bd)] hover:bg-[var(--bs)] transition-colors ${item.isActive ? "" : "opacity-60"}`}
              >
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => setViewing(item.id)}
                    className="font-semibold text-[var(--br)] hover:underline bg-transparent border-0 cursor-pointer p-0 font-[inherit]"
                  >
                    {item.name}
                  </button>
                  {!item.isActive && (
                    <span className="ms-2 rounded-[99px] bg-[var(--bd)] px-2 py-0.5 text-[11px] text-[var(--mu)]">
                      معطّل
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {fmtMoney(item.price)}{" "}
                  <span className="text-xs text-[var(--mu)]">
                    {priceSuffix[item.unit]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {fmtQty(item.unit, item.sellable)}
                </td>
                <td className="px-3 py-2.5">
                  <Expiry iso={item.nearestExpiry} />
                </td>
                <td className="px-3 py-2.5">
                  <Badges item={item} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-left">
                  <button
                    onClick={() => setEditing(item)}
                    className="px-2 py-1 rounded-[6px] text-xs font-medium text-[var(--tx)] hover:bg-[var(--bd)] bg-transparent border-0 cursor-pointer"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => toggle(item)}
                    disabled={setActive.isPending}
                    className="px-2 py-1 rounded-[6px] text-xs font-medium text-[var(--mu)] hover:bg-[var(--bd)] bg-transparent border-0 cursor-pointer ms-1"
                  >
                    {item.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* شريط التنقل بين الصفحات (Pagination) */}
      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={filter.page <= 1}
            onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}
            className="px-3 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] disabled:opacity-40 cursor-pointer"
          >
            السابق
          </button>
          <span className="text-[var(--mu)] text-xs">
            صفحة {data.meta.page} من {data.meta.totalPages} ({data.meta.total}{" "}
            صنف)
          </span>
          <button
            disabled={filter.page >= data.meta.totalPages}
            onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}
            className="px-3 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] disabled:opacity-40 cursor-pointer"
          >
            التالي
          </button>
        </div>
      )}

      {/* نوافذ التعديل والعرض المنبثقة */}
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
      {viewing !== null && (
        <Modal title="تفاصيل الصنف" onClose={() => setViewing(null)} wide>
          <ItemDetails id={viewing} />
        </Modal>
      )}
    </div>
  );
}
