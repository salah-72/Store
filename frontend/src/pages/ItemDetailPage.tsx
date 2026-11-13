import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Pencil,
  Boxes,
  ShoppingCart,
  AlertTriangle,
  Tag,
  PackageOpen,
  Package,
  Wrench,
  Layers,
} from "lucide-react";
import Modal from "../components/Modal";
import { errorMessage } from "../lib/api";
import { fmtMoney, fmtQty, priceSuffix } from "../lib/format";
import { useItem } from "../features/items/api";
import { Expiry, StatusBadges } from "../features/items/parts";
import ItemForm from "../features/items/ItemForm";
import ItemSalesHistory from "../features/items/ItemSalesHistory";
import AdjustmentForm from "../features/adjustments/AdjustmentForm";

const costLabel = {
  PIECE: "تكلفة القطعة",
  GRAM: "تكلفة الكيلو",
  ML: "تكلفة اللتر",
} as const;

const HEADERS = [
  "الانتهاء",
  "المتبقي",
  "اللي اتورد",
  "", // تكلفة (بتتحدد حسب الوحدة)
  "القيمة",
  "الإجراءات",
];

const THEME_STYLE = `
  :root {
    --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
  }
  @media(prefers-color-scheme: dark){
    :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
  }
`;

const backBtnClass =
  "font-[inherit] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] hover:border-[var(--br)] hover:text-[var(--br)] transition-colors cursor-pointer";

