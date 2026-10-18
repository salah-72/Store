import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const sections = [
  { to: "/", label: "لوحة التحكم" },
  { to: "/items", label: "الأصناف" },
  { to: "/sales", label: "عمليات البيع" },
  { to: "/purchases", label: "عمليات الشراء" },
  { to: "/customers", label: "العملاء" },
  { to: "/suppliers", label: "الموردين" },
  { to: "/expenses", label: "المصاريف الجانبية" },
  { to: "/stats", label: "الإحصائيات والجرد" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div
      className="flex min-h-screen flex-col md:flex-row bg-[var(--bg)] text-[var(--tx)] font-['Cairo',sans-serif]"
      dir="rtl"
    >
      <style>{`
        :root {
          --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --sb: #17301f;
        }
        @media(prefers-color-scheme: dark){
          :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--sb:#0c130e}
        }
      `}</style>

      {/* القائمة الجانبية (Sidebar) مطابقة للريفرنس */}
      <aside className="w-full md:w-[196px] bg-[var(--sb)] text-[#cfe0d4] p-3 md:sticky md:top-0 md:h-screen flex flex-col shrink-0 overflow-x-auto md:overflow-y-auto">
        <h1 className="text-base font-bold text-white mx-2 mb-4 hidden md:block tracking-wide">
          مبيدات الفلاح
        </h1>

        <nav className="flex md:flex-col gap-1 flex-1">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.to === "/"}
              className={({ isActive }) =>
                `block w-full text-right p-2.5 rounded-[8px] text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[var(--br)] text-white font-bold"
                    : "hover:bg-white/10 text-[#cfe0d4]"
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>

        {/* بيانات المستخدم وزر الخروج */}
        <div className="mt-auto pt-4 border-t border-white/10 text-xs hidden md:block space-y-2">
          <div className="px-2 text-[#92a398] truncate font-medium">
            {user?.username}
          </div>
          <button
            onClick={logout}
            className="w-full text-right px-3 py-1.5 rounded-[8px] border border-white/20 text-white hover:bg-white/10 transition-colors cursor-pointer font-[inherit]"
          >
            تسجيل خروج
          </button>
        </div>
      </aside>

      {/* محتوى الصفحة الرئيسي */}
      <main className="flex-1 min-w-0 p-4 md:p-5">
        <Outlet />
      </main>
    </div>
  );
}
