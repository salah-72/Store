import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Calculator,
  Coins,
  Hourglass,
  Info,
  Loader2,
  Package,
  Printer,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { errorMessage } from "../lib/api";
import {
  addDaysYmd,
  fmtDate,
  fmtMoney,
  fmtNumber,
  fmtQty,
  fmtSigned,
  monthStartYmd,
  todayYmd,
} from "../lib/format";
import {
  useOverview,
  useSalesByDay,
  useStaleStock,
  useTopItems,
} from "../features/stats/api";

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

const controlClass =
  "font-[inherit] px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

const neg = (v: string | number) => (Number(v) ? fmtSigned("-", v) : "—");

/* ---------- small building blocks ---------- */

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
  right,
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs p-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-[var(--bd)]">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-[var(--mu)] flex">{icon}</span>}
          <h3 className="m-0 text-sm font-bold">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)] px-3 py-2.5 text-xs text-[var(--mu)] font-medium leading-relaxed">
      <Info size={15} className="shrink-0 mt-0.5" />
      <p className="m-0">{children}</p>
    </div>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 rounded-[8px] border border-[var(--da)] bg-[var(--ds)] text-[var(--da)] px-4 py-2.5 text-sm font-semibold">
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-[var(--mu)]">
      <Loader2 size={16} className="animate-spin" />
      جاري التحميل...
    </div>
  );
}

/* A line in a report table: label on the right, amount on the left */
const Row = ({
  label,
  value,
  sub,
  total,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: boolean;
  total?: boolean;
  tone?: "neg" | "ok";
}) => (
  <tr
    className={`border-b border-[var(--bd)] last:border-b-0 ${
      total ? "bg-[var(--bg)]" : ""
    }`}
  >
    <td
      className={
        total
          ? "px-3 py-2.5 font-bold"
          : sub
            ? "ps-7 pe-3 py-1.5 text-xs font-medium text-[var(--mu)]"
            : "px-3 py-2 font-semibold"
      }
    >
      {label}
    </td>
    <td
      className={`px-3 text-end tabular-nums whitespace-nowrap ${
        total
          ? "py-2.5 font-bold"
          : sub
            ? "py-1.5 text-xs font-medium"
            : "py-2 font-semibold"
      } ${
        tone === "neg"
          ? "text-[var(--da)]"
          : tone === "ok"
            ? "text-[var(--br)]"
            : sub
              ? "text-[var(--mu)]"
              : ""
      }`}
    >
      {value}
    </td>
  </tr>
);

function RepTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm text-right">
      <tbody>{children}</tbody>
    </table>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-auto max-h-[420px] rounded-[8px] border border-[var(--bd)]">
      <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
        <thead>
          <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const TD = "px-4 py-3";
const TR =
  "border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors";

function MsgRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="p-8 text-center text-sm text-[var(--mu)]">
        {children}
      </td>
    </tr>
  );
}

