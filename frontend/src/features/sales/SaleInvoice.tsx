import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { fmtDate } from "../../lib/format";
import type { SaleDetail } from "./api";

/* ====== بيانات المحل (عدّلها هنا، واللي تسيبه فاضي مش هيظهر) ====== */
const SHOP = {
  name: "Green Horse",
  tagline: "01060960470 - 01020507426",
  address: "أجا - الدقهلية",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/* الألوان ثابتة (فاتحة) عشان الفاتورة تتطبع صح حتى لو الموقع في الدارك مود */
const CSS = `
@media screen { #invoice-print-root { display: none; } }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body > *:not(#invoice-print-root) { display: none !important; }
  #invoice-print-root { display: block; }
}

.inv, .inv * { box-sizing: border-box; }
.inv {
  direction: rtl;
  font-family: 'Cairo', system-ui, sans-serif;
  color: #1b2a21;
  background: #fff;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 14mm 14mm 12mm;
  display: flex;
  flex-direction: column;
  font-size: 12.5px;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.inv .num { font-variant-numeric: tabular-nums; }

.inv-top {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding-bottom: 12px; border-bottom: 3px solid #2d7a4f;
}
.inv-brand h1 { margin: 0; font-size: 28px; font-weight: 800; color: #17301f; line-height: 1.2; }
.inv-brand p { margin: 3px 0 0; font-size: 12px; color: #66756b; }
.inv-title { text-align: left; }
.inv-title h2 { margin: 0; font-size: 30px; font-weight: 800; color: #2d7a4f; line-height: 1.2; }
.inv-title .no { margin-top: 4px; font-size: 14px; font-weight: 700; color: #17301f; }

.inv-meta { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; margin-top: 16px; }
.inv-box { background: #f3f5f2; border: 1px solid #dfe6e1; border-radius: 8px; padding: 10px 14px; }
.inv-box .lbl { font-size: 11px; font-weight: 600; color: #66756b; }
.inv-box .val { font-size: 15px; font-weight: 700; }
.inv-rows { display: grid; gap: 6px; }
.inv-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.inv-row .lbl { font-size: 12px; font-weight: 600; color: #66756b; }
.inv-row .val { font-size: 13px; font-weight: 700; }
.inv-badge { display: inline-block; padding: 1px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 700; }
.inv-badge.ok { background: #e8f3ec; color: #2d7a4f; }
.inv-badge.due { background: #fbf1da; color: #b87a06; }

.inv-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
.inv-table thead { display: table-header-group; }
.inv-table th {
  background: #17301f; color: #fff; font-size: 12px; font-weight: 700;
  padding: 8px 10px; text-align: center; border: 1px solid #17301f;
}
.inv-table th.c-item { text-align: right; }
.inv-table td { padding: 8px 10px; border: 1px solid #dfe6e1; text-align: center; vertical-align: middle; }
.inv-table td.c-item { text-align: right; font-weight: 600; }
.inv-table td.c-no { color: #66756b; width: 9mm; }
.inv-table th.c-no { width: 9mm; }
.inv-table tbody tr { break-inside: avoid; }
.inv-table tbody tr:nth-child(even) td { background: #f8faf8; }
.inv-table .sub { display: block; font-size: 10.5px; font-weight: 500; color: #66756b; }
.inv-table .tot { font-weight: 700; }

.inv-bottom { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-top: 14px; break-inside: avoid; }
.inv-note { flex: 1; min-height: 20mm; border: 1px dashed #b9c7bd; border-radius: 8px; padding: 8px 12px; }
.inv-note .lbl { font-size: 11px; font-weight: 600; color: #66756b; margin-bottom: 2px; }
.inv-note.empty { border-color: transparent; }

.inv-totals { width: 86mm; border: 1px solid #dfe6e1; border-radius: 8px; overflow: hidden; }
.inv-totals .t { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 12px; border-bottom: 1px solid #dfe6e1; font-size: 12.5px; }
.inv-totals .t:last-child { border-bottom: 0; }
.inv-totals .t .lbl { color: #66756b; font-weight: 600; }
.inv-totals .t .val { font-weight: 700; }
.inv-totals .t.net { background: #e8f3ec; }
.inv-totals .t.net .lbl, .inv-totals .t.net .val { color: #17301f; font-size: 14px; font-weight: 800; }
.inv-totals .t.rem .val.due { color: #b83a2c; }
.inv-totals .t.rem .val.ok { color: #2d7a4f; }
.inv-totals .t.grand { background: #17301f; }
.inv-totals .t.grand .lbl, .inv-totals .t.grand .val { color: #fff; font-size: 14px; font-weight: 800; }

.inv-foot { margin-top: auto; padding-top: 14mm; break-inside: avoid; }
.inv-sign { display: flex; justify-content: space-between; gap: 40mm; }
.inv-sign div { flex: 1; border-top: 1px solid #66756b; padding-top: 4px; text-align: center; font-size: 11.5px; font-weight: 600; color: #66756b; }
.inv-thanks { margin-top: 10px; text-align: center; font-size: 11.5px; font-weight: 600; color: #66756b; }
`;

/* ---------- الورقة نفسها ---------- */
export function InvoiceSheet({
  sale,
}: {
  sale: SaleDetail;
  /** إجمالي مديونية العميل الحالية (بعد الفاتورة دي). لو مش متاحة مش هيظهر السطر */
  customerBalance?: number | null;
}) {
  const subtotal = r2(
    sale.lines.reduce((s, l) => s + (Number(l.lineTotal) || 0), 0),
  );
  const discount = Number(sale.discount) || 0;
  const net = r2(subtotal - discount);
  const paid = Number(sale.paid) || 0;
  const remaining = r2(net - paid);

  const customer = sale.customer;

  const contact = [SHOP.address].filter(Boolean).join(" · ");

  return (
    <div className="inv">
      {/* الهيدر */}
      <div className="inv-top">
        <div className="inv-brand">
          <h1>{SHOP.name}</h1>
          {SHOP.tagline && <p>{SHOP.tagline}</p>}
          {contact && <p>{contact}</p>}
        </div>
        <div className="inv-title">
          <h2>فاتورة بيع</h2>
          <div className="no num">رقم #{sale.id}</div>
        </div>
      </div>

      {/* بيانات العميل والفاتورة */}
      <div className="inv-meta">
        <div className="inv-box">
          <div className="lbl">فاتورة إلى</div>
          <div className="val">{customer ? customer.name : "عميل نقدي"}</div>
        </div>
        <div className="inv-box">
          <div className="inv-rows">
            <div className="inv-row">
              <span className="lbl">تاريخ الفاتورة</span>
              <span className="val num">{fmtDate(sale.date)}</span>
            </div>
            <div className="inv-row">
              <span className="lbl">الحالة</span>
              <span className={`inv-badge ${remaining <= 0 ? "ok" : "due"}`}>
                {remaining <= 0 ? "مسددة" : "آجل"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* الأصناف */}
      <table className="inv-table">
        <thead>
          <tr>
            <th className="c-no">#</th>
            <th className="c-item">الصنف</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((l, i) => {
            const unitPrice = r2(Number(l.unitPrice) * l.item.priceBasis);
            return (
              <tr key={i}>
                <td className="c-no num">{i + 1}</td>
                <td className="c-item">{l.item.name}</td>
                <td className="num">
                  {l.item.unit === "PIECE" ? l.baseQty : l.baseQty / 1000}
                </td>
                <td className="num">{unitPrice}</td>
                <td className="num tot">{Number(l.lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* الملاحظة + الحساب */}
      <div className="inv-bottom">
        <div className={`inv-note ${sale.note ? "" : "empty"}`}>
          {sale.note && (
            <>
              <div className="lbl">ملاحظات</div>
              <div>{sale.note}</div>
            </>
          )}
        </div>

        <div className="inv-totals">
          <div className="t">
            <span className="lbl">الإجمالي</span>
            <span className="val num">{subtotal}</span>
          </div>
          <div className="t">
            <span className="lbl">الخصم</span>
            <span className="val num">{discount ? discount : "—"}</span>
          </div>
          <div className="t net">
            <span className="lbl">الإجمالي بعد الخصم</span>
            <span className="val num">{net}</span>
          </div>
          <div className="t">
            <span className="lbl">المدفوع</span>
            <span className="val num">{paid}</span>
          </div>
          <div className="t rem">
            <span className="lbl">المتبقي</span>
            <span className="val num">{remaining}</span>
          </div>
        </div>
      </div>

      {/* التوقيعات */}
      <div className="inv-foot">
        <div className="inv-sign">
          <div>توقيع المستلم</div>
          <div>توقيع البائع</div>
        </div>
        <div className="inv-thanks">شكراً لتعاملكم معنا</div>
      </div>
    </div>
  );
}

/* ---------- الطباعة / حفظ PDF ---------- */
// بيرسم الفاتورة في عنصر مخصوص جوه الـ body، بيخفي باقي الصفحة وقت الطباعة بس، وبيفتح نافذة الطباعة.
// من نافذة الطباعة اختار "حفظ كـ PDF" لو عايز ملف.
export function SaleInvoicePrint({
  sale,
  customerBalance,
  onDone,
}: {
  sale: SaleDetail;
  customerBalance?: number | null;
  onDone: () => void;
}) {
  const [host] = useState(() => {
    const el = document.createElement("div");
    el.id = "invoice-print-root";
    return el;
  });

  useLayoutEffect(() => {
    document.body.appendChild(host);
    return () => {
      host.remove();
    };
  }, [host]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = `فاتورة-${sale.id}`; // اسم ملف الـ PDF
    let cancelled = false;
    const finish = () => {
      document.title = prevTitle;
      if (!cancelled) onDone();
    };
    window.addEventListener("afterprint", finish, { once: true });
    (async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* مش مشكلة */
      }
      await new Promise((r) => setTimeout(r, 60));
      if (!cancelled) window.print();
    })();
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", finish);
      document.title = prevTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <>
      <style>{CSS}</style>
      <InvoiceSheet sale={sale} customerBalance={customerBalance} />
    </>,
    host,
  );
}

/* ---------- زرار جاهز تحطه في صفحة الفاتورة ---------- */
export function PrintInvoiceButton({
  sale,
  customerBalance,
  autoPrint = false,
  className,
  children,
}: {
  sale: SaleDetail;
  customerBalance?: number | null;
  /** يفتح نافذة الطباعة أول ما الصفحة تفتح (بعد "حفظ وطباعة") */
  autoPrint?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [printing, setPrinting] = useState(autoPrint);
  return (
    <>
      <button
        type="button"
        onClick={() => setPrinting(true)}
        className={
          className ??
          "font-[inherit] px-4 py-2 rounded-[8px] border border-[var(--br)] bg-transparent text-[var(--br)] text-sm font-semibold cursor-pointer flex items-center gap-2 hover:bg-[var(--bs)] transition-colors"
        }
      >
        <Printer size={17} />
        {children ?? "طباعة / PDF"}
      </button>
      {printing && (
        <SaleInvoicePrint
          sale={sale}
          customerBalance={customerBalance}
          onDone={() => setPrinting(false)}
        />
      )}
    </>
  );
}
