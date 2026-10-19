import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  User,
  CalendarDays,
  Receipt,
  Percent,
  Wallet,
  HandCoins,
  Hourglass,
  TrendingUp,
  Layers,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import Confirm from "../components/Confirm";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney, fmtQty, hasExpiryDate } from "../lib/format";
import { useDeleteSale, useSale } from "../features/sales/api";
import { Expiry } from "../features/items/parts";

const perName = { PIECE: "قطعة", GRAM: "كجم", ML: "لتر" } as const;

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

const linkClass = "text-[var(--br)] font-bold no-underline hover:underline";

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
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 shadow-xs flex items-center gap-3 h-full">
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

export default function SaleDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: s, isPending, error } = useSale(id);
  const del = useDeleteSale();
  const [confirming, setConfirming] = useState(false);

  // بعد "حفظ وطباعة" بنفتح نافذة الطباعة أول ما الفاتورة تظهر
  const wantsPrint = params.get("print") === "1";
  useEffect(() => {
    if (!wantsPrint || !s) return;
    const t = setTimeout(() => {
      window.print();
      setParams({}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [wantsPrint, s, setParams]);

  if (isPending)
    return (
      <div className="p-5 font-['Cairo',sans-serif]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <div className="h-8 w-28 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="h-7 w-56 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <Link to="/sales" className={`${backBtnClass} mb-4`}>
          <ArrowRight size={16} />
          المبيعات
        </Link>
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      </div>
    );

  const left = Math.round((Number(s.total) - Number(s.paid)) * 100) / 100;
  const hasDiscount = Number(s.discount) !== 0;
  const unitPriceShown = (l: (typeof s.lines)[number]) =>
    Number(l.unitPrice) * l.item.priceBasis;

  const th = "px-4 py-3 font-semibold";

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_STYLE}</style>

      {/* زر الرجوع */}
      <div className="mb-5 no-print">
        <Link to="/sales" className={backBtnClass}>
          <ArrowRight size={16} />
          المبيعات
        </Link>
      </div>

      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold m-0">فاتورة بيع #{s.id}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-[99px] bg-[var(--bg)] border border-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
            <CalendarDays size={13} />
            {fmtDate(s.date)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className={outlineBtn}
          >
            <Printer size={16} />
            طباعة
          </button>
          <Link
            to={`/returns/new?kind=sale&invoiceId=${s.id}`}
            className={outlineBtn}
          >
            <RotateCcw size={16} />
            مرتجع
          </Link>
          <Link to={`/sales/${s.id}/edit`} className={outlineBtn}>
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

      {/* العميل + الملاحظة */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 mb-5 shadow-xs space-y-2 text-sm">
        <p className="flex items-center gap-2 m-0 font-semibold">
          <User size={16} className="text-[var(--br)]" />
          <span className="text-[var(--mu)] font-medium">العميل:</span>
          {s.customer ? (
            <Link to={`/customers/${s.customer.id}`} className={linkClass}>
              {s.customer.name}
            </Link>
          ) : (
            <span className="text-[var(--mu)]">نقدي</span>
          )}
        </p>
        {s.note && (
          <p className="flex items-start gap-2 m-0 text-[var(--mu)] leading-relaxed">
            <StickyNote size={16} className="shrink-0 mt-0.5" />
            {s.note}
          </p>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Kpi
          icon={<Receipt size={22} />}
          label="المجموع"
          value={fmtMoney(s.subtotal)}
        />
        <Kpi
          icon={<Percent size={22} />}
          label="الخصم"
          value={hasDiscount ? `-${fmtMoney(s.discount)}` : "—"}
        />
        <Kpi
          icon={<Wallet size={22} />}
          label="الإجمالي"
          value={fmtMoney(s.total)}
        />
        <Kpi
          icon={<HandCoins size={22} />}
          label="المدفوع وقت الفاتورة"
          value={fmtMoney(s.paid)}
          tone="brand"
        />
        <Kpi
          icon={<Hourglass size={22} />}
          label={left < 0 ? "زيادة للعميل" : "المتبقي على الفاتورة"}
          value={fmtMoney(Math.abs(left))}
          tone={left > 0 ? "danger" : "brand"}
        />
        <div className="no-print">
          <Kpi
            icon={<TrendingUp size={22} />}
            label="الربح (من تكلفة الباتشات)"
            value={fmtMoney(s.profit)}
            tone={Number(s.profit) < 0 ? "danger" : "brand"}
          />
        </div>
      </div>

      {/* الأصناف */}
      <h3 className="flex items-center gap-2 text-base font-bold mb-3">
        <Layers size={18} className="text-[var(--br)]" />
        الأصناف
        <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
          {s.lines.length}
        </span>
      </h3>

      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs mb-6">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {["الصنف", "الكمية", "السعر", "الإجمالي"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
              {["التكلفة", "الربح", "اتباع من باتش"].map((h) => (
                <th key={h} className={`${th} no-print`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr
                key={l.id}
                className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link to={`/items/${l.item.id}`} className={linkClass}>
                    {l.item.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  {fmtQty(l.item.unit, l.baseQty)}
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  {fmtMoney(Math.round(unitPriceShown(l) * 100) / 100)}{" "}
                  <span className="text-xs text-[var(--mu)] font-medium">
                    / {perName[l.item.unit]}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  {fmtMoney(l.lineTotal)}
                </td>
                <td className="px-4 py-3 text-[var(--mu)] font-medium tabular-nums no-print">
                  {fmtMoney(l.cost)}
                </td>
                <td className="px-4 py-3 no-print">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold tabular-nums ${
                        l.belowCost ? "text-[var(--da)]" : ""
                      }`}
                    >
                      {fmtMoney(l.profit)}
                    </span>
                    {l.belowCost && (
                      <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--ds)] text-[var(--da)] px-2.5 py-0.5 text-xs font-semibold">
                        <TriangleAlert size={12} />
                        تحت التكلفة
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 no-print">
                  <div className="space-y-1">
                    {l.batches.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span className="font-semibold tabular-nums">
                          {fmtQty(l.item.unit, b.baseQty)}
                        </span>
                        <span className="text-[var(--mu)]">·</span>
                        {hasExpiryDate(b.batch.expiryDate) ? (
                          <Expiry iso={b.batch.expiryDate} />
                        ) : (
                          <span className="text-[var(--mu)]">بدون صلاحية</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المرتجعات */}
      {s.returns.length > 0 && (
        <div className="no-print">
          <h3 className="flex items-center gap-2 text-base font-bold mb-3">
            <RotateCcw size={18} className="text-[var(--wa)]" />
            مرتجعات على الفاتورة دي
            <span className="rounded-[99px] bg-[var(--ws)] text-[var(--wa)] px-2 py-0.5 text-[11px] font-bold">
              {s.returns.length}
            </span>
          </h3>

          <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
            <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
                  {["المرتجع", "التاريخ", "القيمة", "كاش مرجّع"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.returns.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/returns/sale/${r.id}`} className={linkClass}>
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
        </div>
      )}

      {confirming && (
        <Confirm
          title="حذف فاتورة البيع"
          confirmLabel="حذف الفاتورة"
          message={`هتتمسح الفاتورة #${s.id} وكمياتها هترجع للمخزن في نفس الباتشات اللي اتباعت منها. لو عليها مرتجعات مش هتتمسح.`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await del.mutateAsync(s.id);
            navigate("/sales", { replace: true });
          }}
        />
      )}
    </div>
  );
}
