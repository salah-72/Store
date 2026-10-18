import { errorMessage } from "../../lib/api";
import {
  daysUntil,
  fmtDate,
  fmtMoney,
  fmtQty,
  NEAR_EXPIRY_DAYS,
  priceSuffix,
} from "../../lib/format";
import { useItem, type Batch, type Item } from "./api";

function ExpiryCell({ b }: { b: Batch }) {
  if (!b.hasExpiry) return <span className="text-[var(--mu)]">بدون تاريخ</span>;
  const days = daysUntil(b.expiryDate);
  const cls = b.expired
    ? "font-semibold text-[var(--da)]"
    : days <= NEAR_EXPIRY_DAYS
      ? "font-semibold text-[var(--wa)]"
      : "";
  return (
    <span className={cls}>
      {fmtDate(b.expiryDate)}{" "}
      {b.expired
        ? "(منتهي)"
        : days <= NEAR_EXPIRY_DAYS
          ? `(باقي ${days} يوم)`
          : ""}
    </span>
  );
}

const costLabel = {
  PIECE: "تكلفة القطعة",
  GRAM: "تكلفة الكيلو",
  ML: "تكلفة اللتر",
} as const;

export default function ItemDetails({ id }: { id: number }) {
  const { data, isPending, error } = useItem(id);

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

  const item: Item & { batches: Batch[] } = data;

  return (
    <div
      className="space-y-4 font-['Cairo',sans-serif] text-[var(--tx)]"
      dir="rtl"
    >
      {/* شبكة المؤشرات المصغرة */}
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-[8px] bg-[var(--bg)] border border-[var(--bd)] p-3">
          <span className="block text-xs text-[var(--mu)]">
            السعر ({priceSuffix[item.unit]})
          </span>
          <span className="font-bold text-base">{fmtMoney(item.price)}</span>
        </div>
        <div className="rounded-[8px] bg-[var(--bg)] border border-[var(--bd)] p-3">
          <span className="block text-xs text-[var(--mu)]">الكمية الكلية</span>
          <span className="font-bold text-base">
            {fmtQty(item.unit, item.stock)}
          </span>
        </div>
        <div className="rounded-[8px] bg-[var(--bg)] border border-[var(--bd)] p-3">
          <span className="block text-xs text-[var(--mu)]">صالح للبيع</span>
          <span className="font-bold text-base text-[var(--br)]">
            {fmtQty(item.unit, item.sellable)}
          </span>
        </div>
      </div>

      {item.description && (
        <p className="text-sm text-[var(--mu)] bg-[var(--bg)] p-3 rounded-[8px] border border-[var(--bd)]">
          {item.description}
        </p>
      )}

      <div>
        <h3 className="text-sm font-bold mb-2">
          الباتشات (التوريدات المتاحة — الأقرب انتهاءً الأول)
        </h3>
        {item.batches.length === 0 ? (
          <div className="rounded-[8px] bg-[var(--bg)] border border-[var(--bd)] p-4 text-center text-[var(--mu)] text-sm">
            مفيش كمية متاحة من الصنف ده
          </div>
        ) : (
          <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[8px]">
            <table className="w-full text-right text-sm border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
                  <th className="py-2.5 px-3">تاريخ الانتهاء</th>
                  <th className="py-2.5 px-3">المتبقي</th>
                  <th className="py-2.5 px-3">اللي اتورد</th>
                  <th className="py-2.5 px-3">{costLabel[item.unit]}</th>
                </tr>
              </thead>
              <tbody>
                {item.batches.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[var(--bd)] hover:bg-[var(--bs)] transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <ExpiryCell b={b} />
                    </td>
                    <td className="py-2.5 px-3 font-semibold">
                      {fmtQty(item.unit, b.qtyRemaining)}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--mu)]">
                      {fmtQty(item.unit, b.qtyReceived)}
                    </td>
                    <td className="py-2.5 px-3">
                      {fmtMoney(
                        Number(b.unitCost) * (item.unit === "PIECE" ? 1 : 1000),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
