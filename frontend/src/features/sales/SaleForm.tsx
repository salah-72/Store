import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Info,
  Loader2,
  Package,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import Combobox from "../../components/Combobox";
import { api, errorMessage } from "../../lib/api";
import { useDebounce } from "../../hooks/useDebounce";
import {
  bigUnitName,
  fmtMoney,
  fmtNumber,
  fmtQty,
  priceSuffix,
  todayYmd,
  toBaseQty,
  ymdOf,
} from "../../lib/format";
import type { Item } from "../items/api";
import { fetchParties, type Party } from "../parties/api";
import {
  useSaveSale,
  type SaleDetail,
  type SaleInput,
  type SaleLineInput,
} from "./api";

// الصنف بالبيانات اللي محتاجينها للبيع. في التعديل بعض الحقول (العبوة/المتاح) مش بتيجي من السيرفر
type SellItem = Pick<Item, "id" | "name" | "unit" | "price" | "priceBasis"> &
  Partial<Pick<Item, "packName" | "packSize" | "sellable">>;
type CustomerLite = Pick<Party, "id" | "name"> &
  Partial<Pick<Party, "remaining">>;

interface CartLine {
  key: number;
  item: SellItem;
  mode: "qty" | "pack"; // بالكيلو/اللتر/القطعة ولا بالعبوة
  qty: string;
  price: string; // سعر الوحدة الكبيرة (كيلو/لتر/قطعة)
  total: string | null; // لو المستخدم كتب الإجمالي بنفسه
}

let nextKey = 1;
const r2 = (n: number) => Math.round(n * 100) / 100;
const isClean2 = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

const newLine = (item: SellItem): CartLine => ({
  key: nextKey++,
  item,
  mode: "qty",
  qty: item.unit === "PIECE" ? "1" : "",
  price: String(Number(item.price)),
  total: null,
});

function fromSale(s: SaleDetail): CartLine[] {
  return s.lines.map((l) => {
    const item: SellItem = {
      id: l.item.id,
      name: l.item.name,
      unit: l.item.unit,
      priceBasis: l.item.priceBasis,
      price: "0",
    };
    const perBase = Number(l.unitPrice) * l.item.priceBasis;
    const clean = isClean2(perBase);
    return {
      key: nextKey++,
      item,
      mode: "qty",
      qty: String(l.item.unit === "PIECE" ? l.baseQty : l.baseQty / 1000),
      price: String(r2(perBase)),
      total: clean ? null : String(Number(l.lineTotal)), // سعر مش مضبوط => نثبّت الإجمالي زي ما اتباع
    };
  });
}

// الكمية بالوحدة الصغيرة، أو null لو الكمية مش صحيحة
function baseOf(l: Pick<CartLine, "item" | "mode" | "qty">): number | null {
  const n = Number(l.qty);
  if (l.qty.trim() === "" || !(n > 0)) return null;
  if (l.mode === "pack" && l.item.packSize) {
    const q = n * l.item.packSize;
    return Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : null;
  }
  if (l.item.unit === "PIECE") return Number.isInteger(n) ? n : null;
  const b = toBaseQty(l.item.unit, n);
  return Math.abs(n * 1000 - b) < 1e-6 ? b : null;
}
function totalOf(l: CartLine): number {
  if (l.total !== null) return Number(l.total) || 0;
  const b = baseOf(l);
  return b ? r2((b * (Number(l.price) || 0)) / l.item.priceBasis) : 0;
}

function buildLines(
  lines: CartLine[],
  checkStock: boolean,
): { payload?: SaleLineInput[]; error?: string } {
  const out: SaleLineInput[] = [];
  const used = new Map<number, number>();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i],
      n = i + 1;
    const base = baseOf(l);
    if (base === null)
      return {
        error: `${l.item.name}: الكمية غير صحيحة${l.item.unit === "PIECE" && l.mode === "qty" ? " (القطع لازم عدد صحيح)" : ""}`,
      };
    if (
      l.total !== null
        ? !(Number(l.total) >= 0)
        : !(Number(l.price) >= 0) || l.price.trim() === ""
    )
      return { error: `${l.item.name}: السعر غير صحيح` };
    if (checkStock && l.item.sellable !== undefined) {
      const total = (used.get(l.item.id) ?? 0) + base;
      used.set(l.item.id, total);
      if (total > l.item.sellable)
        return {
          error: `${l.item.name}: المتاح للبيع ${fmtQty(l.item.unit, l.item.sellable)} بس (السطر ${n})`,
        };
    }
    out.push({
      itemId: l.item.id,
      baseQty: base,
      ...(l.total !== null
        ? { lineTotal: r2(Number(l.total)) }
        : { price: Number(l.price) }),
    });
  }
  return { payload: out };
}
const snapshot = (lines: CartLine[]) =>
  JSON.stringify(
    lines.map((l) => [l.item.id, l.mode, l.qty, l.price, l.total]),
  );

