import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Leaf, User, Lock, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../lib/api";

const inputClass =
  "font-[inherit] w-full py-2.5 pr-10 pl-3 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      className="min-h-screen flex items-center justify-center p-5 bg-[var(--bg)] font-['Cairo',sans-serif] text-[var(--tx)]"
      dir="rtl"
    >
      <style>{`
        :root {
          --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
        }
        @media(prefers-color-scheme: dark){
          :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
        }
      `}</style>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-[400px] bg-[var(--cd)] border border-[var(--bd)] rounded-[14px] shadow-sm p-7 space-y-5"
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="w-14 h-14 flex items-center justify-center rounded-[14px] bg-[var(--bs)] text-[var(--br)]">
            <Leaf size={28} />
          </span>
          <div>
            <h2 className="text-xl font-bold m-0">جرين هورس</h2>
            <p className="m-0 mt-1 text-sm text-[var(--mu)] font-medium">
              سجّل دخولك لإدارة المحل
            </p>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-xs font-semibold text-[var(--mu)]"
          >
            اسم المستخدم
          </label>
          <div className="relative">
            <User
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mu)] pointer-events-none"
            />
            <input
              id="username"
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-[var(--mu)]"
          >
            كلمة المرور
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mu)] pointer-events-none"
            />
            <input
              id="password"
              className={`${inputClass} pl-10`}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={
                showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
              }
              title={showPassword ? "إخفاء" : "إظهار"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full border-0 bg-transparent text-[var(--mu)] cursor-pointer hover:bg-[var(--bd)] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-0 rounded-[8px] border border-[var(--bd)] bg-[var(--ds)] px-4 py-2.5 text-sm text-[var(--da)] font-semibold"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="font-[inherit] w-full px-4 py-2.5 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              جاري الدخول...
            </>
          ) : (
            <>
              <LogIn size={17} />
              دخول
            </>
          )}
        </button>
      </form>
    </div>
  );
}