function DayBars({
  rows,
  labelEvery,
}: {
  rows: { day: string; value: number }[];
  labelEvery: number;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const dense = rows.length > 31;
  return (
    <div className={`flex items-stretch h-48 ${dense ? "gap-px" : "gap-2"}`}>
      {rows.map((r, i) => {
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
                className={`w-full rounded-t-[4px] ${dense ? "" : "max-w-[36px]"} ${
                  r.value < 0 ? "bg-[var(--da)]" : "bg-[var(--br)]"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="h-3 text-[10px] leading-3 font-medium text-[var(--mu)] tabular-nums whitespace-nowrap">
              {i % labelEvery === 0 ? fmtDate(r.day) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */

export default function ReportsPage() {
  const today = todayYmd();
  const [range, setRange] = useState({ from: monthStartYmd(today), to: today });
  const [by, setBy] = useState<"revenue" | "quantity">("revenue");
  const [staleDays, setStaleDays] = useState(90);
  const valid = !!range.from && !!range.to && range.from <= range.to;
  const days = valid
    ? (Date.parse(range.to) - Date.parse(range.from)) / 864e5 + 1
    : 0;
  const chartOk = valid && days <= 366;

  const ov = useOverview(range.from, range.to);
  const byDay = useSalesByDay(
    chartOk ? range.from : "",
    chartOk ? range.to : "",
  );
  const top = useTopItems(range.from, range.to, by);
  const stale = useStaleStock(staleDays);

  const presets: [string, string, string][] = [
    ["النهارده", today, today],
    ["آخر 7 أيام", addDaysYmd(today, -6), today],
    ["الشهر ده", monthStartYmd(today), today],
    ["آخر 30 يوم", addDaysYmd(today, -29), today],
    ["السنة دي", `${today.slice(0, 4)}-01-01`, today],
  ];
  const o = ov.data;
  const profit = o ? Number(o.netProfit) : 0;

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_CSS}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold m-0">التقارير</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            {valid
              ? `الفترة من ${fmtDate(range.from)} إلى ${fmtDate(range.to)}`
              : "اختار الفترة اللي عايز تشوف تقريرها"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-transparent text-[var(--br)] cursor-pointer text-sm font-semibold hover:bg-[var(--bs)] transition-colors flex items-center gap-2 print:hidden"
        >
          <Printer size={18} />
          طباعة
        </button>
      </div>

      {/* Range filter */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] p-4 rounded-[10px] shadow-xs mb-5 print:hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--bd)]">
          <SlidersHorizontal size={16} className="text-[var(--mu)]" />
          <span className="text-xs font-bold text-[var(--mu)]">الفترة</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(([label, from, to]) => {
            const active = range.from === from && range.to === to;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRange({ from, to })}
                className={`font-[inherit] px-3 py-1.5 rounded-[8px] border text-xs font-semibold cursor-pointer transition-colors ${
                  active
                    ? "border-[var(--br)] bg-[var(--br)] text-white"
                    : "border-[var(--bd)] bg-transparent text-[var(--tx)] hover:bg-[var(--bs)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              من تاريخ
            </label>
            <input
              type="date"
              className={`${controlClass} w-full`}
              value={range.from}
              max={range.to || today}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--mu)]">
              إلى تاريخ
            </label>
            <input
              type="date"
              className={`${controlClass} w-full`}
              value={range.to}
              min={range.from}
              max={today}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {!valid && <ErrorBox>اختار فترة صحيحة (من قبل إلى).</ErrorBox>}
      {valid && ov.error && <ErrorBox>{errorMessage(ov.error)}</ErrorBox>}
      {valid && ov.isPending && <Loading />}

      {valid && o && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <Kpi
              label={`صافي المبيعات (${o.sales.count} فاتورة)`}
              value={fmtMoney(o.sales.net)}
              tone="mute"
              icon={<Receipt size={20} />}
            />
            <Kpi
              label="مجمل الربح"
              value={fmtMoney(o.grossProfit)}
              tone="ok"
              icon={<TrendingUp size={20} />}
            />
            <Kpi
              label="صافي الربح"
              value={fmtMoney(o.netProfit)}
              tone={profit < 0 ? "danger" : "ok"}
              icon={<Coins size={20} />}
            />
            <Kpi
              label="صافي الخزنة (داخل − خارج)"
              value={fmtMoney(o.cashFlow.net)}
              tone={Number(o.cashFlow.net) < 0 ? "danger" : "mute"}
              icon={<Wallet size={20} />}
            />
          </div>

          {/* Profit + cash/purchases */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start mb-5">
            <Card title="الأرباح" icon={<Calculator size={16} />}>
              <RepTable>
                <Row
                  label="إجمالي المبيعات (قبل الخصم)"
                  value={fmtMoney(o.sales.subtotal)}
                />
                <Row
                  label="خصومات المبيعات"
                  value={neg(o.sales.discount)}
                  sub
                />
                <Row
                  label="مرتجعات المبيعات"
                  value={neg(o.sales.returns)}
                  sub
                />
                <Row
                  label="صافي المبيعات"
                  value={fmtMoney(o.sales.net)}
                  total
                />
                <Row label="تكلفة البضاعة المباعة" value={neg(o.cost.net)} />
                <Row label="مجمل الربح" value={fmtMoney(o.grossProfit)} total />
                <Row label="مصاريف جانبية" value={neg(o.expenses.total)} />
                {o.expenses.byCategory.map((c) => (
                  <Row
                    key={c.category}
                    label={`${c.category} (${c.count})`}
                    value={fmtMoney(c.amount)}
                    sub
                  />
                ))}
                <Row
                  label="خصومات الموردين"
                  value={
                    Number(o.purchaseDiscounts)
                      ? fmtSigned("+", o.purchaseDiscounts)
                      : "—"
                  }
                />
                <Row label="تالف ومنتهي (بالتكلفة)" value={neg(o.writeOffs)} />
                <Row
                  label="صافي الربح"
                  value={fmtMoney(o.netProfit)}
                  total
                  tone={profit < 0 ? "neg" : "ok"}
                />
              </RepTable>
              <Hint>
                الربح محسوب من تكلفة الباتشات اللي اتباعت منها فعلاً، مش من سعر
                الصنف الحالي.
              </Hint>
            </Card>

            <div className="flex flex-col gap-4 min-w-0">
              <Card title="حركة الخزنة" icon={<Wallet size={16} />}>
                <RepTable>
                  <Row label="داخل" value={fmtMoney(o.cashFlow.in)} total />
                  <Row
                    label="مبيعات مدفوعة"
                    value={fmtMoney(o.cashFlow.parts.paidOnSales)}
                    sub
                  />
                  <Row
                    label="دفعات من العملاء"
                    value={fmtMoney(o.cashFlow.parts.customerPayments)}
                    sub
                  />
                  <Row
                    label="مرتجعات مستردة من الموردين"
                    value={fmtMoney(o.cashFlow.parts.supplierRefunds)}
                    sub
                  />
                  <Row label="خارج" value={fmtMoney(o.cashFlow.out)} total />
                  <Row
                    label="مشتريات مدفوعة"
                    value={fmtMoney(o.cashFlow.parts.paidOnPurchases)}
                    sub
                  />
                  <Row
                    label="دفعات للموردين"
                    value={fmtMoney(o.cashFlow.parts.supplierPayments)}
                    sub
                  />
                  <Row
                    label="مرتجعات مرجّعة للعملاء"
                    value={fmtMoney(o.cashFlow.parts.customerRefunds)}
                    sub
                  />
                  <Row
                    label="مصاريف"
                    value={fmtMoney(o.cashFlow.parts.expenses)}
                    sub
                  />
                  <Row
                    label="الصافي"
                    value={fmtMoney(o.cashFlow.net)}
                    total
                    tone={Number(o.cashFlow.net) < 0 ? "neg" : "ok"}
                  />
                </RepTable>
              </Card>

              <Card title="المشتريات" icon={<ShoppingCart size={16} />}>
                <RepTable>
                  <Row
                    label={`فواتير الشراء (${o.purchases.count})`}
                    value={fmtMoney(o.purchases.subtotal)}
                  />
                  <Row
                    label="خصومات الموردين"
                    value={neg(o.purchases.discount)}
                    sub
                  />
                  <Row
                    label="مرتجعات للموردين"
                    value={neg(o.purchases.returns)}
                    sub
                  />
                  <Row
                    label="صافي المشتريات"
                    value={fmtMoney(o.purchases.net)}
                    total
                  />
                </RepTable>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Daily chart */}
      {chartOk && (
        <div className="mb-5">
          <Card title="المبيعات بالأيام" icon={<TrendingUp size={16} />}>
            {byDay.isPending && <Loading />}
            {byDay.error && <ErrorBox>{errorMessage(byDay.error)}</ErrorBox>}
            {byDay.data && (
              <>
                <DayBars
                  rows={byDay.data.days.map((x) => ({
                    day: x.day,
                    value: Number(x.net),
                  }))}
                  labelEvery={Math.max(
                    1,
                    Math.ceil(byDay.data.days.length / 12),
                  )}
                />
                <dl className="m-0 mt-4 pt-3 border-t border-[var(--bd)] grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ["عدد الفواتير", fmtNumber(byDay.data.summary.count)],
                    ["المبيعات", fmtMoney(byDay.data.summary.sales)],
                    ["المرتجعات", fmtMoney(byDay.data.summary.returns)],
                    ["الصافي", fmtMoney(byDay.data.summary.net)],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-[var(--mu)] font-medium">
                        {label}
                      </dt>
                      <dd className="m-0 mt-0.5 text-sm font-bold tabular-nums truncate">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Card>
        </div>
      )}
      {valid && !chartOk && (
        <div className="mb-5">
          <Hint>الرسم اليومي بيدعم فترة لحد سنة بس.</Hint>
        </div>
      )}

      {/* Top items + stale stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card
          title="أكثر الأصناف مبيعاً"
          icon={<Package size={16} />}
          right={
            <select
              className={`${controlClass} py-1.5 text-xs print:hidden`}
              value={by}
              onChange={(e) => setBy(e.target.value as typeof by)}
            >
              <option value="revenue">بالإيراد</option>
              <option value="quantity">بالكمية</option>
            </select>
          }
        >
          {top.error && <ErrorBox>{errorMessage(top.error)}</ErrorBox>}
          <DataTable headers={["الصنف", "الكمية (صافي)", "الإيراد"]}>
            {top.isPending && (
              <MsgRow cols={3}>
                <Loading />
              </MsgRow>
            )}
            {top.data?.length === 0 && (
              <MsgRow cols={3}>مفيش مبيعات في الفترة دي</MsgRow>
            )}
            {top.data?.map((t) => (
              <tr key={t.itemId} className={TR}>
                <td className={TD}>
                  <Link
                    to={`/items/${t.itemId}`}
                    className="font-semibold text-[var(--tx)] no-underline hover:text-[var(--br)] transition-colors"
                  >
                    {t.name}
                  </Link>
                </td>
                <td className={`${TD} tabular-nums`}>
                  {t.unit ? fmtQty(t.unit, t.netQty) : t.netQty}
                  {t.returnedQty > 0 && (
                    <span className="text-xs text-[var(--mu)]">
                      {" "}
                      (مرتجع{" "}
                      {t.unit ? fmtQty(t.unit, t.returnedQty) : t.returnedQty})
                    </span>
                  )}
                </td>
                <td className={`${TD} font-semibold tabular-nums`}>
                  {fmtMoney(t.revenue)}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card
          title="مخزون راكد"
          icon={<Hourglass size={16} />}
          right={
            <select
              className={`${controlClass} py-1.5 text-xs print:hidden`}
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
            >
              {[30, 60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>
                  من {d} يوم
                </option>
              ))}
            </select>
          }
        >
          {stale.error && <ErrorBox>{errorMessage(stale.error)}</ErrorBox>}
          {stale.data && (
            <p className="m-0 mb-3 text-xs font-medium text-[var(--mu)] leading-relaxed">
              {stale.data.count} صنف ما اتباعش ولا اتورّد من {stale.data.days}{" "}
              يوم، قيمته {fmtMoney(stale.data.value)}.
            </p>
          )}
          <DataTable headers={["الصنف", "المتاح", "القيمة"]}>
            {stale.isPending && (
              <MsgRow cols={3}>
                <Loading />
              </MsgRow>
            )}
            {stale.data?.items.length === 0 && (
              <MsgRow cols={3}>مفيش مخزون راكد 👌</MsgRow>
            )}
            {stale.data?.items.map((i) => (
              <tr key={i.itemId} className={TR}>
                <td className={TD}>
                  <Link
                    to={`/items/${i.itemId}`}
                    className="font-semibold text-[var(--tx)] no-underline hover:text-[var(--br)] transition-colors"
                  >
                    {i.name}
                  </Link>
                </td>
                <td className={`${TD} tabular-nums`}>
                  {fmtQty(i.unit, i.sellable)}
                </td>
                <td className={`${TD} font-semibold tabular-nums`}>
                  {fmtMoney(i.value)}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </div>
  );
}
