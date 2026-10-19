import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Pencil,
  Trash2,
  CalendarDays,
  User,
  FileText,
  StickyNote,
  Undo2,
  Banknote,
  Hourglass,
  Layers,
  CheckCircle2,
} from "lucide-react";
import Confirm from "../components/Confirm";
import Modal from "../components/Modal";
import { FormActions } from "../components/ui";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney, fmtQty, todayYmd, ymdOf } from "../lib/format";
import {
  returnCfg,
  useDeleteReturn,
  useReturn,
  useUpdateReturn,
  type ReturnDetail,
  type ReturnKind,
} from "../features/returns/api";

const THEME_STYLE = `
  :root {
    --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
  }
  @media(prefers-color-scheme: dark){
    :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
  }
`;

const backBtnClass =
  "font-[inherit] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:bg-[var(--bs)] hover:border-[var(--br)] hover:text-[var(--br)] transition-colors cursor-pointer no-underline";

const outlineBtn =
  "font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors cursor-pointer";

const linkClass = "text-[var(--br)] font-bold no-underline hover:underline";

type Tone = "default" | "brand" | "warn";

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const iconTone =
    tone === "brand"
      ? "bg-[var(--bs)] text-[var(--br)]"
      : tone === "warn"
        ? "bg-[var(--ws)] text-[var(--wa)]"
        : "bg-[var(--bg)] text-[var(--mu)]";
  const valueTone =
    tone === "brand"
      ? "text-[var(--br)]"
      : tone === "warn"
        ? "text-[var(--wa)]"
        : "text-[var(--tx)]";

  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 shadow-xs flex items-center gap-3">
      <span
        className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-[10px] ${iconTone}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <span className="block text-xs text-[var(--mu)] font-medium mb-0.5">
          {label}
        </span>
        <span
          className={`block text-xl font-bold tabular-nums truncate ${valueTone}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function EditForm({
  kind,
  r,
  onDone,
}: {
  kind: ReturnKind;
  r: ReturnDetail;
  onDone: () => void;
}) {
  const save = useUpdateReturn(kind);
  const [date, setDate] = useState(ymdOf(r.date));
  const [note, setNote] = useState(r.note ?? "");
  const [cash, setCash] = useState(String(Number(r.cashRefund)));
  const [error, setError] = useState("");
  const noParty = kind === "sale" && !r.customerId;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await save.mutateAsync({
        id: r.id,
        input: {
          date,
          note: note.trim() || null,
          ...(!noParty && { cashRefund: Number(cash) || 0 }),
        },
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      <p className="hint" style={{ margin: 0 }}>
        الأصناف والكميات مبتتعدّلش. لو غلطت فيها امسح المرتجع وسجّله من الأول.
      </p>
      <div>
        <label className="label">التاريخ</label>
        <input
          className="input full"
          type="date"
          value={date}
          max={todayYmd()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {!noParty && (
        <div>
          <label className="label">
            {returnCfg[kind].cashLabel} (من {fmtMoney(r.total)})
          </label>
          <div className="flex gap-2">
            <input
              className="input full"
              type="number"
              min="0"
              step="0.01"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            <button
              type="button"
              className="btn outline"
              onClick={() => setCash(String(Number(r.total)))}
            >
              الكل
            </button>
          </div>
        </div>
      )}
      <div>
        <label className="label">ملاحظة</label>
        <input
          className="input full"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <FormActions onCancel={onDone} busy={save.isPending} />
    </form>
  );
}

export default function ReturnDetailPage() {
  const { kind: k, id: idStr } = useParams();
  const kind: ReturnKind = k === "purchase" ? "purchase" : "sale";
  const id = Number(idStr);
  const cfg = returnCfg[kind];
  const navigate = useNavigate();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const { data: r, isPending, error } = useReturn(kind, id);
  const del = useDeleteReturn(kind);
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  const back = `/returns?kind=${kind}`;

  if (isPending)
    return (
      <div className="p-5 font-['Cairo',sans-serif]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <div className="h-8 w-28 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="h-7 w-56 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] rounded-[10px] bg-[var(--bd)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-40 rounded-[10px] bg-[var(--bd)] animate-pulse" />
      </div>
    );

  if (error)
    return (
      <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <Link to={back} className={`${backBtnClass} mb-4`}>
          <ArrowRight size={16} />
          المرتجعات
        </Link>
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      </div>
    );

  const party = r[cfg.partyKey];
  const inv = r[kind === "sale" ? "sale" : "purchase"];
  const credit =
    Math.round((Number(r.total) - Number(r.cashRefund)) * 100) / 100;

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_STYLE}</style>

      {/* زر الرجوع */}
      <div className="mb-5">
        <Link to={back} className={backBtnClass}>
          <ArrowRight size={16} />
          المرتجعات
        </Link>
      </div>

      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold m-0">
            {cfg.single} #{r.id}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-[99px] bg-[var(--bg)] border border-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
            <CalendarDays size={13} />
            {fmtDate(r.date)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDialog("edit")}
            className={outlineBtn}
          >
            <Pencil size={16} />
            تعديل
          </button>
          <button
            type="button"
            onClick={() => setDialog("delete")}
            className="font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--da)] bg-[var(--cd)] text-[var(--da)] text-sm font-semibold hover:bg-[var(--ds)] transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      </div>

      {/* إشعار النجاح */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2.5 rounded-[8px] border border-[var(--br)] bg-[var(--bs)] px-4 py-2.5 text-sm text-[var(--br)] font-semibold"
        >
          <CheckCircle2 size={17} className="shrink-0" />
          {notice}
        </div>
      )}

      {/* الطرف والفاتورة */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-4 mb-5 shadow-xs space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="flex items-center gap-2 m-0 font-semibold">
            <User size={16} className="text-[var(--br)]" />
            <span className="text-[var(--mu)] font-medium">
              {cfg.partyLabel}:
            </span>
            {party ? (
              <Link to={`/${cfg.partyPath}/${party.id}`} className={linkClass}>
                {party.name}
              </Link>
            ) : (
              <span className="text-[var(--mu)]">نقدي</span>
            )}
          </p>
          {inv && (
            <p className="flex items-center gap-2 m-0 font-semibold">
              <FileText size={16} className="text-[var(--br)]" />
              <span className="text-[var(--mu)] font-medium">
                {cfg.invoice}:
              </span>
              <Link to={`/${cfg.invoicePath}/${inv.id}`} className={linkClass}>
                #{inv.id}
              </Link>
            </p>
          )}
        </div>
        {r.note && (
          <p className="flex items-start gap-2 m-0 text-[var(--mu)] leading-relaxed">
            <StickyNote size={16} className="shrink-0 mt-0.5" />
            {r.note}
          </p>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Kpi
          icon={<Undo2 size={22} />}
          label="قيمة المرتجع"
          value={fmtMoney(r.total)}
        />
        <Kpi
          icon={<Banknote size={22} />}
          label={cfg.cashLabel}
          value={fmtMoney(r.cashRefund)}
          tone="brand"
        />
        <Kpi
          icon={<Hourglass size={22} />}
          label={cfg.creditLabel}
          value={fmtMoney(credit)}
          tone={credit > 0 ? "warn" : "default"}
        />
      </div>

      {/* الأصناف */}
      <h3 className="flex items-center gap-2 text-base font-bold mb-3">
        <Layers size={18} className="text-[var(--br)]" />
        الأصناف
        <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold">
          {r.lines.length}
        </span>
      </h3>

      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {["الصنف", "الكمية", "القيمة"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l) => (
              <tr
                key={l.id}
                className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link to={`/items/${l.item.id}`} className={linkClass}>
                    {l.item.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  {fmtQty(l.item.unit, l.baseQty)}
                </td>
                <td className="px-4 py-3 font-bold tabular-nums">
                  {fmtMoney(l.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog === "edit" && (
        <Modal
          title={`تعديل ${cfg.single} #${r.id}`}
          onClose={() => setDialog(null)}
        >
          <EditForm kind={kind} r={r} onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog === "delete" && (
        <Confirm
          title="حذف المرتجع"
          confirmLabel="حذف المرتجع"
          message={
            kind === "sale"
              ? "هيتمسح المرتجع وكمياته هتتشال من المخزن تاني. لو الكمية دي اتباعت تاني مش هيتمسح."
              : "هيتمسح المرتجع وكمياته هترجع للمخزن تاني."
          }
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await del.mutateAsync(r.id);
            navigate(back, { replace: true });
          }}
        />
      )}
    </div>
  );
}
