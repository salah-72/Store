import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import ReturnForm from "../features/returns/ReturnForm";
import { returnCfg, type ReturnKind } from "../features/returns/api";

// /returns/new?kind=sale&invoiceId=55  (بيتفتح من صفحة الفاتورة). من غير رقم فاتورة بنطلبه.
export default function ReturnFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const kind: ReturnKind =
    params.get("kind") === "purchase" ? "purchase" : "sale";
  const invoiceId = Number(params.get("invoiceId")) || null;
  const [num, setNum] = useState("");
  const cfg = returnCfg[kind];

  const fieldClass =
    "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

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

      <div className="mb-5">
        <Link
          to={
            invoiceId
              ? `/${cfg.invoicePath}/${invoiceId}`
              : `/returns?kind=${kind}`
          }
          className="font-[inherit] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] hover:border-[var(--br)] hover:text-[var(--br)] transition-colors cursor-pointer no-underline"
        >
          <ArrowRight size={16} />
          {invoiceId ? `${cfg.invoice} #${invoiceId}` : "المرتجعات"}
        </Link>
      </div>

      <div className="mb-5">
        <h2 className="text-xl font-bold m-0">{cfg.single} جديد</h2>
        <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
          {invoiceId
            ? `على ${cfg.invoice} #${invoiceId}`
            : "اختار نوع المرتجع ورقم الفاتورة"}
        </p>
      </div>

      {!invoiceId ? (
        <div className="max-w-[460px] bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-5 shadow-xs space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              نوع المرتجع
            </label>
            <select
              className={`${fieldClass} cursor-pointer font-medium`}
              value={kind}
              onChange={(e) =>
                navigate(`/returns/new?kind=${e.target.value}`, {
                  replace: true,
                })
              }
            >
              <option value="sale">مرتجع من عميل (على فاتورة بيع)</option>
              <option value="purchase">مرتجع لمورد (على فاتورة شراء)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              رقم {cfg.invoice}
            </label>
            <input
              className={fieldClass}
              type="number"
              min="1"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              autoFocus
              placeholder="مثلاً 55"
            />
          </div>

          <div className="flex items-start gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)] px-3.5 py-2.5 text-xs text-[var(--mu)] font-medium leading-relaxed">
            <Info size={15} className="shrink-0 mt-0.5" />
            كل مرتجع بيتسجل على فاتورة معينة. الأسهل تفتح الفاتورة وتدوس
            "مرتجع".
          </div>

          <button
            type="button"
            disabled={!(Number(num) > 0)}
            onClick={() =>
              navigate(`/returns/new?kind=${kind}&invoiceId=${Number(num)}`)
            }
            className="font-[inherit] w-full px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            متابعة
            <ArrowLeft size={16} />
          </button>
        </div>
      ) : (
        <ReturnForm
          key={`${kind}-${invoiceId}`}
          kind={kind}
          invoiceId={invoiceId}
        />
      )}
    </div>
  );
}
