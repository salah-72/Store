import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Banknote,
  Coins,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageX,
  Receipt,
  ShoppingCart,
  Sprout,
  TrendingUp,
  Truck,
  Undo2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type Item = { to: string; label: string; icon: LucideIcon; soon?: boolean };

// الأقسام زي التصميم. اللي "soon" لسه ما اتبناش.
const groups: { title: string; items: Item[] }[] = [
  {
    title: "الرئيسية",
    items: [
      { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
      { to: "/pos", label: "الكاشير", icon: Receipt },
    ],
  },
  {
    title: "المخزن",
    items: [
      { to: "/items", label: "الأصناف", icon: Package },
      { to: "/adjustments", label: "التالف والمنتهي", icon: PackageX },
    ],
  },
  {
    title: "المعاملات",
    items: [
      { to: "/sales", label: "المبيعات", icon: Banknote },
      { to: "/purchases", label: "المشتريات", icon: ShoppingCart },
      { to: "/returns", label: "المرتجعات", icon: Undo2 },
      { to: "/payments", label: "الدفعات", icon: CreditCard },
    ],
  },
  {
    title: "الأطراف",
    items: [
      { to: "/customers", label: "العملاء", icon: Users },
      { to: "/suppliers", label: "الموردين", icon: Truck },
    ],
  },
  {
    title: "المال",
    items: [
      { to: "/expenses", label: "المصاريف", icon: Coins },
      { to: "/reports", label: "التقارير", icon: TrendingUp },
    ],
  },
];

const THEME_CSS = `
  :root {
    --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
  }
  @media(prefers-color-scheme: dark){
    :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
  }
`;

const ITEM =
  "relative flex items-center gap-3 px-3 py-2 rounded-[8px] text-sm font-semibold no-underline transition-colors";
const ITEM_ON = "bg-white/10 text-white";
const ITEM_OFF = "text-white/70 hover:bg-white/5 hover:text-white";

function NavItem({ item, end }: { item: Item; end?: boolean }) {
  const Icon = item.icon;

  if (item.soon) {
    return (
      <div className={`${ITEM} text-white/35 cursor-not-allowed`}>
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <em className="not-italic rounded-[99px] bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
          قريباً
        </em>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={end}
      className={({ isActive }) => `${ITEM} ${isActive ? ITEM_ON : ITEM_OFF}`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute start-0 inset-y-2 w-[3px] rounded-[99px] bg-[var(--br)]" />
          )}
          <Icon size={18} className="shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // اقفل القائمة لما الصفحة تتغير
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--tx)] font-['Cairo',sans-serif]"
      dir="rtl"
    >
      <style>{THEME_CSS}</style>

      {/* Backdrop (small screens only) */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden print:hidden"
        />
      )}

      {/* Sidebar: fixed on large screens, slide-in drawer on small ones */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 start-0 z-40 w-56 flex flex-col bg-[var(--sb)] text-white transition-transform duration-200 lg:translate-x-0 print:hidden ${
          open ? "translate-x-0 shadow-2xl" : "translate-x-full"
        }`}
      >
        <div className="shrink-0 flex items-center gap-3 px-5 py-4">
          <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px] bg-white/10 text-white">
            <Sprout size={20} />
          </span>
          <h1 className="m-0 text-base font-bold truncate">مبيدات الهندسة</h1>
        </div>

        <nav
          aria-label="القائمة الرئيسية"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:rgb(255_255_255/0.2)_transparent]"
        >
          {groups.map((g) => (
            <div
              key={g.title}
              className="space-y-1 py-2 border-t border-white/10 first:border-t-0 first:pt-0"
            >
              {g.items.map((i) => (
                <NavItem key={i.to} item={i} end={i.to === "/"} />
              ))}
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className="shrink-0 px-3 py-3 border-t border-white/10 flex items-center gap-1.5">
          <NavLink
            to="/account"
            className={({ isActive }) =>
              `${ITEM} flex-1 min-w-0 ${isActive ? ITEM_ON : ITEM_OFF}`
            }
          >
            <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white">
              <User size={15} />
            </span>
            <span className="flex-1 truncate">{user?.username}</span>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            title="تسجيل خروج"
            aria-label="تسجيل خروج"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-[8px] border-0 bg-transparent text-white/70 cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="min-h-screen p-4 lg:ps-60 print:p-0 print:ps-0">
        <Outlet />
      </main>

      {/* Menu button: bottom-left, small screens only */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={open}
        aria-controls="app-sidebar"
        className="fixed bottom-4 left-4 z-50 w-12 h-12 flex items-center justify-center rounded-full border border-[var(--br)] bg-[var(--br)] text-white shadow-lg cursor-pointer hover:opacity-95 transition-opacity lg:hidden print:hidden"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
    </div>
  );
}
