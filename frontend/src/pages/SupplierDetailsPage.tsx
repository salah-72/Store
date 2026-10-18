import { useParams, useNavigate } from "react-router-dom";
import { errorMessage } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { useSupplier, useSetSupplierActive } from "../features/suppliers/api";

export default function SupplierDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const supplierId = Number(id);

  const { data, isPending, error } = useSupplier(supplierId);
  const setActive = useSetSupplierActive();

  if (isPending)
    return (
      <div
        className="p-10 text-center text-[var(--mu)] font-['Cairo',sans-serif]"
        dir="rtl"
      >
        جاري التحميل...
      </div>
    );
  if (error)
    return (
      <div
        className="p-10 text-center text-[var(--da)] font-['Cairo',sans-serif]"
        dir="rtl"
      >
        {errorMessage(error)}
      </div>
    );

  const supplier = data?.supplier || data;
  const purchases = data?.purchases || [];
  const isCleared = (supplier?.remaining ?? 0) <= 0;

  async function toggleActive() {
    try {
      await setActive.mutateAsync({
        id: supplierId,
        isActive: !(supplier?.isActive ?? true),
      });
    } catch (e) {
      alert(errorMessage(e));
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

      {/* الهيدر العلوي */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/suppliers")}
            className="font-[inherit] px-4 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] transition-colors cursor-pointer"
          >
            رجوع
          </button>
          <h2 className="text-xl font-bold m-0">{supplier?.name}</h2>
          {supplier?.phone && (
            <span className="text-sm text-[var(--mu)] font-medium me-2">
              {supplier.phone}
            </span>
          )}
          {supplier?.isActive === false && (
            <span className="rounded-[99px] bg-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
              معطّل
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* زر التفعيل/التعطيل */}
          <button
            onClick={toggleActive}
            disabled={setActive.isPending}
            className={`font-[inherit] px-3.5 py-2 rounded-[8px] text-xs font-semibold border cursor-pointer transition-all ${
              (supplier?.isActive ?? true)
                ? "border-[var(--bd)] bg-[var(--cd)] text-[var(--da)] hover:bg-[var(--ds)]"
                : "border-[var(--br)] bg-[var(--bs)] text-[var(--br)] hover:bg-[var(--br)] hover:text-white"
            }`}
          >
            {(supplier?.isActive ?? true) ? "تعطيل المورد" : "تفعيل المورد"}
          </button>

          {/* زر تسجيل دفعة */}
          <button
            onClick={() => alert("تسجيل دفعة للمورد")}
            className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white text-sm font-semibold hover:opacity-95 cursor-pointer shadow-sm"
          >
            تسجيل دفعة
          </button>
        </div>
      </div>

      {/* كروت الإحصائيات الأربعة تضمن الرصيد الافتتاحي */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 text-center shadow-xs">
          <span className="block text-xs text-[var(--mu)] font-medium mb-1">
            الرصيد الافتتاحي
          </span>
          <span className="text-xl font-bold">
            {fmtMoney(supplier?.openingBalance ?? 0)}
          </span>
        </div>

        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 text-center shadow-xs">
          <span className="block text-xs text-[var(--mu)] font-medium mb-1">
            إجمالي التوريدات
          </span>
          <span className="text-xl font-bold">
            {fmtMoney(supplier?.totalPurchased ?? 0)}
          </span>
        </div>

        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 text-center shadow-xs">
          <span className="block text-xs text-[var(--mu)] font-medium mb-1">
            المدفوع له
          </span>
          <span className="text-xl font-bold text-[var(--br)]">
            {fmtMoney(supplier?.totalPaid ?? 0)}
          </span>
        </div>

        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 text-center shadow-xs">
          <span className="block text-xs text-[var(--mu)] font-medium mb-1">
            المتبقي علينا
          </span>
          {isCleared ? (
            <span className="text-xl font-bold text-[var(--br)]">
              0 ج (مسدد)
            </span>
          ) : (
            <span className="text-xl font-bold text-[var(--da)]">
              {fmtMoney(supplier?.remaining ?? 0)}
            </span>
          )}
        </div>
      </div>

      {/* عنوان جدول العمليات */}
      <h3 className="text-base font-bold mb-3">عمليات التوريد</h3>

      {/* جدول عمليات التوريد */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {[
                "التاريخ",
                "الفاتورة",
                "التفاصيل",
                "الإجمالي",
                "المدفوع",
                "المتبقي",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[var(--mu)]">
                  لا توجد عمليات توريد مسجلة حتى الآن
                </td>
              </tr>
            ) : (
              purchases.map((p: any) => {
                const rem = p.total - p.paid;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--bd)] hover:bg-[var(--bs)] transition-colors"
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
                    <td className="px-4 py-3 font-semibold">
                      {fmtMoney(p.total)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {fmtMoney(p.paid)}
                    </td>
                    <td className="px-4 py-3">
                      {rem <= 0 ? (
                        <span className="inline-block rounded-[99px] bg-[var(--bs)] px-2.5 py-0.5 text-xs font-semibold text-[var(--br)]">
                          مسدد
                        </span>
                      ) : (
                        <span className="font-bold text-[var(--da)]">
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
