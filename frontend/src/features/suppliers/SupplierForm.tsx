import { useState, type FormEvent } from "react";
import { errorMessage } from "../../lib/api";
import { useSaveSupplier } from "./api";

export default function SupplierForm({ onDone }: { onDone: () => void }) {
  const save = useSaveSupplier();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [error, setError] = useState("");

  const fieldStyle =
    "w-full rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] px-3 py-2 text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] font-[inherit]";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await save.mutateAsync({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : undefined,
        openingBalance: Number(openingBalance) || 0,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 font-['Cairo',sans-serif] text-[var(--tx)]"
      dir="rtl"
    >
      <label className="block space-y-1">
        <span className="block text-xs font-semibold text-[var(--mu)]">
          اسم المورد أو الشركة
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldStyle}
          placeholder="مثال: شركة الأمل للكيماويات"
          maxLength={150}
          autoFocus
        />
      </label>

      <label className="block space-y-1">
        <span className="block text-xs font-semibold text-[var(--mu)]">
          رقم التليفون (اختياري)
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={fieldStyle}
          placeholder="02 2345 6789 أو 010xxxxxxxx"
        />
      </label>

      <label className="block space-y-1">
        <span className="block text-xs font-semibold text-[var(--mu)]">
          رصيد أول المدة (مستحق للمورد إن وجد)
        </span>
        <input
          type="number"
          step="any"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          className={fieldStyle}
        />
      </label>

      {error && (
        <p className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] px-3 py-2 text-sm text-[var(--da)] font-semibold">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] cursor-pointer text-sm hover:bg-[var(--bs)] transition-colors"
        >
          إلغاء
        </button>
        <button
          disabled={save.isPending}
          className="font-[inherit] px-5 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 disabled:opacity-60 transition-opacity"
        >
          {save.isPending ? "جاري الحفظ..." : "حفظ المورد"}
        </button>
      </div>
    </form>
  );
}