/* ---------- UI building blocks ---------- */

const inputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const noSpinner =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const btnBase =
  "font-[inherit] px-4 py-2.5 rounded-[8px] border text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label className="block text-xs font-semibold text-[var(--mu)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5 p-0.5 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)]"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={`font-[inherit] flex-1 min-w-0 truncate px-2 py-1.5 rounded-[6px] border text-xs font-semibold cursor-pointer transition-colors ${
              on
                ? "border-[var(--bd)] bg-[var(--cd)] text-[var(--br)] shadow-xs"
                : "border-transparent bg-transparent text-[var(--mu)] hover:text-[var(--tx)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NumInput({
  id,
  value,
  onChange,
  suffix,
  step = "any",
  placeholder = "0",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        className={`${inputClass} ${noSpinner} tabular-nums ${suffix ? "pe-14" : ""}`}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => e.currentTarget.blur()}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 end-3 flex max-w-[3.25rem] items-center truncate text-xs font-semibold text-[var(--mu)]">
          {suffix}
        </span>
      )}
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warn" | "danger";
  children: ReactNode;
}) {
  const cls =
    tone === "danger"
      ? "border-[var(--da)] bg-[var(--ds)] text-[var(--da)]"
      : tone === "warn"
        ? "border-[var(--wa)] bg-[var(--ws)] text-[var(--wa)]"
        : "border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)]";
  return (
    <div
      className={`flex items-start gap-2 rounded-[8px] border px-3 py-2.5 text-xs font-medium leading-relaxed ${cls}`}
    >
      {tone !== "danger" && <Info size={15} className="shrink-0 mt-0.5" />}
      <p className="m-0">{children}</p>
    </div>
  );
}

