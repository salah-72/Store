import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../lib/api";

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "authed") return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-[var(--bg)] text-[var(--tx)] p-4 font-['Cairo',sans-serif] select-none"
      dir="rtl"
    >
      <style>{`
        :root {
          --bg: #f3f5f2;
          --cd: #ffffff;
          --tx: #1b2a21;
          --mu: #66756b;
          --br: #2d7a4f;
          --bs: #e8f3ec;
          --bd: #dfe6e1;
          --da: #b83a2c;
          --ds: #fbe6e3;
          --sb: #17301f;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #111a14;
            --cd: #1a261e;
            --tx: #e5eee8;
            --mu: #92a398;
            --br: #4fb27b;
            --bs: #21382a;
            --bd: #2a3a30;
            --da: #e5776a;
            --ds: #3d1f1b;
            --sb: #0c130e;
          }
        }
      `}</style>

      <div className="w-full max-w-sm mx-auto">
        {/* كارت تسجيل الدخول المطابق للواجهة */}
        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] p-6 shadow-sm space-y-6">
          {/* رأس الصفحة والهوية البصرية */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-[var(--tx)] flex items-center justify-center gap-2">
              <span>🌿</span>
              <span>مبيدات الفلاح</span>
            </h1>
            <p className="text-xs text-[var(--mu)] font-normal">
              تسجيل الدخول لوحة التحكم والمدير
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* حقل اسم المستخدم */}
            <div className="space-y-1.5 text-right">
              <label className="block text-xs font-semibold text-[var(--mu)]">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="أدخل اسم المستخدم"
                className="w-full px-3 py-2 bg-[var(--cd)] border border-[var(--bd)] rounded-[8px] text-[var(--tx)] text-sm focus:outline-none focus:border-[var(--br)] focus:ring-1 focus:ring-[var(--br)] transition-colors duration-150"
              />
            </div>

            {/* حقل كلمة السر */}
            <div className="space-y-1.5 text-right">
              <label className="block text-xs font-semibold text-[var(--mu)]">
                كلمة السر
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[var(--cd)] border border-[var(--bd)] rounded-[8px] text-[var(--tx)] text-sm focus:outline-none focus:border-[var(--br)] focus:ring-1 focus:ring-[var(--br)] transition-colors duration-150"
              />
            </div>

            {/* تنبيه الخطأ بنفس تنسيق التنبيهات من الريفرنس */}
            {error && (
              <div className="p-2.5 rounded-[8px] bg-[var(--ds)] border border-[var(--bd)] text-[var(--da)] text-xs font-semibold text-right">
                {error}
              </div>
            )}

            {/* زر الدخول المطابق لـ .btn في التصميم */}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 px-4 bg-[var(--br)] hover:opacity-95 text-white font-semibold rounded-[8px] border border-[var(--br)] cursor-pointer disabled:opacity-60 transition-opacity duration-150 text-sm mt-2"
            >
              {busy ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          {/* التذييل */}
          <div className="pt-3 border-t border-[var(--bd)] text-center">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-[var(--bs)] text-[var(--br)] font-medium">
              نظام إدارة المحل والمخزون
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
