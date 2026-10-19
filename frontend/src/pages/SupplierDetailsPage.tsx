import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Phone,
  Power,
  CheckCircle2,
  HandCoins,
  Wallet,
  Truck,
  Scale,
  Hourglass,
  Receipt,
  X,
  PackageOpen,
  Loader2,
} from "lucide-react";
import { errorMessage } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { useSupplier, useSetSupplierActive } from "../features/suppliers/api";

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

type Tone = "default" | "brand" | "danger";

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
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
          className={`block text-xl font-bold tabular-nums truncate ${valueTone}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function SupplierDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const supplierId = Number(id);

  const { data, isPending, error } = useSupplier(supplierId);
  const setActive = useSetSupplierActive();
  const [actionError, setActionError] = useState("");

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
          type="button"
          onClick={() => navigate("/suppliers")}
          className={`${backBtnClass} mb-4`}
        >
          <ArrowRight size={16} />
          الموردين
        </button>
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      </div>
    );

  const supplier = data?.supplier || data;
  const purchases = data?.purchases || [];
  const isCleared = (supplier?.remaining ?? 0) <= 0;
  const isActive = supplier?.isActive ?? true;

  async function toggleActive() {
    setActionError("");
    try {
      await setActive.mutateAsync({
        id: supplierId,
        isActive: !(supplier?.isActive ?? true),
      });
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const headers = [
    "التاريخ",
    "الفاتورة",
    "التفاصيل",
    "الإجمالي",
    "المدفوع",
    "المتبقي",
  ];

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_STYLE}</style>

      {/* زر الرجوع */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate("/suppliers")}
          className={backBtnClass}
        >
          <ArrowRight size={16} />
          الموردين
        </button>
      </div>

      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold m-0">{supplier?.name}</h2>
          {supplier?.phone && (
            <span
              dir="ltr"
              className="inline-flex items-center gap-1.5 rounded-[99px] bg-[var(--bg)] border border-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold tabular-nums"
            >
              <Phone size={13} />
              {supplier.phone}
            </span>
          )}
          {supplier?.isActive === false && (
            <span className="rounded-[99px] bg-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
              معطّل
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleActive}
            disabled={setActive.isPending}
            className={`font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-sm font-semibold border bg-[var(--cd)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive
                ? "border-[var(--da)] text-[var(--da)] hover:bg-[var(--ds)]"
                : "border-[var(--br)] text-[var(--br)] hover:bg-[var(--bs)]"
            }`}
          >
            {setActive.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isActive ? (
              <Power size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {isActive ? "تعطيل المورد" : "تفعيل المورد"}
          </button>

          <button
            type="button"
            onClick={() => alert("تسجيل دفعة للمورد")}
            className="font-[inherit] inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
          >
            <HandCoins size={16} />
            تسجيل دفعة
          </button>
        </div>
      </div>

      {/* خطأ الإجراء */}
      {actionError && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-3 rounded-[8px] border border-[var(--bd)] bg-[var(--ds)] px-4 py-2.5 text-sm text-[var(--da)] font-semibold"
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

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          icon={<Scale size={22} />}
          label="الرصيد الافتتاحي"
          value={fmtMoney(supplier?.openingBalance ?? 0)}
        />
        <Kpi
          icon={<Truck size={22} />}
          label="إجمالي التوريدات"
          value={fmtMoney(supplier?.totalPurchased ?? 0)}
        />
        <Kpi
          icon={<Wallet size={22} />}
          label="المدفوع له"
          value={fmtMoney(supplier?.totalPaid ?? 0)}
          tone="brand"
        />
        <Kpi
          icon={<Hourglass size={22} />}
          label="المتبقي علينا"
          value={isCleared ? "0 ج (مسدد)" : fmtMoney(supplier?.remaining ?? 0)}
          tone={isCleared ? "brand" : "danger"}
        />
      </div>

      {/* عمليات التوريد */}
      <h3 className="flex items-center gap-2 text-base font-bold mb-3">
        <Receipt size={18} className="text-[var(--br)]" />
        عمليات التوريد
        <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
          {purchases.length}
        </span>
      </h3>

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
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[var(--mu)]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                      <PackageOpen size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      لا توجد عمليات توريد مسجلة حتى الآن
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              purchases.map((p: any) => {
                const rem = p.total - p.paid;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[var(--mu)] font-medium">
                      {p.date}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--tx)]">
                      {p.invoiceNumber || p.id}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {p.details || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {fmtMoney(p.total)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {fmtMoney(p.paid)}
                    </td>
                    <td className="px-4 py-3">
                      {rem <= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--bs)] px-2.5 py-0.5 text-xs font-semibold text-[var(--br)]">
                          <CheckCircle2 size={13} />
                          مسدد
                        </span>
                      ) : (
                        <span className="font-bold tabular-nums text-[var(--da)]">
                          {fmtMoney(rem)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
