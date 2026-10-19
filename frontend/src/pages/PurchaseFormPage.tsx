import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { errorMessage } from "../lib/api";
import { useParty } from "../features/parties/api";
import { usePurchase } from "../features/purchases/api";
import PurchaseForm from "../features/purchases/PurchaseForm";

// نفس الصفحة للإضافة (/purchases/new) والتعديل (/purchases/:id/edit)
export default function PurchaseFormPage() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const presetId = Number(useSearchParams()[0].get("supplierId")) || null;
  const purchase = usePurchase(editId);
  const preset = useParty("suppliers", editId ? null : presetId);
  const back = editId ? `/purchases/${editId}` : "/purchases";

  const loading =
    (editId && purchase.isPending) || (!editId && presetId && preset.isPending);
  const err = purchase.error ?? preset.error;

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
          to={back}
          className="font-[inherit] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] hover:border-[var(--br)] hover:text-[var(--br)] transition-colors cursor-pointer no-underline"
        >
          <ArrowRight size={16} />
          {editId ? `فاتورة #${editId}` : "المشتريات"}
        </Link>
      </div>

      <div className="mb-5">
        <h2 className="text-xl font-bold m-0">
          {editId ? `تعديل فاتورة شراء #${editId}` : "فاتورة شراء جديدة"}
        </h2>
        <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
          {editId
            ? "عدّل بيانات الفاتورة وبنودها ثم احفظ"
            : "اختار المورد وضيف الأصناف والكميات"}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-6 text-sm text-[var(--mu)] font-medium">
          <Loader2 size={16} className="animate-spin" />
          جاري التحميل...
        </div>
      )}

      {err && (
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] text-sm font-semibold m-0"
        >
          {errorMessage(err)}
        </p>
      )}

      {!loading && !err && (
        <PurchaseForm initial={purchase.data} presetSupplier={preset.data} />
      )}
    </div>
  );
}
