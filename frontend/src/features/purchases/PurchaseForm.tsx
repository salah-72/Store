import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Info, Loader2, Plus, Trash2 } from "lucide-react";
import Combobox from "../../components/Combobox";
import { errorMessage } from "../../lib/api";
import {
  bigUnitName,
  fmtMoney,
  fmtQty,
  todayYmd,
  toBaseQty,
  toDisplayQty,
  ymdOf,
  fmtSigned,
} from "../../lib/format";
import { fetchItems, type Item } from "../items/api";
import { unitName } from "../items/parts";
import { fetchParties, type Party } from "../parties/api";
import {
  useSavePurchase,
  type PurchaseDetail,
  type PurchaseInput,
  type PurchaseLineInput,
} from "./api";

type ItemLite = Pick<Item, "id" | "name" | "unit" | "packName" | "packSize">;
type SupplierLite = Pick<Party, "id" | "name">;

interface LineState {
  key: number;
  item: ItemLite | null;
  mode: "packs" | "qty"; // بالعبوات (شكاير/كراتين) ولا بالكمية مباشرة
  qty: string;
  priceMode: PriceMode; // بنكتب السعر إزاي: إجمالي السطر / سعر الوحدة / سعر العبوة
  total: string; // إجمالي سعر السطر كله (لما priceMode = total)
  price: string; // سعر الوحدة أو العبوة (لما priceMode = unit | pack)
  noExpiry: boolean;
  expiry: string;
}

type PriceMode = "total" | "unit" | "pack";

// آخر طريقة سعر اختارها المستخدم بنفتكرها للسطور الجديدة (تفضيل بسيط في المتصفح)
const PREF = "purchase.priceMode";
const savedPriceMode = (): PriceMode => {
  try {
    const v = localStorage.getItem(PREF);
    if (v === "unit" || v === "pack") return v;
  } catch {
    /* مش مشكلة */
  }
  return "total";
};
const savePriceMode = (m: PriceMode) => {
  try {
    localStorage.setItem(PREF, m);
  } catch {
    /* مش مشكلة */
  }
};

let nextKey = 1;
const blankLine = (): LineState => ({
  key: nextKey++,
  item: null,
  mode: "qty",
  qty: "",
  priceMode: savedPriceMode(),
  total: "",
  price: "",
  noExpiry: false,
  expiry: "",
});

function fromPurchase(p: PurchaseDetail): LineState[] {
  return p.lines.map((l) => {
    const usePacks =
      l.packs !== null &&
      Math.abs(l.packs * 100 - Math.round(l.packs * 100)) < 1e-9;
    return {
      key: nextKey++,
      item: l.item,
      mode: usePacks ? "packs" : "qty",
      qty: String(usePacks ? l.packs : toDisplayQty(l.item.unit, l.baseQty)),
      priceMode: "total",
      price: "",
      total: String(Number(l.lineTotal)),
      noExpiry: !l.hasExpiry,
      expiry: l.hasExpiry ? ymdOf(l.batch.expiryDate) : "",
    };
  });
}

