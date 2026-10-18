import { useState, type FormEvent } from "react";
import { errorMessage } from "../../lib/api";
import {
  bigUnitName,
  toBaseQty,
  toDisplayQty,
  unitLabel,
  priceSuffix,
  type Unit,
} from "../../lib/format";
import { useSaveItem, type Item } from "./api";

export default function ItemForm({
  item,
  onDone,
}: {
  item?: Item;
  onDone: () => void;
}) {
  const save = useSaveItem();
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "PIECE");
  const [price, setPrice] = useState(item ? String(Number(item.price)) : "");
  const [packName, setPackName] = useState(item?.packName ?? "");
  const [packSize, setPackSize] = useState(
    item?.packSize ? String(toDisplayQty(item.unit, item.packSize)) : "",
  );
  const [reorder, setReorder] = useState(
    item ? String(toDisplayQty(item.unit, item.reorderLevel)) : "0",
  );
  const [error, setError] = useState("");

  const big = bigUnitName(unit);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!!packName.trim() !== !!packSize.trim())
      return setError(
        "اسم العبوة وحجمها لازم يتكتبوا مع بعض أو يتسابوا فاضيين",
      );
    try {
      await save.mutateAsync({
        id: item?.id,
        input: {
          name: name.trim(),
          description: description.trim() || null,
          unit,
          price: Number(price),
          packName: packName.trim() || null,
          packSize: packSize.trim() ? toBaseQty(unit, Number(packSize)) : null,
          reorderLevel: toBaseQty(unit, Number(reorder || 0)),
        },
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const fieldClass =
    "w-full px-3 py-2 bg-[var(--cd)] border border-[var(--bd)] rounded-[8px] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:ring-1 focus:ring-[var(--br)] font-[inherit]";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 font-['Cairo',sans-serif] text-[var(--tx)]"
      dir="rtl"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
          اسم الصنف (اكتب الحجم في الاسم)
        </span>
        <input
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={150}
          autoFocus
          placeholder="مثال: ملاثيون 250 جم"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
            بيتباع بـ
          </span>
          <select
            className={fieldClass}
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
          >
            {(Object.keys(unitLabel) as Unit[]).map((u) => (
              <option key={u} value={u}>
                {unitLabel[u]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
            سعر البيع ({priceSuffix[unit]})
          </span>
          <input
            className={fieldClass}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
      </div>

      {unit !== "PIECE" && (
        <p className="-mt-2 text-xs text-[var(--mu)] bg-[var(--bg)] p-2.5 rounded-[8px] border border-[var(--bd)]">
          الكمية بتتخزن بالـ{unit === "GRAM" ? "جرام" : "مل"} وتقدر تبيع أي كمية
          (مثلاً 350 {unit === "GRAM" ? "جم" : "مل"}), والسعر بتكتبه لل{big}{" "}
          والسيستم يحسب الباقي.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
            اسم العبوة (اختياري)
          </span>
          <input
            className={fieldClass}
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            maxLength={50}
            placeholder="كرتونة / شكارة / جركن"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
            فيها كام {big}؟
          </span>
          <input
            className={fieldClass}
            type="number"
            min="0"
            step="any"
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder={unit === "PIECE" ? "24" : "25"}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
          حد الطلب: نبّهني لما الكمية توصل لـ ({big}) أو أقل
        </span>
        <input
          className={fieldClass}
          type="number"
          min="0"
          step="any"
          value={reorder}
          onChange={(e) => setReorder(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--mu)]">
          ملاحظات (اختياري)
        </span>
        <textarea
          className={fieldClass}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </label>

      {error && (
        <p className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] px-3 py-2 text-xs font-semibold text-[var(--da)]">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] hover:bg-[var(--bs)] text-sm cursor-pointer font-[inherit]"
        >
          إلغاء
        </button>
        <button
          disabled={save.isPending}
          className="px-5 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white font-semibold hover:opacity-95 text-sm cursor-pointer disabled:opacity-60 font-[inherit]"
        >
          {save.isPending ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </form>
  );
}
