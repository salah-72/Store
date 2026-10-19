import type { ReactNode } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="bar">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Kpi({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  tone?: "" | "ok" | "warn" | "danger";
}) {
  return (
    <div className={`kpi ${tone}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
export function Badge({
  tone = "",
  children,
}: {
  tone?: "" | "warn" | "danger" | "gray";
  children: ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/* خوارزمية حساب أرقام الصفحات مع النقاط (...) */
function getPageRange(current: number, totalPages: number) {
  const pages: (number | "dots")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("dots");

    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (current < totalPages - 2) pages.push("dots");
    if (!pages.includes(totalPages)) pages.push(totalPages);
  }

  return pages;
}

export function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(page, totalPages);

  return (
    <div
      className="flex items-center justify-center gap-1.5 py-3 font-['Cairo',sans-serif]"
      dir="rtl"
    >
      {/* زر السابق */}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        title="الصفحة السابقة"
        className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] hover:bg-[var(--bs)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
      >
        <ChevronRight size={18} />
      </button>

      {/* أرقام الصفحات */}
      {pages.map((p, idx) => {
        if (p === "dots") {
          return (
            <span
              key={`dots-${idx}`}
              className="w-8 h-9 flex items-center justify-center text-[var(--mu)] font-bold tracking-widest text-sm select-none"
            >
              ...
            </span>
          );
        }

        const isCurrent = p === page;

        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p as number)}
            className={`w-9 h-9 flex items-center justify-center rounded-[12px] text-sm font-bold transition-all cursor-pointer border ${
              isCurrent
                ? "bg-[var(--br)] border-[var(--br)] text-white shadow-sm scale-105"
                : "bg-[var(--cd)] border-[var(--bd)] text-[var(--tx)] hover:bg-[var(--bs)]"
            }`}
          >
            {p}
          </button>
        );
      })}

      {/* زر التالي */}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        title="الصفحة التالية"
        className="w-9 h-9 flex items-center justify-center rounded-[12px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--tx)] hover:bg-[var(--bs)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}

export function FormActions({
  onCancel,
  busy,
  label = "حفظ",
}: {
  onCancel: () => void;
  busy: boolean;
  label?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className="btn outline" onClick={onCancel}>
        إلغاء
      </button>
      <button className="btn" disabled={busy}>
        {busy ? "جاري الحفظ..." : label}
      </button>
    </div>
  );
}