// الكمية بالوحدة الصغيرة (قطعة/جرام/مل) أو null لو الكمية مش صحيحة
export function computeBase(
  l: Pick<LineState, "item" | "mode" | "qty">,
): number | null {
  const n = Number(l.qty);
  if (!l.item || l.qty.trim() === "" || !(n > 0)) return null;
  if (l.mode === "packs" && l.item.packSize) {
    const q = n * l.item.packSize;
    return Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : null;
  }
  if (l.item.unit === "PIECE") return Number.isInteger(n) ? n : null;
  const b = toBaseQty(l.item.unit, n);
  return Math.abs(n * 1000 - b) < 1e-6 ? b : null; // مفيش كسور أقل من 1 جرام/مل
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// إجمالي السطر الفعلي: مكتوب مباشرة، أو محسوب من سعر الوحدة/العبوة × الكمية. null لو لسه ناقص بيانات.
export function effectiveTotal(l: LineState): number | null {
  const mode =
    l.priceMode === "pack" && !l.item?.packSize ? "unit" : l.priceMode;
  if (mode === "total")
    return l.total.trim() !== "" && Number(l.total) >= 0
      ? r2(Number(l.total))
      : null;
  const base = computeBase(l);
  if (
    !l.item ||
    base === null ||
    l.price.trim() === "" ||
    !(Number(l.price) >= 0)
  )
    return null;
  if (mode === "pack") return r2((Number(l.price) * base) / l.item.packSize!);
  return r2(Number(l.price) * (l.item.unit === "PIECE" ? base : base / 1000));
}

function buildLines(lines: LineState[]): {
  payload?: PurchaseLineInput[];
  error?: string;
} {
  const today = todayYmd();
  const out: PurchaseLineInput[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i],
      n = i + 1;
    if (!l.item) return { error: `السطر ${n}: اختار الصنف` };
    const base = computeBase(l);
    if (base === null)
      return {
        error: `السطر ${n}: الكمية غير صحيحة${l.item.unit === "PIECE" && l.mode === "qty" ? " (القطع لازم عدد صحيح)" : ""}`,
      };
    const lineTotal = effectiveTotal(l);
    if (lineTotal === null)
      return {
        error: `السطر ${n}: اكتب ${l.priceMode === "total" ? "إجمالي سعر السطر" : "السعر"}`,
      };
    if (!l.noExpiry) {
      if (!l.expiry)
        return {
          error: `السطر ${n}: اكتب تاريخ الانتهاء أو اختار "بدون صلاحية"`,
        };
      if (l.expiry <= today)
        return { error: `السطر ${n}: تاريخ الانتهاء لازم يكون بعد النهارده` };
    }
    const usePacks = l.mode === "packs" && !!l.item.packSize;
    out.push({
      itemId: l.item.id,
      ...(usePacks ? { packs: Number(l.qty) } : { baseQty: base }),
      lineTotal,
      expiryDate: l.noExpiry ? null : l.expiry,
    });
  }
  return { payload: out };
}

// بنقارن بالإجمالي الفعلي (مش بطريقة الكتابة) عشان تغيير طريقة السعر بس مايتحسبش تعديل في الأسطر
const snapshot = (lines: LineState[]) =>
  JSON.stringify(
    lines.map((l) => [
      l.item?.id,
      l.mode,
      l.qty,
      effectiveTotal(l),
      l.noExpiry,
      l.expiry,
    ]),
  );
const costName = { PIECE: "القطعة", GRAM: "الكيلو", ML: "اللتر" } as const;

/* ---------- UI building blocks ---------- */

const inputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const noSpinner =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const btnBase =
  "font-[inherit] px-4 py-2 rounded-[8px] border text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--bd)]">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[var(--mu)] flex">{icon}</span>}
          <h3 className="m-0 text-sm font-bold">{title}</h3>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

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

