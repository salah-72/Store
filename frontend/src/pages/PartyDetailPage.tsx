import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Phone,
  Pencil,
  HandCoins,
  FilePlus2,
  ShoppingCart,
  Receipt,
  Undo2,
  Wallet,
  Hourglass,
  Scale,
} from "lucide-react";
import Modal from "../components/Modal";
import { errorMessage } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { configs, type Kind } from "../features/parties/config";
import { netTotal, useParty } from "../features/parties/api";
import Balance from "../features/parties/Balance";
import PartyForm from "../features/parties/PartyForm";
import PaymentForm from "../features/parties/PaymentForm";
import StatementTable from "../features/parties/StatementTable";

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
  "font-[inherit] inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] text-sm font-semibold hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)] transition-colors cursor-pointer no-underline";

type Tone = "default" | "brand" | "danger";

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}) {
  const iconTone =
    tone === "brand"
      ? "bg-[var(--bs)] text-[var(--br)]"
      : tone === "danger"
        ? "bg-[var(--ds)] text-[var(--da)]"
        : "bg-[var(--bg)] text-[var(--mu)]";
  const valueTone =
    tone === "brand"
      ? "text-[var(--br)]"
      : tone === "danger"
        ? "text-[var(--da)]"
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

export default function PartyDetailPage({ kind }: { kind: Kind }) {
  const cfg = configs[kind];
  const id = Number(useParams().id);
  const { data: p, isPending, error } = useParty(kind, id);
  const [dialog, setDialog] = useState<"edit" | "pay" | null>(null);

  if (isPending)
    return (
      <div className="p-5 font-['Cairo',sans-serif]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <div className="h-8 w-28 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="h-7 w-56 rounded-[8px] bg-[var(--bd)] animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] rounded-[10px] bg-[var(--bd)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-48 rounded-[10px] bg-[var(--bd)] animate-pulse" />
      </div>
    );

  if (error)
    return (
      <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
        <style>{THEME_STYLE}</style>
        <Link to={`/${kind}`} className={`${backBtnClass} mb-4`}>
          <ArrowRight size={16} />
          {cfg.title}
        </Link>
        <p
          role="alert"
          className="rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] p-4 text-[var(--da)] font-semibold m-0"
        >
          {errorMessage(error)}
        </p>
      </div>
    );

  const remaining = Number(p.remaining);
  const hasOpening = Number(p.openingBalance) !== 0;

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_STYLE}</style>

      {/* زر الرجوع */}
      <div className="mb-5">
        <Link to={`/${kind}`} className={backBtnClass}>
          <ArrowRight size={16} />
          {cfg.title}
        </Link>
      </div>

      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold m-0">{p.name}</h2>
          {!p.isActive && (
            <span className="rounded-[99px] bg-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold">
              معطّل
            </span>
          )}
          {p.phone && (
            <span
              dir="ltr"
              className="inline-flex items-center gap-1.5 rounded-[99px] bg-[var(--bg)] border border-[var(--bd)] px-2.5 py-0.5 text-xs text-[var(--mu)] font-semibold tabular-nums"
            >
              <Phone size={13} />
              {p.phone}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kind === "suppliers" && (
            <Link to={`/purchases/new?supplierId=${id}`} className={outlineBtn}>
              <FilePlus2 size={16} />
              فاتورة شراء
            </Link>
          )}
          {kind === "customers" && (
            <Link to={`/pos?customerId=${id}`} className={outlineBtn}>
              <ShoppingCart size={16} />
              فاتورة بيع
            </Link>
          )}
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
            onClick={() => setDialog("pay")}
            className="font-[inherit] inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
          >
            <HandCoins size={16} />
            {kind === "customers" ? "تسجيل دفعة" : "دفعة للمورد"}
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Kpi
          icon={<Receipt size={22} />}
          label={cfg.netLabel.replace("مشترياته", "المشتريات")}
          value={fmtMoney(netTotal(p))}
        />
        <Kpi
          icon={<Undo2 size={22} />}
          label="المرتجعات"
          value={fmtMoney(p.totalReturns)}
        />
        <Kpi
          icon={<Wallet size={22} />}
          label={cfg.paidLabel}
          value={fmtMoney(p.totalPaid)}
          tone="brand"
        />
        <Kpi
          icon={<Hourglass size={22} />}
          label={
            remaining < 0
              ? kind === "customers"
                ? "رصيد دائن له"
                : "رصيد ليا عنده"
              : cfg.remainingLabel
          }
          value={<Balance kind={kind} value={p.remaining} />}
          tone={remaining > 0 ? "danger" : "brand"}
        />
      </div>

      {hasOpening && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)] px-3.5 py-2 text-xs text-[var(--mu)] font-semibold">
          <Scale size={14} />
          الرصيد الافتتاحي: {fmtMoney(p.openingBalance)}
        </div>
      )}

      {/* كشف الحساب */}
      <div className="mt-2">
        <StatementTable kind={kind} partyId={id} />
      </div>

      {dialog === "pay" && (
        <Modal title={cfg.paymentTitle} onClose={() => setDialog(null)}>
          <PaymentForm kind={kind} party={p} onDone={() => setDialog(null)} />
        </Modal>
      )}
      {dialog === "edit" && (
        <Modal title={`تعديل: ${p.name}`} onClose={() => setDialog(null)}>
          <PartyForm kind={kind} party={p} onDone={() => setDialog(null)} />
        </Modal>
      )}
    </div>
  );
}
