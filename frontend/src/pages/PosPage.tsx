import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ListOrdered, Loader2 } from "lucide-react";
import { errorMessage } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { useParty } from "../features/parties/api";
import SaleForm from "../features/sales/SaleForm";
import type { SaleDetail } from "../features/sales/api";

// شاشة الكاشير: فاتورة بيع جديدة. بعد الحفظ بتتفضى جاهزة للعميل اللي بعده.
export default function PosPage() {
  const navigate = useNavigate();
  const [formKey, setFormKey] = useState(0);
  const [last, setLast] = useState<SaleDetail | null>(null);
  // /pos?customerId=5 بيفتح الفاتورة والعميل مختار (من صفحة العميل)
  const presetId = Number(useSearchParams()[0].get("customerId")) || null;
  const preset = useParty("customers", presetId);

  function onSaved(sale: SaleDetail, print: boolean) {
    if (print) return navigate(`/sales/${sale.id}?print=1`);
    setLast(sale);
    setFormKey((k) => k + 1); // يفضّي الفاتورة
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

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold m-0">الكاشير</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            فاتورة بيع جديدة
          </p>
        </div>
        <Link
          to="/sales"
          className="font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors cursor-pointer no-underline"
        >
          <ListOrdered size={16} />
          كل المبيعات
        </Link>
      </div>

      {/* إشعار آخر فاتورة */}
      {last && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2.5 rounded-[8px] border border-[var(--br)] bg-[var(--bs)] px-4 py-2.5 text-sm text-[var(--br)] font-semibold"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <span>
            اتحفظت فاتورة{" "}
            <Link
              to={`/sales/${last.id}`}
              className="text-[var(--br)] font-bold underline"
            >
              #{last.id}
            </Link>{" "}
            بإجمالي {fmtMoney(last.total)}
            {last.customer ? ` على ${last.customer.name}` : " (نقدي)"}.
          </span>
        </div>
      )}

      {presetId && preset.isPending && (
        <div className="flex items-center gap-2 p-6 text-sm text-[var(--mu)] font-medium">
          <Loader2 size={16} className="animate-spin" />
          جاري التحميل...
        </div>
      )}

      {preset.error && (
        <p
          role="alert"
          className="mb-5 rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] text-sm font-semibold m-0"
        >
          {errorMessage(preset.error)}
        </p>
      )}

      {!(presetId && preset.isPending) && (
        <SaleForm
          key={formKey}
          presetCustomer={preset.data}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
