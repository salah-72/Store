import { errorMessage } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import { useSupplier } from "./api";

export default function SupplierDetails({
  supplierId,
}: {
  supplierId: number;
}) {
  const { data, isPending, error } = useSupplier(supplierId);

  if (isPending)
    return (
      <div className="p-6 text-center text-[var(--mu)]">جاري التحميل...</div>
    );
  if (error)
    return (
      <div className="p-6 text-center text-[var(--da)]">
        {errorMessage(error)}
      </div>
    );

  const supplier = data?.supplier || data;
  const purchases = data?.purchases || [];

  const isCleared = (supplier?.remaining ?? 0) <= 0;

  return (
    <div
      className="space-y-6 font-['Cairo',sans-serif] text-[var(--tx)]"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--bd)] pb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--tx)] m-0">
            {supplier?.name}
          </h3>
          <p className="text-xs text-[var(--mu)] mt-1">
            تليفون: {supplier?.phone || "غير مسجل"}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 bg-[var(--bg)] rounded-[8px] border border-[var(--bd)]">
            <span className="block text-[11px] text-[var(--mu)]">
              إجمالي التوريدات
            </span>
            <span className="font-bold text-sm">
              {fmtMoney(supplier?.totalPurchased ?? 0)}
            </span>
          </div>
          <div className="text-center px-4 py-2 bg-[var(--bg)] rounded-[8px] border border-[var(--bd)]">
            <span className="block text-[11px] text-[var(--mu)]">
              المتبقي علينا
            </span>
            {isCleared ? (
              <span className="font-bold text-sm text-[var(--br)]">مسدد</span>
            ) : (
              <span className="font-bold text-sm text-[var(--da)]">
                {fmtMoney(supplier?.remaining ?? 0)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold mb-3 text-[var(--tx)]">
          فواتير الشراء والتوريدات السابقة
        </h4>
        {purchases.length === 0 ? (
          <div className="rounded-[8px] bg-[var(--bg)] border border-[var(--bd)] p-4 text-center text-[var(--mu)] text-sm">
            مفيش فواتير شراء مسجلة لهذا المورد حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[8px]">
            <table className="w-full text-right text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] font-semibold">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">الإجمالي</th>
                  <th className="p-3">المدفوع</th>
                  <th className="p-3">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p: any) => {
                  const rem = p.total - p.paid;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--bd)] hover:bg-[var(--bs)] transition-colors"
                    >
                      <td className="p-3">{p.date}</td>
                      <td className="p-3 font-semibold text-[var(--br)]">
                        {p.invoiceNumber || p.id}
                      </td>
                      <td className="p-3">{fmtMoney(p.total)}</td>
                      <td className="p-3">{fmtMoney(p.paid)}</td>
                      <td className="p-3">
                        {rem <= 0 ? (
                          <span className="text-[var(--br)] font-semibold">
                            مسدد
                          </span>
                        ) : (
                          <span className="text-[var(--da)] font-semibold">
                            {fmtMoney(rem)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