type KpiTone = "default" | "brand" | "danger";

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: KpiTone;
}) {
  const iconTone =
    tone === "brand"
      ? "bg-[var(--bs)] text-[var(--br)]"
      : tone === "danger"
        ? "bg-[var(--ds)] text-[var(--da)]"
        : "bg-[var(--bg)] text-[var(--mu)]";
  const valueTone =
    tone === "brand"
      ? "text-[var(--br)]"
      : tone === "danger"
        ? "text-[var(--da)]"
        : "text-[var(--tx)]";

  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 shadow-xs flex items-center gap-3">
      <span
        className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-[10px] ${iconTone}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <span className="block text-xs text-[var(--mu)] font-medium mb-0.5">
          {label}
        </span>
        <span
          className={`block text-xl font-bold tabular-nums truncate ${valueTone}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function ItemDetailPage() {
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const { data: item, isPending, error } = useItem(id);
  const [editing, setEditing] = useState(false);
  const [adjust, setAdjust] = useState<number | null>(null); // رقم الباتش لتسجيل التالف

  if (isPending)
    return (
      <div className="p-5 font-['Cairo',sans-serif]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <div className="h-8 w-28 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="h-7 w-56 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] rounded-[10px] bg-[var(--bd)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-48 rounded-[10px] bg-[var(--bd)] animate-pulse" />
      </div>
    );

  if (error)
    return (
      <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <button
          onClick={() => navigate("/items")}
          className={`${backBtnClass} mb-4`}
        >
          <ArrowRight size={16} />
          الأصناف
        </button>
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      </div>
    );

  const mult = item.unit === "PIECE" ? 1 : 1000;
  const hasExpired = item.expiredStock > 0;
  const hasInfo = item.description || (item.packName && item.packSize);

  const totalValue = item.batches.reduce(
    (sum, b) => sum + Number(b.unitCost) * b.qtyRemaining,
    0,
  );

  const headers = HEADERS.map((h, i) => (i === 3 ? costLabel[item.unit] : h));

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_STYLE}</style>

      {/* زر الرجوع */}
      <div className="mb-5">
        <button onClick={() => navigate("/items")} className={backBtnClass}>
          <ArrowRight size={16} />
          الأصناف
        </button>
      </div>

      {/* الهيدر العلوي */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 mb-6 ${
          item.isActive ? "" : "opacity-90"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold m-0">{item.name}</h2>
          {!item.isActive && (
            <span className="rounded-[99px] bg-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
              معطّل
            </span>
          )}
          <StatusBadges item={item} />
        </div>
        <button
          onClick={() => setEditing(true)}
          className="font-[inherit] flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
        >
          <Pencil size={16} />
          تعديل الصنف
        </button>
      </div>

      {/* تنبيه وجود كمية منتهية */}
      {hasExpired && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-[8px] border border-[var(--bd)] bg-[var(--ds)] px-4 py-2.5 text-sm text-[var(--da)] font-semibold"
        >
          <AlertTriangle size={17} className="shrink-0" />
          <span>
            في كمية منتهية ({fmtQty(item.unit, item.expiredStock)}) — سجّلها
            كتالف من زر "تسوية" في الباتش.
          </span>
        </div>
      )}

      {/* كروت الإحصائيات (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi
          icon={<Boxes size={22} />}
          label="المخزون الكلي"
          value={fmtQty(item.unit, item.stock)}
        />
        <Kpi
          icon={<ShoppingCart size={22} />}
          label="القابل للبيع"
          value={fmtQty(item.unit, item.sellable)}
          tone="brand"
        />
        <Kpi
          icon={<AlertTriangle size={22} />}
          label="المنتهي"
          value={fmtQty(item.unit, item.expiredStock)}
          tone={hasExpired ? "danger" : "default"}
        />
        <Kpi
          icon={<Tag size={22} />}
          label={`السعر (${priceSuffix[item.unit]})`}
          value={fmtMoney(item.price)}
        />
      </div>

      {/* وصف الصنف والعبوة */}
      {hasInfo && (
        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 mb-6 shadow-xs space-y-2 text-sm">
          {item.description && (
            <p className="text-[var(--mu)] m-0 leading-relaxed">
              {item.description}
            </p>
          )}
          {item.packName && item.packSize && (
            <p className="flex items-center gap-2 text-[var(--tx)] font-semibold m-0">
              <Package size={16} className="text-[var(--br)]" />
              العبوة: {item.packName} = {fmtQty(item.unit, item.packSize)}
            </p>
          )}
        </div>
      )}

      {/* عنوان جدول الباتشات */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-base font-bold m-0">
          <Layers size={18} className="text-[var(--br)]" />
          الباتشات
          <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
            {item.batches.length}
          </span>
        </h3>
        <span className="text-xs text-[var(--mu)] font-medium">
          الأقرب انتهاءً يُباع أولًا
        </span>
      </div>

      {/* جدول الباتشات */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {headers.map((h, i) => (
                <th
                  key={i}
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
            {item.batches.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[var(--mu)]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                      <PackageOpen size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش كمية متاحة من الصنف ده
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              item.batches.map((b) => (
                <tr
                  key={b.id}
                  className={`border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors ${
                    b.expired ? "bg-[var(--ds)]/40" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    {b.hasExpiry ? (
                      <Expiry iso={b.expiryDate} />
                    ) : (
                      <span className="text-[var(--mu)]">بدون تاريخ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtQty(item.unit, b.qtyRemaining)}
                  </td>
                  <td className="px-4 py-3 text-[var(--mu)] font-medium tabular-nums">
                    {fmtQty(item.unit, b.qtyReceived)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(Number(b.unitCost) * mult)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {fmtMoney(Number(b.unitCost) * b.qtyRemaining)}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="inline-flex items-center gap-2">
                      {b.expired && (
                        <span className="rounded-[99px] bg-[var(--ds)] border border-[var(--da)]/30 px-2.5 py-0.5 text-xs font-semibold text-[var(--da)]">
                          منتهي
                        </span>
                      )}
                      <button
                        onClick={() => setAdjust(b.id)}
                        title="تسجيل تالف أو منتهي"
                        className={`font-[inherit] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border bg-[var(--cd)] text-xs font-semibold cursor-pointer transition-colors ${
                          b.expired
                            ? "border-[var(--da)] text-[var(--da)] hover:bg-[var(--ds)]"
                            : "border-[var(--bd)] text-[var(--tx)] hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)]"
                        }`}
                      >
                        <Wrench size={14} />
                        تسوية
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {item.batches.length > 0 && (
            <tfoot>
              <tr className="border-t border-[var(--bd)] bg-[var(--bg)] text-xs font-semibold text-[var(--mu)]">
                <td colSpan={4} className="px-4 py-3">
                  إجمالي قيمة المتبقي
                </td>
                <td className="px-4 py-3 text-sm font-bold text-[var(--br)] tabular-nums">
                  {fmtMoney(totalValue)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* سجل المبيعات */}
      <ItemSalesHistory itemId={item.id} unit={item.unit} />

      {/* النوافذ المنبثقة */}
      {adjust !== null && (
        <Modal title="تسجيل تالف أو منتهي" onClose={() => setAdjust(null)}>
          <AdjustmentForm
            presetItem={item}
            presetBatchId={adjust}
            onDone={() => setAdjust(null)}
          />
        </Modal>
      )}
      {editing && (
        <Modal title={`تعديل: ${item.name}`} onClose={() => setEditing(false)}>
          <ItemForm item={item} onDone={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}
