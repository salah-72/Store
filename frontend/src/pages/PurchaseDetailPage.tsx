import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Pencil,
  RotateCcw,
  Trash2,
  Truck,
  CalendarDays,
  Receipt,
  Percent,
  Wallet,
  HandCoins,
  Hourglass,
  Layers,
  StickyNote,
} from "lucide-react";
import Confirm from "../components/Confirm";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney, fmtNumber, fmtQty } from "../lib/format";
import { useDeletePurchase, usePurchase } from "../features/purchases/api";
import { Expiry } from "../features/items/parts";

const costName = { PIECE: "القطعة", GRAM: "الكيلو", ML: "اللتر" } as const;

const THEME_STYLE = `
  :root {
    --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
  }
  @media(prefers-color-scheme: dark){
    :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
  }
`;

const backBtnClass =
  "font-[inherit] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] hover:border-[var(--br)] hover:text-[var(--br)] transition-colors cursor-pointer no-underline";

const outlineBtn =
  "font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors cursor-pointer no-underline";

type Tone = "default" | "brand" | "danger";

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: Tone;
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
          className={`block text-lg font-bold tabular-nums truncate ${valueTone}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function PurchaseDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { data: p, isPending, error } = usePurchase(id);
  const del = useDeletePurchase();
  const [confirming, setConfirming] = useState(false);

  if (isPending)
    return (
      <div className="p-5 font-['Cairo',sans-serif]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <div className="h-8 w-28 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="h-7 w-56 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <Link to="/purchases" className={`${backBtnClass} mb-4`}>
          <ArrowRight size={16} />
          المشتريات
        </Link>
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      </div>
    );

  const left = Math.round((Number(p.total) - Number(p.paid)) * 100) / 100;
  const hasDiscount = Number(p.discount) !== 0;

  const linesHeaders = [
    "الصنف",
    "الكمية",
    "الانتهاء",
    "التكلفة",
    "الإجمالي",
    "المتبقي في المخزن",
  ];

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_STYLE}</style>

      {/* زر الرجوع */}
      <div className="mb-5">
        <Link to="/purchases" className={backBtnClass}>
          <ArrowRight size={16} />
          المشتريات
        </Link>
      </div>

      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold m-0">فاتورة شراء #{p.id}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-[99px] bg-[var(--bg)] border border-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
            <CalendarDays size={13} />
            {fmtDate(p.date)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/returns/new?kind=purchase&invoiceId=${p.id}`}
            className={outlineBtn}
          >
            <RotateCcw size={16} />
            مرتجع
          </Link>
          <Link to={`/purchases/${p.id}/edit`} className={outlineBtn}>
            <Pencil size={16} />
            تعديل
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--da)] bg-[var(--cd)] text-[var(--da)] text-sm font-semibold hover:bg-[var(--ds)] transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      </div>

      {/* المورد + الملاحظة */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 mb-5 shadow-xs space-y-2 text-sm">
        <p className="flex items-center gap-2 m-0 font-semibold">
          <Truck size={16} className="text-[var(--br)]" />
          <span className="text-[var(--mu)] font-medium">المورد:</span>
          <Link
            to={`/suppliers/${p.supplier.id}`}
            className="text-[var(--br)] font-bold no-underline hover:underline"
          >
            {p.supplier.name}
          </Link>
        </p>
        {p.note && (
          <p className="flex items-start gap-2 m-0 text-[var(--mu)] leading-relaxed">
            <StickyNote size={16} className="shrink-0 mt-0.5" />
            {p.note}
          </p>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Kpi
          icon={<Receipt size={22} />}
          label="المجموع"
          value={fmtMoney(p.subtotal)}
        />
        <Kpi
          icon={<Percent size={22} />}
          label="الخصم"
          value={hasDiscount ? `-${fmtMoney(p.discount)}` : "—"}
        />
        <Kpi
          icon={<Wallet size={22} />}
          label="الإجمالي"
          value={fmtMoney(p.total)}
        />
        <Kpi
          icon={<HandCoins size={22} />}
          label="المدفوع وقت الفاتورة"
          value={fmtMoney(p.paid)}
          tone="brand"
        />
        <Kpi
          icon={<Hourglass size={22} />}
          label={left < 0 ? "زيادة عند المورد" : "المتبقي على الفاتورة"}
          value={fmtMoney(Math.abs(left))}
          tone={left > 0 ? "danger" : "brand"}
        />
      </div>

      {/* الأصناف */}
      <h3 className="flex items-center gap-2 text-base font-bold mb-3">
        <Layers size={18} className="text-[var(--br)]" />
        الأصناف
        <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
          {p.lines.length}
        </span>
      </h3>

      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs mb-6">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {linesHeaders.map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.lines.map((l) => (
              <tr
                key={l.id}
                className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/items/${l.item.id}`}
                    className="text-[var(--br)] font-bold no-underline hover:underline"
                  >
                    {l.item.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  {l.packs !== null && l.item.packName ? (
                    <>
                      {fmtNumber(l.packs)} {l.item.packName}{" "}
                      <span className="text-[var(--mu)] font-medium">
                        ({fmtQty(l.item.unit, l.baseQty)})
                      </span>
                    </>
                  ) : (
                    fmtQty(l.item.unit, l.baseQty)
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.hasExpiry ? (
                    <Expiry iso={l.batch.expiryDate} />
                  ) : (
                    <span className="text-[var(--mu)]">بدون صلاحية</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  {fmtMoney(
                    Number(l.batch.unitCost) *
                      (l.item.unit === "PIECE" ? 1 : 1000),
                  )}{" "}
                  <span className="text-xs text-[var(--mu)] font-medium">
                    / {costName[l.item.unit]}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  {fmtMoney(l.lineTotal)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <span className="font-semibold">
                    {fmtQty(l.item.unit, l.batch.qtyRemaining)}
                  </span>{" "}
                  <span className="text-xs text-[var(--mu)]">
                    (في الباتش كله)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المرتجعات */}
      {p.purchaseReturns.length > 0 && (
        <>
          <h3 className="flex items-center gap-2 text-base font-bold mb-3">
            <RotateCcw size={18} className="text-[var(--wa)]" />
            مرتجعات للمورد على الفاتورة دي
            <span className="rounded-[99px] bg-[var(--ws)] text-[var(--wa)] px-2 py-0.5 text-[11px] font-bold">
              {p.purchaseReturns.length}
            </span>
          </h3>

          <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
            <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
                  {["المرتجع", "التاريخ", "القيمة", "كاش مسترد"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.purchaseReturns.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/returns/purchase/${r.id}`}
                        className="text-[var(--br)] font-bold no-underline hover:underline"
                      >
                        #{r.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--mu)]">
                      {fmtDate(r.date)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {fmtMoney(r.total)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {fmtMoney(r.cashRefund)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirming && (
        <Confirm
          title="حذف فاتورة الشراء"
          confirmLabel="حذف الفاتورة"
          message={`هتتمسح الفاتورة #${p.id} وكمياتها هتتشال من المخزن. لو جزء منها اتباع أو اترجّع مش هتتمسح.`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await del.mutateAsync(p.id);
            navigate("/purchases", { replace: true });
          }}
        />
      )}
    </div>
  );
}
