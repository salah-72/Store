import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Boxes,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { errorMessage } from "../lib/api";
import { fmtDate, fmtMoney, fmtQty } from "../lib/format";
import { useDashboard } from "../features/stats/api";
import { useAuth } from "../auth/AuthContext";

type Tone = "ok" | "warn" | "danger" | "mute";

const TONE: Record<Tone, { fg: string; bg: string }> = {
  ok: { fg: "text-[var(--br)]", bg: "bg-[var(--bs)]" },
  warn: { fg: "text-[var(--wa)]", bg: "bg-[var(--ws)]" },
  danger: { fg: "text-[var(--da)]", bg: "bg-[var(--ds)]" },
  mute: { fg: "text-[var(--tx)]", bg: "bg-[var(--bg)]" },
};

const THEME_CSS = `
  :root {
    --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
  }
  @media(prefers-color-scheme: dark){
    :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
  }
`;

/* ---------- small building blocks ---------- */

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_CSS}</style>
      {children}
    </div>
  );
}

function Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl font-bold m-0">{title}</h2>
        <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
          {subtitle}
        </p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 rounded-[99px] px-2.5 py-0.5 text-xs font-semibold ${TONE[tone].bg} ${TONE[tone].fg}`}
    >
      {children}
    </span>
  );
}

function Kpi({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: ReactNode;
  tone: Tone;
  icon: ReactNode;
}) {
  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs p-4 flex items-start gap-3 min-w-0">
      <span
        className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-[8px] ${TONE[tone].bg} ${TONE[tone].fg}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-[var(--mu)] leading-snug">
          {label}
        </div>
        <div
          className={`mt-1 text-xl font-bold tabular-nums truncate ${TONE[tone].fg}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  badge,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: { to: string; label: string };
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[var(--bd)]">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-[var(--mu)] flex">{icon}</span>}
          <h3 className="m-0 text-sm font-bold">{title}</h3>
          {badge}
        </div>
        {action && (
          <Link
            to={action.to}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--br)] no-underline hover:underline whitespace-nowrap"
          >
            {action.label}
            <ArrowLeft size={13} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="py-6 flex flex-col items-center gap-2 text-sm font-semibold text-[var(--mu)]">
      <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)]">
        <CheckCircle2 size={20} />
      </span>
      {children}
    </div>
  );
}

function RowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="min-w-0 truncate text-sm font-semibold text-[var(--tx)] no-underline hover:text-[var(--br)] transition-colors"
    >
      {children}
    </Link>
  );
}

function AlertGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-3 last:mb-0">
      <h4 className="m-0 mb-1 text-xs font-bold text-[var(--mu)]">{title}</h4>
      <ul className="m-0 p-0 list-none divide-y divide-[var(--bd)]">
        {children}
      </ul>
    </section>
  );
}

const ROW = "flex items-center justify-between gap-3 py-2";

