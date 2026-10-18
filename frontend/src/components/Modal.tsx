import { useEffect, type ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 backdrop-blur-xs p-4 font-['Cairo',sans-serif]"
      dir="rtl"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-[12px] bg-[var(--cd)] text-[var(--tx)] border border-[var(--bd)] shadow-2xl overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-[var(--bd)] bg-[var(--bg)] px-5 py-3.5">
          <h2 className="text-base font-bold text-[var(--tx)] m-0">{title}</h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-[8px] px-2.5 py-1 text-lg leading-none text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--tx)] border-0 bg-transparent cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
