import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  SlidersHorizontal,
  X,
  RotateCcw,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import Combobox from "../components/Combobox";
import Confirm from "../components/Confirm";
import Modal from "../components/Modal";
import { Pager } from "../components/ui";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney } from "../lib/format";
import { fetchParties, type Party } from "../features/parties/api";
import type { Kind } from "../features/parties/config";
import PaymentForm from "../features/parties/PaymentForm";
import {
  useDeletePayment,
  usePayments,
  type PaymentRow,
} from "../features/payments/api";
import PaymentEditForm from "../features/payments/PaymentEditForm";

type PayType = "" | "customer" | "supplier";

const TYPE_OPTIONS: { value: PayType; label: string }[] = [
  { value: "", label: "كل الدفعات" },
  { value: "customer", label: "من العملاء" },
  { value: "supplier", label: "للموردين" },
];

const DEFAULT_FILTER = { from: "", to: "", page: 1 };

const dateInputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

// نافذة تسجيل دفعة جديدة: اختار نوع الطرف، بعدين الطرف، وبعدها نفس نموذج الدفعة اللي في صفحة العميل/المورد
function NewPayment({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<Kind>("customers");
  const [party, setParty] = useState<Party | null>(null);
  return (
    <div className="stack">
      <div className="flex gap-2">
        <button
          type="button"
          className={`btn ${kind === "customers" ? "" : "outline"} full`}
          onClick={() => {
            setKind("customers");
            setParty(null);
          }}
        >
          دفعة من عميل
        </button>
        <button
          type="button"
          className={`btn ${kind === "suppliers" ? "" : "outline"} full`}
          onClick={() => {
            setKind("suppliers");
            setParty(null);
          }}
        >
          دفعة لمورد
        </button>
      </div>
      <div>
        <label className="label">
          {kind === "customers" ? "العميل" : "المورد"}
        </label>
        <Combobox<Party>
          key={kind}
          value={party}
          cacheKey={kind}
          fetcher={(s) => fetchParties(kind, s)}
          getKey={(p) => p.id}
          getLabel={(p) => p.name}
          placeholder="ابحث بالاسم..."
          autoFocus
          onChange={setParty}
        />
      </div>
      {party && (
        <PaymentForm
          key={`${kind}-${party.id}`}
          kind={kind}
          party={party}
          onDone={onDone}
        />
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const [type, setType] = useState<PayType>("");
  const [party, setParty] = useState<Pick<Party, "id" | "name"> | null>(null);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [dialog, setDialog] = useState<
    "new" | { edit: PaymentRow } | { del: PaymentRow } | null
  >(null);
  const del = useDeletePayment();
  const { data, isPending, isFetching, error } = usePayments({
    type,
    partyId: party?.id,
    ...filter,
  });
  const update = (patch: Partial<typeof filter>) =>
    setFilter((f) => ({ ...f, page: 1, ...patch }));
  const kind: Kind | null =
    type === "customer"
      ? "customers"
      : type === "supplier"
        ? "suppliers"
        : null;

  const activeFiltersCount =
    (type ? 1 : 0) +
    (party ? 1 : 0) +
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0);

  function resetFilters() {
    setType("");
    setParty(null);
    setFilter(DEFAULT_FILTER);
  }

  const headers = [
    "#",
    "التاريخ",
    "النوع",
    "الطرف",
    "المبلغ",
    "ملاحظة",
    "الإجراءات",
  ];

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
          <h2 className="text-xl font-bold m-0">الدفعات</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {data
              ? `إجمالي ${data.meta.total} دفعة مطابقة`
              : "الدفعات المستلمة من العملاء والمدفوعة للموردين"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog("new")}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          دفعة
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--mu)]" />
            <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">
              فلترة الدفعات
            </span>
            {activeFiltersCount > 0 && (
              <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
                {activeFiltersCount} فلتر مفعّل
              </span>
            )}
            {isFetching && !isPending && (
              <span className="flex items-center gap-1 text-xs text-[var(--mu)]">
                <Loader2 size={13} className="animate-spin" />
                جاري التحديث...
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-[inherit] flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-[var(--bd)] bg-transparent text-[var(--da)] text-xs font-semibold cursor-pointer hover:bg-[var(--ds)] transition-colors"
            >
              <RotateCcw size={13} />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              نوع الدفعة
            </label>
            <div
              role="radiogroup"
              className="flex items-center gap-1 p-1 bg-[var(--bg)] border border-[var(--bd)] rounded-[10px]"
            >
              {TYPE_OPTIONS.map((o) => {
                const selected = type === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setType(o.value);
                      setParty(null);
                      update({});
                    }}
                    className={`font-[inherit] flex-1 px-3 py-1.5 rounded-[7px] border-0 text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                      selected
                        ? "bg-[var(--cd)] text-[var(--br)] shadow-sm"
                        : "bg-transparent text-[var(--mu)] hover:text-[var(--tx)]"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Party */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              {kind === "suppliers" ? "المورد" : "العميل"}
            </label>
            {kind ? (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <Combobox<Pick<Party, "id" | "name">>
                    key={kind}
                    value={party}
                    cacheKey={kind}
                    fetcher={(s) => fetchParties(kind, s)}
                    getKey={(p) => p.id}
                    getLabel={(p) => p.name}
                    placeholder={
                      kind === "customers" ? "كل العملاء" : "كل الموردين"
                    }
                    onChange={(p) => {
                      setParty(p);
                      update({});
                    }}
                  />
                </div>
                {party && (
                  <button
                    type="button"
                    title="مسح"
                    aria-label="مسح"
                    onClick={() => {
                      setParty(null);
                      update({});
                    }}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)] transition-colors"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 rounded-[8px] border border-dashed border-[var(--bd)] bg-[var(--bg)] text-xs text-[var(--mu)] font-medium">
                اختار نوع الدفعة الأول عشان تفلتر بطرف معيّن
              </div>
            )}
          </div>

          {/* From */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              من تاريخ
            </label>
            <input
              type="date"
              className={dateInputClass}
              value={filter.from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              إلى تاريخ
            </label>
            <input
              type="date"
              className={dateInputClass}
              value={filter.to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Sum */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 shadow-xs flex items-center gap-3 sm:col-span-2 lg:col-span-1">
            <span className="w-11 h-11 shrink-0 flex items-center justify-center rounded-[10px] bg-[var(--bs)] text-[var(--br)]">
              <Coins size={22} />
            </span>
            <div className="min-w-0">
              <span className="block text-xs text-[var(--mu)] font-medium mb-0.5">
                إجمالي الدفعات في النتيجة ({data.meta.total})
              </span>
              <span className="block text-xl font-bold tabular-nums text-[var(--br)] truncate">
                {fmtMoney(data.sum)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 font-semibold ${
                    i === headers.length - 1 ? "text-left" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--bd)]">
                  {headers.map((_h, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-3.5 w-full max-w-[90px] rounded-[99px] bg-[var(--bd)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isPending && error && (
              <tr>
                <td
                  colSpan={7}
                  className="p-10 text-center text-[var(--da)] font-semibold"
                >
                  {errorMessage(error)}
                </td>
              </tr>
            )}

            {!isPending && !error && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[var(--mu)]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
                      <Wallet size={24} />
                    </span>
                    <span className="font-semibold text-[var(--tx)]">
                      مفيش دفعات
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="font-[inherit] flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[var(--br)] bg-transparent text-[var(--br)] text-xs font-semibold cursor-pointer hover:bg-[var(--bs)] transition-colors"
                      >
                        <RotateCcw size={13} />
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {data?.items.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
              >
                <td className="px-4 py-3 font-bold tabular-nums">{p.id}</td>
                <td className="px-4 py-3 text-[var(--mu)]">
                  {fmtDate(p.date)}
                </td>
                <td className="px-4 py-3">
                  {p.direction === "IN" ? (
                    <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2.5 py-0.5 text-xs font-semibold">
                      <ArrowDownLeft size={13} />
                      مستلمة من عميل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-[99px] bg-[var(--ws)] text-[var(--wa)] px-2.5 py-0.5 text-xs font-semibold">
                      <ArrowUpRight size={13} />
                      مدفوعة لمورد
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/${p.type === "CUSTOMER" ? "customers" : "suppliers"}/${p.party.id}`}
                    className="text-[var(--br)] font-bold no-underline hover:underline"
                  >
                    {p.party.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  {fmtMoney(p.amount)}
                </td>
                <td className="px-4 py-3 text-[var(--mu)] max-w-[240px] truncate">
                  {p.note || "—"}
                </td>
                <td className="px-4 py-3 text-left">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      title="تعديل"
                      aria-label="تعديل"
                      onClick={() => setDialog({ edit: p })}
                      className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] cursor-pointer hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      aria-label="حذف"
                      onClick={() => setDialog({ del: p })}
                      className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--da)] cursor-pointer hover:border-[var(--da)] hover:bg-[var(--ds)] transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <Pager
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            onPage={(p) => setFilter((f) => ({ ...f, page: p }))}
          />
        </div>
      )}

      {dialog === "new" && (
        <Modal title="تسجيل دفعة" onClose={() => setDialog(null)}>
          <NewPayment onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog && typeof dialog === "object" && "edit" in dialog && (
        <Modal
          title={`تعديل دفعة #${dialog.edit.id}`}
          onClose={() => setDialog(null)}
        >
          <PaymentEditForm
            payment={dialog.edit}
            onDone={() => setDialog(null)}
          />
        </Modal>
      )}
      {dialog && typeof dialog === "object" && "del" in dialog && (
        <Confirm
          title="حذف الدفعة"
          confirmLabel="حذف"
          message={`هتتمسح دفعة ${fmtMoney(dialog.del.amount)} (${dialog.del.party.name}) ورصيده هيرجع زي ما كان قبلها.`}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await del.mutateAsync(dialog.del.id);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
