import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { errorMessage } from "../lib/api";
import SaleForm from "../features/sales/SaleForm";
import { useSale } from "../features/sales/api";

export default function SaleFormPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { data, isPending, error } = useSale(id);

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
          to={`/sales/${id}`}
          className="font-[inherit] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] hover:border-[var(--br)] hover:text-[var(--br)] transition-colors cursor-pointer no-underline"
        >
          <ArrowRight size={16} />
          فاتورة #{id}
        </Link>
      </div>

      <div className="mb-5">
        <h2 className="text-xl font-bold m-0">تعديل فاتورة بيع #{id}</h2>
        <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
          عدّل بيانات الفاتورة وبنودها ثم احفظ
        </p>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 p-6 text-sm text-[var(--mu)] font-medium">
          <Loader2 size={16} className="animate-spin" />
          جاري التحميل...
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] text-sm font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      )}

      {data && (
        <SaleForm
          initial={data}
          onSaved={(s, print) =>
            navigate(`/sales/${s.id}${print ? "?print=1" : ""}`, {
              replace: true,
            })
          }
        />
      )}
    </div>
  );
}