/* أزرار اختيار جنب بعض (بديل القوائم الصغيرة) */
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
  const single = options.length === 1;
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
            disabled={single}
            onClick={() => onChange(o.value)}
            className={`font-[inherit] flex-1 min-w-0 truncate px-2 py-1.5 rounded-[6px] border text-xs font-semibold transition-colors ${
              single ? "cursor-default" : "cursor-pointer"
            } ${
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
  value,
  onChange,
  suffix,
  step = "any",
  disabled,
  placeholder = "0",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        className={`${inputClass} ${noSpinner} tabular-nums ${suffix ? "pe-14" : ""}`}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
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

/* ---------- one invoice line ---------- */

function LineEditor({
  index,
  line,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  line: LineState;
  onChange: (patch: Partial<LineState>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const item = line.item;
  const hasPack = !!item?.packSize;
  const mode = hasPack ? line.mode : "qty";
  const base = computeBase({ item, mode, qty: line.qty });
  const priceMode: PriceMode =
    line.priceMode === "pack" && !hasPack ? "unit" : line.priceMode;
  const total = effectiveTotal({ ...line, priceMode });
  const costPer =
    item && base && total !== null
      ? (total / base) * (item.unit === "PIECE" ? 1 : 1000)
      : null;
  const unitWord = item ? costName[item.unit] : "الوحدة";

  const qtyOptions: { value: "packs" | "qty"; label: string }[] = hasPack
    ? [
        { value: "packs", label: item!.packName ?? "عبوة" },
        { value: "qty", label: bigUnitName(item!.unit) },
      ]
    : [
        {
          value: "qty",
          label: item ? bigUnitName(item.unit) : "الكمية",
        },
      ];
  const qtySuffix = item
    ? mode === "packs"
      ? (item.packName ?? "")
      : bigUnitName(item.unit)
    : "";

  const priceOptions: { value: PriceMode; label: string }[] = [
    { value: "total", label: "الإجمالي" },
    { value: "unit", label: `سعر ${unitWord}` },
    ...(hasPack
      ? [{ value: "pack" as const, label: `سعر ${item!.packName}` }]
      : []),
  ];

  // تغيير طريقة السعر: بنحوّل الرقم الحالي للطريقة الجديدة عشان مايضيعش
  function switchPriceMode(next: PriceMode) {
    savePriceMode(next);
    const patch: Partial<LineState> = { priceMode: next };
    if (total !== null && base) {
      if (next === "total") patch.total = String(total);
      else if (next === "unit")
        patch.price = String(
          Math.round(
            (total / (item!.unit === "PIECE" ? base : base / 1000)) * 10000,
          ) / 10000,
        );
      else if (item?.packSize)
        patch.price = String(
          Math.round(((total * item.packSize) / base) * 10000) / 10000,
        );
    }
    onChange(patch);
  }

  let qtyError = "";
  if (item && base === null && line.qty.trim() !== "")
    qtyError =
      mode === "packs"
        ? "العدد ده مش بيطلع كمية صحيحة"
        : item.unit === "PIECE"
          ? "القطع لازم عدد صحيح"
          : "الكمية غير صحيحة";

  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs overflow-hidden">
      {/* head */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--bd)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)] text-xs font-bold tabular-nums">
            {index + 1}
          </span>
          <span className="truncate text-sm font-bold">
            {item ? item.name : "صنف جديد"}
          </span>
          {item && (
            <span className="hidden sm:inline truncate text-xs font-medium text-[var(--mu)]">
              {unitName[item.unit]}
              {item.packName && item.packSize
                ? ` · ${item.packName} = ${fmtQty(item.unit, item.packSize)}`
                : ""}
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            title="حذف السطر"
            aria-label={`حذف السطر ${index + 1}`}
            onClick={onRemove}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)] transition-colors"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* body */}
      <div className="p-4 space-y-4">
        <Field label="الصنف">
          <Combobox<ItemLite>
            value={item}
            cacheKey="items"
            fetcher={fetchItems}
            getKey={(i) => i.id}
            getLabel={(i) => i.name}
            placeholder="ابحث باسم الصنف..."
            onChange={(i) =>
              onChange({ item: i, mode: i.packSize ? "packs" : "qty", qty: "" })
            }
            renderOption={(i) => (
              <>
                <span>{i.name}</span>
                <span className="text-xs text-[var(--mu)]">
                  {unitName[i.unit]}
                  {i.packName && i.packSize
                    ? ` · ${i.packName} = ${fmtQty(i.unit, i.packSize)}`
                    : ""}
                </span>
              </>
            )}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="الكمية">
            <Segmented
              label="وحدة الكمية"
              value={mode}
              options={qtyOptions}
              onChange={(m) => onChange({ mode: m, qty: "" })}
            />
            <NumInput
              value={line.qty}
              onChange={(v) => onChange({ qty: v })}
              suffix={qtySuffix}
              disabled={!item}
            />
          </Field>

          <Field label="السعر">
            <Segmented
              label="طريقة كتابة السعر"
              value={priceMode}
              options={priceOptions}
              onChange={switchPriceMode}
            />
            <NumInput
              value={priceMode === "total" ? line.total : line.price}
              onChange={(v) =>
                onChange(
                  priceMode === "total"
                    ? { total: v, priceMode }
                    : { price: v, priceMode },
                )
              }
              // الإجمالي بيتقفل على قرشين، لكن سعر الوحدة/العبوة ممكن يبقى فيه كسور أكتر
              step={priceMode === "total" ? "0.01" : "any"}
              suffix="ج"
            />
          </Field>

          <Field label="الصلاحية">
            <Segmented
              label="الصلاحية"
              value={line.noExpiry ? "none" : "date"}
              options={[
                { value: "date", label: "تاريخ انتهاء" },
                { value: "none", label: "بدون صلاحية" },
              ]}
              onChange={(v) =>
                onChange({
                  noExpiry: v === "none",
                  expiry: v === "none" ? "" : line.expiry,
                })
              }
            />
            <input
              className={inputClass}
              type="date"
              value={line.expiry}
              onChange={(e) => onChange({ expiry: e.target.value })}
              disabled={line.noExpiry}
            />
          </Field>
        </div>
      </div>

      {/* footer: computed values for this line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 border-t border-[var(--bd)] bg-[var(--bg)] text-xs font-medium text-[var(--mu)]">
        {!item && <span>اختار الصنف الأول</span>}
        {qtyError && (
          <span className="font-semibold text-[var(--da)]">{qtyError}</span>
        )}
        {item && !qtyError && base !== null && (
          <span>
            الكمية ={" "}
            <b className="tabular-nums text-[var(--tx)]">
              {fmtQty(item.unit, base)}
            </b>
          </span>
        )}
        {item && costPer !== null && priceMode !== "unit" && (
          <span>
            تكلفة {costName[item.unit]}:{" "}
            <b className="tabular-nums text-[var(--tx)]">
              {fmtMoney(r2(costPer))}
            </b>
          </span>
        )}
        <span className="ms-auto">
          إجمالي السطر:{" "}
          <b className="text-sm tabular-nums text-[var(--tx)]">
            {total !== null ? fmtMoney(total) : "—"}
          </b>
        </span>
      </div>
    </div>
  );
}

/* ---------- the form ---------- */

export default function PurchaseForm({
  initial,
  presetSupplier,
}: {
  initial?: PurchaseDetail;
  presetSupplier?: SupplierLite;
}) {
  const navigate = useNavigate();
  const save = useSavePurchase();
  const isEdit = !!initial;

  const [supplier, setSupplier] = useState<SupplierLite | null>(
    initial?.supplier ?? presetSupplier ?? null,
  );
  const [date, setDate] = useState(initial ? ymdOf(initial.date) : todayYmd());
  const [discount, setDiscount] = useState(
    initial && Number(initial.discount) ? String(Number(initial.discount)) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [paid, setPaid] = useState(
    initial && Number(initial.paid) ? String(Number(initial.paid)) : "",
  );
  const [lines, setLines] = useState<LineState[]>(() =>
    initial ? fromPurchase(initial) : [blankLine()],
  );
  const [initialSnap] = useState(() => snapshot(lines));
  const [error, setError] = useState("");

  const patch = (key: number, p: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const subtotal = r2(lines.reduce((s, l) => s + (effectiveTotal(l) ?? 0), 0));
  const disc = Number(discount) || 0;
  const total = r2(subtotal - disc);
  const paidN = Number(paid) || 0;
  const remaining = r2(total - paidN);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!supplier) return setError("اختار المورد");
    // في التعديل: لو الأسطر ما اتغيرتش مابنبعتهاش (عشان فاتورة فيها باتش انتهى تفضل قابلة للتعديل)
    let linesPayload: PurchaseLineInput[] | undefined;
    if (!isEdit || snapshot(lines) !== initialSnap) {
      const r = buildLines(lines);
      if (r.error) return setError(r.error);
      linesPayload = r.payload;
    }
    if (disc < 0 || paidN < 0)
      return setError("الخصم والمدفوع مينفعش يكونوا بالسالب");
    if (disc > subtotal) return setError("الخصم أكبر من إجمالي الفاتورة");

    const input: PurchaseInput = {
      supplierId: supplier.id,
      date,
      note: note.trim() || null,
      paid: paidN,
      discount: disc,
      ...(linesPayload && { lines: linesPayload }),
    };
    try {
      const res = await save.mutateAsync({ id: initial?.id, input });
      navigate(`/purchases/${res.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {isEdit && (
        <Notice tone="warn">
          تعديل الأصناف بيعدّل الباتشات في المخزن. لو جزء من الكمية القديمة
          اتباع أو اترجّع مش هتقدر تقلّلها تحته.
        </Notice>
      )}

      {/* invoice info */}
      <Section title="بيانات الفاتورة" icon={<FileText size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="المورد">
            <Combobox<SupplierLite>
              value={supplier}
              cacheKey="suppliers"
              fetcher={(s) => fetchParties("suppliers", s)}
              getKey={(s) => s.id}
              getLabel={(s) => s.name}
              placeholder="ابحث باسم المورد..."
              autoFocus={!supplier}
              onChange={setSupplier}
            />
          </Field>
          <Field label="التاريخ">
            <input
              className={inputClass}
              type="date"
              value={date}
              max={todayYmd()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="خصم المورد">
            <NumInput
              value={discount}
              onChange={setDiscount}
              step="0.01"
              suffix="ج"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="ملاحظة (اختياري)">
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </Field>
        </div>
      </Section>

      {/* lines */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-sm font-bold">الأصناف</h3>
          <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold tabular-nums">
            {lines.length}
          </span>
        </div>

        {lines.map((l, i) => (
          <LineEditor
            key={l.key}
            index={i}
            line={l}
            canRemove={lines.length > 1}
            onChange={(p) => patch(l.key, p)}
            onRemove={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
          />
        ))}

        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, blankLine()])}
          className="font-[inherit] w-full flex items-center justify-center gap-2 py-3 rounded-[10px] border border-dashed border-[var(--br)] bg-transparent text-[var(--br)] text-sm font-semibold cursor-pointer hover:bg-[var(--bs)] transition-colors"
        >
          <Plus size={17} />
          إضافة صنف
        </button>

        <Notice tone="info">
          لو نفس الصنف بنفس تاريخ الانتهاء وبنفس التكلفة اتورد قبل كده، الكمية
          بتتضاف على نفس الباتش.
        </Notice>
      </div>

      {/* totals */}
      <Section title="الحساب">
        <dl className="m-0 md:max-w-sm md:ms-auto divide-y divide-[var(--bd)] text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-[var(--mu)]">المجموع</dt>
            <dd className="m-0 font-semibold tabular-nums">
              {fmtMoney(subtotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-[var(--mu)]">الخصم</dt>
            <dd className="m-0 font-semibold tabular-nums">
              {disc ? fmtSigned("-", disc) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="font-bold">الإجمالي</dt>
            <dd className="m-0 text-lg font-bold tabular-nums text-[var(--br)]">
              {fmtMoney(total)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-[var(--mu)]">المدفوع</dt>
            <dd className="m-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaid(String(Math.max(total, 0)))}
                className="font-[inherit] border-0 bg-transparent p-0 text-xs font-semibold text-[var(--br)] cursor-pointer hover:underline"
              >
                دفع الكل
              </button>
              <span className="w-36">
                <NumInput
                  value={paid}
                  onChange={setPaid}
                  step="0.01"
                  suffix="ج"
                />
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-[var(--mu)]">
              {remaining < 0 ? "زيادة (ليك عند المورد)" : "المتبقي (آجل)"}
            </dt>
            <dd
              className={`m-0 font-bold tabular-nums ${
                remaining > 0 ? "text-[var(--da)]" : "text-[var(--br)]"
              }`}
            >
              {fmtMoney(Math.abs(remaining))}
            </dd>
          </div>
        </dl>
      </Section>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={save.isPending}
          className={`${btnBase} border-[var(--bd)] bg-transparent text-[var(--tx)] hover:bg-[var(--bs)]`}
        >
          إلغاء
        </button>
        <button
          disabled={save.isPending}
          className={`${btnBase} border-[var(--br)] bg-[var(--br)] text-white shadow-sm hover:opacity-95`}
        >
          {save.isPending && <Loader2 size={16} className="animate-spin" />}
          {save.isPending
            ? "جاري الحفظ..."
            : isEdit
              ? "حفظ التعديلات"
              : "حفظ وإضافة للمخزن"}
        </button>
      </div>
    </form>
  );
}