function DayBars({ rows }: { rows: { day: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (
    <div className="flex items-stretch gap-2 h-40">
      {rows.map((r) => {
        const pct =
          r.value === 0 ? 0 : Math.max((Math.abs(r.value) / max) * 100, 3);
        return (
          <div
            key={r.day}
            title={`${fmtDate(r.day)}: ${fmtMoney(r.value)}`}
            className="flex-1 min-w-0 flex flex-col items-center gap-1.5"
          >
            <div className="flex-1 min-h-0 w-full flex items-end justify-center">
              <div
                className={`w-full max-w-[36px] rounded-t-[6px] transition-[height] ${
                  r.value < 0 ? "bg-[var(--da)]" : "bg-[var(--br)]"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-[var(--mu)] tabular-nums whitespace-nowrap">
              {fmtDate(r.day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: d, isPending, error } = useDashboard();

  if (isPending)
    return (
      <Shell>
        <Header title="لوحة التحكم" subtitle="ملخص المبيعات والمخزون" />
        <div className="flex items-center gap-2 text-sm text-[var(--mu)]">
          <Loader2 size={16} className="animate-spin" />
          جاري التحميل...
        </div>
      </Shell>
    );

  if (error)
    return (
      <Shell>
        <Header title="لوحة التحكم" subtitle="ملخص المبيعات والمخزون" />
        <div className="p-10 text-center text-[var(--da)] font-semibold bg-[var(--cd)] border border-[var(--bd)] rounded-[10px]">
          {errorMessage(error)}
        </div>
      </Shell>
    );

  const profit = Number(d.month.netProfit);
  const a = d.alerts;
  const alertsTotal = a.lowStock.count + a.nearExpiry.count + a.expired.count;
  const noAlerts = alertsTotal === 0;

  return (
    <Shell>
      <Header
        title={`أهلاً ${user?.username ?? ""} `}
        subtitle="ملخص النهارده والشهر"
        actions={
          <>
            <Link
              to="/pos"
              className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center gap-2 no-underline"
            >
              <Receipt size={18} />
              كاشير
            </Link>
            <Link
              to="/purchases/new"
              className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-transparent text-[var(--br)] text-sm font-semibold hover:bg-[var(--bs)] transition-colors flex items-center gap-2 no-underline"
            >
              <Plus size={18} />
              فاتورة شراء
            </Link>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
        <Kpi
          label={`مبيعات النهارده (${d.today.salesCount} فاتورة)`}
          value={fmtMoney(d.today.net)}
          tone="ok"
          icon={<Wallet size={20} />}
        />
        <Kpi
          label="صافي ربح الشهر"
          value={fmtMoney(d.month.netProfit)}
          tone={profit < 0 ? "danger" : "ok"}
          icon={<TrendingUp size={20} />}
        />
        <Kpi
          label={`مديونيات العملاء (${d.receivables.count})`}
          value={fmtMoney(d.receivables.total)}
          tone="warn"
          icon={<Users size={20} />}
        />
        <Kpi
          label={`مستحقات الموردين (${d.payables.count})`}
          value={fmtMoney(d.payables.total)}
          tone={Number(d.payables.total) > 0 ? "danger" : "mute"}
          icon={<Truck size={20} />}
        />
        <Kpi
          label="قيمة المخزون (بالتكلفة)"
          value={fmtMoney(d.stock.value)}
          tone="mute"
          icon={<Boxes size={20} />}
        />
      </div>

      {/* Chart + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start mb-5">
        <Card title="صافي مبيعات آخر 7 أيام" icon={<TrendingUp size={16} />}>
          <DayBars
            rows={d.last7Days.map((x) => ({
              day: x.day,
              value: Number(x.net),
            }))}
          />
          <div className="mt-4 pt-3 border-t border-[var(--bd)]">
            <p className="m-0 mb-2 text-xs font-bold text-[var(--mu)]">
              الشهر ده
            </p>
            <dl className="m-0 grid grid-cols-3 gap-3">
              {[
                ["صافي المبيعات", d.month.netSales],
                ["مجمل الربح", d.month.grossProfit],
                ["المصاريف", d.month.expenses],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-[var(--mu)] font-medium">
                    {label}
                  </dt>
                  <dd className="m-0 mt-0.5 text-sm font-bold tabular-nums truncate">
                    {fmtMoney(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card
          title="تنبيهات المخزون"
          icon={<Bell size={16} />}
          badge={!noAlerts && <Pill tone="warn">{alertsTotal}</Pill>}
        >
          {noAlerts ? (
            <Empty>مفيش تنبيهات</Empty>
          ) : (
            <div className="max-h-[340px] overflow-y-auto -mx-1 px-1">
              {a.expired.batches.length > 0 && (
                <AlertGroup title={`منتهي الصلاحية (${a.expired.count})`}>
                  {a.expired.batches.map((b) => (
                    <li key={`e${b.batchId}`} className={ROW}>
                      <RowLink to={`/items/${b.itemId}`}>{b.name}</RowLink>
                      <Pill tone="danger">
                        منتهي — خسارة محتملة {fmtMoney(b.value)}
                      </Pill>
                    </li>
                  ))}
                </AlertGroup>
              )}

              {a.lowStock.items.length > 0 && (
                <AlertGroup title={`نقص المخزون (${a.lowStock.count})`}>
                  {a.lowStock.items.map((i) => (
                    <li key={`l${i.itemId}`} className={ROW}>
                      <RowLink to={`/items/${i.itemId}`}>{i.name}</RowLink>
                      <Pill tone="danger">
                        {i.sellable === 0
                          ? "نفد"
                          : `باقي ${fmtQty(i.unit, i.sellable)}`}
                      </Pill>
                    </li>
                  ))}
                </AlertGroup>
              )}

              {a.nearExpiry.batches.length > 0 && (
                <AlertGroup title={`قرب الانتهاء (${a.nearExpiry.count})`}>
                  {a.nearExpiry.batches.map((b) => (
                    <li key={`n${b.batchId}`} className={ROW}>
                      <RowLink to={`/items/${b.itemId}`}>{b.name}</RowLink>
                      <Pill tone="warn">
                        ينتهي بعد {b.daysLeft} يوم ({fmtDate(b.expiryDate)})
                      </Pill>
                    </li>
                  ))}
                </AlertGroup>
              )}
            </div>
          )}

          {!noAlerts && (
            <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)] px-3 py-2.5 text-xs text-[var(--mu)] font-medium leading-relaxed">
              <Info size={15} className="shrink-0 mt-0.5" />
              <p className="m-0">
                {a.expired.count > 0 && (
                  <>
                    فيه {a.expired.count} باتش منتهي بقيمة{" "}
                    {fmtMoney(a.expired.value)} —{" "}
                    <Link
                      to="/adjustments"
                      className="text-[var(--br)] font-semibold no-underline hover:underline"
                    >
                      سجّله تالف
                    </Link>
                    .{" "}
                  </>
                )}
                {a.lowStock.count > 10 &&
                  `ونقص مخزون في ${a.lowStock.count} صنف. `}
                {a.nearExpiry.count > 10 &&
                  `و${a.nearExpiry.count} باتش قرب ينتهي (خلال ${a.nearExpiry.days} يوم).`}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Debtors + suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card
          title="أكبر المدينين"
          icon={<Users size={16} />}
          action={{ to: "/customers", label: "الكل" }}
        >
          {d.receivables.top.length === 0 ? (
            <Empty>مفيش مديونيات</Empty>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-[var(--bd)]">
              {d.receivables.top.map((c) => (
                <li key={c.id} className={ROW}>
                  <RowLink to={`/customers/${c.id}`}>{c.name}</RowLink>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--da)]">
                    {fmtMoney(c.remaining)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="مستحقات الموردين"
          icon={<Truck size={16} />}
          action={{ to: "/suppliers", label: "الكل" }}
        >
          {d.payables.top.length === 0 ? (
            <Empty>مفيش مستحقات</Empty>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-[var(--bd)]">
              {d.payables.top.map((s) => (
                <li key={s.id} className={ROW}>
                  <RowLink to={`/suppliers/${s.id}`}>{s.name}</RowLink>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--da)]">
                    {fmtMoney(s.remaining)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