/* ---------- شبكة الأصناف ---------- */
function ProductPicker({
  onPick,
  cartIds,
}: {
  onPick: (i: Item) => void;
  cartIds: Set<number>;
}) {
  const [text, setText] = useState("");
  const search = useDebounce(text, 250);
  const { data = [], isFetching } = useQuery({
    queryKey: ["pos-items", search.trim()],
    queryFn: async () =>
      (
        await api.get("/items", {
          params: {
            search: search.trim() || undefined,
            limit: 36,
            active: "true",
          },
        })
      ).data.data as Item[],
    staleTime: 10_000,
  });
  function pick(i: Item) {
    if (i.sellable > 0) {
      onPick(i);
      setText("");
    }
  }
  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs p-4 space-y-4">
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute inset-y-0 start-3 my-auto text-[var(--mu)]"
        />
        <input
          className={`${inputClass} ps-10 pe-10 py-2.5`}
          autoFocus
          autoComplete="off"
          placeholder="ابحث باسم الصنف... (Enter يضيف أول نتيجة)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = data.find((i) => i.sellable > 0);
              if (first) pick(first);
            }
          }}
        />
        {isFetching && (
          <Loader2
            size={16}
            className="absolute inset-y-0 end-3 my-auto animate-spin text-[var(--mu)]"
          />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4 gap-2.5">
        {data.map((i) => {
          const out = i.sellable <= 0;
          const inCart = cartIds.has(i.id);
          return (
            <button
              key={i.id}
              type="button"
              disabled={out}
              onClick={() => pick(i)}
              className={`font-[inherit] text-start flex flex-col gap-1.5 p-3 rounded-[10px] border transition-colors ${
                out
                  ? "border-[var(--bd)] bg-[var(--bg)] opacity-50 cursor-not-allowed"
                  : inCart
                    ? "border-[var(--br)] bg-[var(--bs)] cursor-pointer"
                    : "border-[var(--bd)] bg-[var(--cd)] cursor-pointer hover:border-[var(--br)] hover:bg-[var(--bs)]"
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <b className="text-sm font-bold leading-snug line-clamp-2 text-[var(--tx)]">
                  {i.name}
                </b>
                {inCart && (
                  <Check
                    size={15}
                    className="shrink-0 mt-0.5 text-[var(--br)]"
                  />
                )}
              </span>
              <span className="text-sm font-bold tabular-nums text-[var(--br)]">
                {fmtNumber(i.price)} ج
                {i.unit !== "PIECE" && (
                  <span className="ms-1 text-xs font-medium text-[var(--mu)]">
                    / {bigUnitName(i.unit)}
                  </span>
                )}
              </span>
              <span
                className={`text-xs font-semibold ${
                  out || i.lowStock ? "text-[var(--da)]" : "text-[var(--mu)]"
                }`}
              >
                {out ? "نفد" : `متاح ${fmtQty(i.unit, i.sellable)}`}
              </span>
            </button>
          );
        })}
      </div>

      {data.length === 0 && (
        <div className="py-8 flex flex-col items-center gap-2 text-sm font-semibold text-[var(--mu)]">
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
            <Package size={20} />
          </span>
          {isFetching ? "جاري البحث..." : "مفيش أصناف"}
        </div>
      )}
    </div>
  );
}

/* ---------- سطر في السلة ---------- */
function CartRow({
  line,
  onChange,
  onRemove,
}: {
  line: CartLine;
  onChange: (p: Partial<CartLine>) => void;
  onRemove: () => void;
}) {
  const { item } = line;
  const hasPack = !!item.packSize;
  const mode = hasPack ? line.mode : "qty";
  const base = baseOf({ item, mode, qty: line.qty });
  const total = totalOf(line);
  const unitName = bigUnitName(item.unit);
  const qtyBad = line.qty.trim() !== "" && base === null;
  const over =
    base !== null && item.sellable !== undefined && base > item.sellable;

  function onTotal(v: string) {
    const patch: Partial<CartLine> = { total: v };
    // بيع بالمبلغ: لو الكمية فاضية والسعر معروف نحسب الكمية من المبلغ
    if (
      line.qty.trim() === "" &&
      item.unit !== "PIECE" &&
      Number(line.price) > 0 &&
      Number(v) > 0
    ) {
      patch.qty = String(
        Math.round((Number(v) / Number(line.price)) * 1000) / 1000,
      );
      patch.mode = "qty";
    }
    onChange(v === "" ? { total: null } : patch);
  }

  let hint = "";
  if (qtyBad)
    hint =
      item.unit === "PIECE" && mode === "qty"
        ? "القطع لازم عدد صحيح"
        : "الكمية غير صحيحة";
  else if (over) hint = `المتاح للبيع ${fmtQty(item.unit, item.sellable!)} بس`;
  else if (base !== null)
    hint = `= ${fmtQty(item.unit, base)}${line.total !== null ? " · إجمالي معدّل" : ""}`;
  else if (item.sellable !== undefined)
    hint = `متاح ${fmtQty(item.unit, item.sellable)} · ${priceSuffix[item.unit]}`;

  return (
    <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--cd)] shadow-xs p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <b className="truncate text-sm font-bold">{item.name}</b>
        <button
          type="button"
          title="شيل الصنف"
          aria-label={`شيل ${item.name}`}
          onClick={onRemove}
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <Field label="الكمية">
            <div className="flex items-center gap-2">
              {hasPack && (
                <div className="w-36 shrink-0">
                  <Segmented
                    label="وحدة الكمية"
                    value={mode}
                    options={[
                      { value: "qty", label: unitName },
                      { value: "pack", label: item.packName ?? "عبوة" },
                    ]}
                    onChange={(m) =>
                      onChange({ mode: m, qty: "", total: null })
                    }
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <NumInput
                  id={`qty-${line.key}`}
                  value={line.qty}
                  onChange={(v) => onChange({ qty: v, total: null })}
                  suffix={mode === "pack" ? (item.packName ?? "") : unitName}
                />
              </div>
            </div>
          </Field>
        </div>

        <Field label={`السعر${item.unit !== "PIECE" ? ` / ${unitName}` : ""}`}>
          <NumInput
            value={line.price}
            onChange={(v) => onChange({ price: v, total: null })}
            step="0.01"
            suffix="ج"
          />
        </Field>

        <Field label="الإجمالي">
          <NumInput
            value={line.total ?? (base ? String(total) : "")}
            onChange={onTotal}
            step="0.01"
            suffix="ج"
          />
        </Field>
      </div>

      {hint && (
        <p
          className={`m-0 text-xs font-medium ${
            qtyBad || over
              ? "font-semibold text-[var(--da)]"
              : "text-[var(--mu)]"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ---------- الفاتورة كلها ---------- */
export default function SaleForm({
  initial,
  presetCustomer,
  onSaved,
}: {
  initial?: SaleDetail;
  presetCustomer?: CustomerLite;
  onSaved: (sale: SaleDetail, print: boolean) => void;
}) {
  const save = useSaveSale();
  const isEdit = !!initial;

  const [customer, setCustomer] = useState<CustomerLite | null>(
    initial?.customer ?? presetCustomer ?? null,
  );
  const [date, setDate] = useState(initial ? ymdOf(initial.date) : todayYmd());
  const [discount, setDiscount] = useState(
    initial && Number(initial.discount) ? String(Number(initial.discount)) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [paid, setPaid] = useState(
    initial?.customer ? String(Number(initial.paid)) : "",
  );
  const [paidTouched, setPaidTouched] = useState(!!initial?.customer);
  const [lines, setLines] = useState<CartLine[]>(() =>
    initial ? fromSale(initial) : [],
  );
  const [initialSnap] = useState(() => snapshot(lines));
  const [error, setError] = useState("");

  // بعد إضافة صنف (أو الضغط عليه تاني) نحط المؤشر على خانة الكمية بتاعته
  const [focusKey, setFocusKey] = useState<{ key: number } | null>(null);
  useEffect(() => {
    if (focusKey) document.getElementById(`qty-${focusKey.key}`)?.focus();
  }, [focusKey]);

  const patch = (key: number, p: Partial<CartLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  function addItem(item: Item) {
    const exists = lines.find((l) => l.item.id === item.id);
    if (exists) {
      if (item.unit === "PIECE" && exists.mode === "qty")
        patch(exists.key, {
          qty: String((Number(exists.qty) || 0) + 1),
          total: null,
        });
      setFocusKey({ key: exists.key });
      return;
    }
    const l = newLine(item);
    setLines((ls) => [...ls, l]);
    if (item.unit !== "PIECE") setFocusKey({ key: l.key });
  }

  const subtotal = r2(lines.reduce((s, l) => s + totalOf(l), 0));
  const disc = Number(discount) || 0;
  const total = r2(subtotal - disc);
  const hasCustomer = customer !== null;
  const paidN = hasCustomer && paidTouched ? Number(paid) || 0 : total;
  const remaining = r2(total - paidN);
  const cartIds = new Set(lines.map((l) => l.item.id));

  async function submit(print: boolean) {
    setError("");
    if (lines.length === 0) return setError("ضيف صنف واحد على الأقل");
    if (disc < 0) return setError("الخصم مينفعش يكون بالسالب");
    if (disc > subtotal) return setError("الخصم أكبر من إجمالي الفاتورة");
    if (paidN < 0) return setError("المدفوع مينفعش يكون بالسالب");
    if (paidN > total)
      return setError(
        "المدفوع أكبر من إجمالي الفاتورة. سجّل الزيادة كدفعة من صفحة العميل",
      );
    // في التعديل: لو الأصناف ما اتغيرتش مابنبعتهاش (عشان مايتعدلش المخزون من غير داعي)
    let linesPayload: SaleLineInput[] | undefined;
    if (!isEdit || snapshot(lines) !== initialSnap) {
      const r = buildLines(lines, !isEdit);
      if (r.error) return setError(r.error);
      linesPayload = r.payload;
    }
    const input: SaleInput = {
      customerId: customer?.id ?? null,
      date,
      note: note.trim() || null,
      discount: disc,
      paid: paidN,
      ...(linesPayload && { lines: linesPayload }),
    };
    try {
      onSaved(await save.mutateAsync({ id: initial?.id, input }), print);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const customerBalance =
    customer &&
    customer.remaining !== undefined &&
    Number(customer.remaining) !== 0
      ? Number(customer.remaining)
      : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[26rem_minmax(0,1fr)] gap-4 items-start">
      {/* الأصناف (شمال في الشاشات الكبيرة) */}
      <div className="order-1 xl:order-2 space-y-3 min-w-0">
        {isEdit && (
          <Notice tone="warn">
            تعديل الأصناف بيرجّع الكميات القديمة للمخزن وبيسحب الجديدة من أقرب
            باتش بينتهي (FEFO).
          </Notice>
        )}
        <ProductPicker onPick={addItem} cartIds={cartIds} />
      </div>

      {/* الفاتورة */}
      <div className="order-2 xl:order-1 xl:sticky xl:top-4 bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-[var(--mu)]" />
            <h3 className="m-0 text-sm font-bold">الفاتورة</h3>
            <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold tabular-nums">
              {lines.length}
            </span>
          </div>
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => setLines([])}
              className="font-[inherit] flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-semibold text-[var(--da)] cursor-pointer hover:underline"
            >
              <Trash2 size={13} />
              مسح الكل
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* العميل */}
          <Field label="العميل">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <Combobox<CustomerLite>
                  value={customer}
                  cacheKey="customers"
                  fetcher={(s) => fetchParties("customers", s)}
                  getKey={(c) => c.id}
                  getLabel={(c) => c.name}
                  placeholder="عميل نقدي (اضغط للبحث عن عميل)"
                  onChange={(c) => {
                    setCustomer(c);
                    setPaidTouched(false);
                  }}
                  renderOption={(c) => (
                    <>
                      <span>{c.name}</span>
                      {Number(c.remaining) > 0 && (
                        <span className="text-xs text-[var(--da)]">
                          عليه {fmtMoney(c.remaining!)}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>
              {customer && (
                <button
                  type="button"
                  title="بيع نقدي"
                  aria-label="بيع نقدي"
                  onClick={() => {
                    setCustomer(null);
                    setPaidTouched(false);
                  }}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)] transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {customerBalance !== null && (
              <p
                className={`m-0 text-xs font-semibold ${
                  customerBalance > 0 ? "text-[var(--da)]" : "text-[var(--br)]"
                }`}
              >
                {customerBalance > 0
                  ? `عليه حالياً ${fmtMoney(customerBalance)}`
                  : `له عندنا ${fmtMoney(Math.abs(customerBalance))}`}
              </p>
            )}
          </Field>

          {/* الأصناف */}
          {lines.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-sm font-semibold text-[var(--mu)]">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                <ShoppingCart size={20} />
              </span>
              اختار الأصناف من القايمة
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[46vh] overflow-y-auto -mx-1 px-1 py-1">
              {lines.map((l) => (
                <CartRow
                  key={l.key}
                  line={l}
                  onChange={(p) => patch(l.key, p)}
                  onRemove={() =>
                    setLines((ls) => ls.filter((x) => x.key !== l.key))
                  }
                />
              ))}
            </div>
          )}

          {/* الحساب */}
          <dl className="m-0 border-t border-[var(--bd)] divide-y divide-[var(--bd)] text-sm">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="font-medium text-[var(--mu)]">المجموع</dt>
              <dd className="m-0 font-semibold tabular-nums">
                {fmtMoney(subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="font-medium text-[var(--mu)]">خصم</dt>
              <dd className="m-0 w-36">
                <NumInput
                  value={discount}
                  onChange={setDiscount}
                  step="0.01"
                  suffix="ج"
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="font-bold">الإجمالي</dt>
              <dd className="m-0 text-lg font-bold tabular-nums text-[var(--br)]">
                {fmtMoney(total)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="font-medium text-[var(--mu)]">المدفوع</dt>
              {hasCustomer ? (
                <dd className="m-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaid(String(Math.max(total, 0)));
                      setPaidTouched(true);
                    }}
                    className="font-[inherit] border-0 bg-transparent p-0 text-xs font-semibold text-[var(--br)] cursor-pointer hover:underline"
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaid("0");
                      setPaidTouched(true);
                    }}
                    className="font-[inherit] border-0 bg-transparent p-0 text-xs font-semibold text-[var(--br)] cursor-pointer hover:underline"
                  >
                    آجل
                  </button>
                  <span className="w-32">
                    <NumInput
                      value={paidTouched ? paid : String(Math.max(total, 0))}
                      onChange={(v) => {
                        setPaid(v);
                        setPaidTouched(true);
                      }}
                      step="0.01"
                      suffix="ج"
                    />
                  </span>
                </dd>
              ) : (
                <dd className="m-0 font-bold tabular-nums">
                  {fmtMoney(total)}
                </dd>
              )}
            </div>
            {hasCustomer && (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="font-medium text-[var(--mu)]">المتبقي (آجل)</dt>
                <dd
                  className={`m-0 font-bold tabular-nums ${
                    remaining > 0 ? "text-[var(--da)]" : "text-[var(--br)]"
                  }`}
                >
                  {fmtMoney(remaining)}
                </dd>
              </div>
            )}
          </dl>

          {/* ملاحظة + تاريخ */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              className={inputClass}
              placeholder="ملاحظة (اختياري)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
            <input
              className={`${inputClass} w-auto`}
              type="date"
              value={date}
              max={todayYmd()}
              onChange={(e) => setDate(e.target.value)}
              title="تاريخ الفاتورة"
            />
          </div>

          {error && <Notice tone="danger">{error}</Notice>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit(false)}
              className={`${btnBase} flex-1 border-[var(--br)] bg-[var(--br)] text-white shadow-sm hover:opacity-95`}
            >
              {save.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {save.isPending
                ? "جاري الحفظ..."
                : isEdit
                  ? "حفظ التعديلات"
                  : "حفظ"}
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit(true)}
              className={`${btnBase} flex-1 border-[var(--br)] bg-transparent text-[var(--br)] hover:bg-[var(--bs)]`}
            >
              <Printer size={16} />
              حفظ وطباعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
