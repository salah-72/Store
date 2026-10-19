import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Check,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../lib/api";
import {
  useAdmins,
  useChangePassword,
  useCreateAdmin,
  useDeleteAdmin,
  type Admin,
} from "../features/account/api";

const MIN = 6,
  MAX = 50;

const THEME_CSS = `
  :root {
    --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
  }
  @media(prefers-color-scheme: dark){
    :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
  }
`;

const inputClass =
  "font-[inherit] w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--bg)] text-[var(--tx)] text-sm outline-none focus:border-[var(--br)] focus:bg-[var(--cd)] transition-colors";
const btnBase =
  "font-[inherit] px-4 py-2 rounded-[8px] border text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_PRIMARY = `${btnBase} border-[var(--br)] bg-[var(--br)] text-white shadow-sm hover:opacity-95`;
const BTN_OUTLINE = `${btnBase} border-[var(--bd)] bg-transparent text-[var(--tx)] hover:bg-[var(--bs)]`;
const BTN_DANGER = `${btnBase} border-[var(--da)] bg-[var(--da)] text-white shadow-sm hover:opacity-95`;
const ICON_BTN =
  "w-8 h-8 shrink-0 flex items-center justify-center rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] text-[var(--mu)] cursor-pointer transition-colors";

/* ---------- helpers ---------- */

function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

function strengthOf(p: string): 0 | 1 | 2 | 3 {
  if (!p) return 0;
  const score = [
    p.length >= 8,
    /[a-z]/.test(p) && /[A-Z]/.test(p),
    /\d/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ].filter(Boolean).length;
  if (p.length < MIN) return 1;
  return score >= 3 ? 3 : score >= 2 ? 2 : 1;
}

/* ---------- building blocks ---------- */

function Modal({
  title,
  icon,
  onClose,
  busy,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-full overflow-y-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[12px] shadow-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[var(--br)] flex">{icon}</span>
            <h3 className="m-0 text-base font-bold">{title}</h3>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            title="إغلاق"
            disabled={busy}
            onClick={onClose}
            className={`${ICON_BTN} border-transparent bg-transparent hover:bg-[var(--bg)] hover:text-[var(--tx)] disabled:opacity-50`}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[var(--mu)]">
        {label}
      </label>
      {children}
      {hint && (
        <div className="text-[11px] font-medium text-[var(--mu)]">{hint}</div>
      )}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
  maxLength,
  minLength,
  required,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        className={`${inputClass} pe-10`}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        minLength={minLength}
        required={required}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={onToggle}
        title={show ? "إخفاء" : "إظهار"}
        aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute inset-y-0 end-0 px-3 flex items-center bg-transparent border-0 text-[var(--mu)] cursor-pointer hover:text-[var(--tx)] transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function Strength({ value }: { value: string }) {
  const lvl = strengthOf(value);
  if (!lvl) return null;
  const color =
    lvl === 1
      ? "bg-[var(--da)]"
      : lvl === 2
        ? "bg-[var(--wa)]"
        : "bg-[var(--br)]";
  const text = lvl === 1 ? "ضعيفة" : lvl === 2 ? "متوسطة" : "قوية";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex gap-1">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-[99px] ${i <= lvl ? color : "bg-[var(--bd)]"}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-[var(--mu)]">{text}</span>
    </div>
  );
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[var(--da)] bg-[var(--ds)] text-[var(--da)] px-3 py-2 text-xs font-semibold">
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--bg)] px-3 py-2.5 text-xs text-[var(--mu)] font-medium leading-relaxed">
      <Info size={15} className="shrink-0 mt-0.5" />
      <p className="m-0">{children}</p>
    </div>
  );
}

function Spin() {
  return <Loader2 size={16} className="animate-spin" />;
}

/* ---------- dialogs ---------- */

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { endSession } = useAuth();
  const change = useChangePassword();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < MIN || newPassword.length > MAX)
      return setError(`كلمة المرور الجديدة لازم تكون من ${MIN} لـ ${MAX} حرف`);
    if (newPassword !== confirm)
      return setError("كلمتين المرور الجديدتين مش متطابقتين");
    if (newPassword === oldPassword)
      return setError("كلمة المرور الجديدة نفس القديمة");
    try {
      await change.mutateAsync({
        oldPassword,
        newPassword,
        passwordConfirm: confirm,
      });
      endSession("اتغيرت كلمة المرور. سجّل دخولك بالكلمة الجديدة.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const toggle = () => setShow((s) => !s);

  return (
    <Modal
      title="تغيير كلمة المرور"
      icon={<KeyRound size={18} />}
      onClose={onClose}
      busy={change.isPending}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="كلمة المرور الحالية">
          <PasswordInput
            value={oldPassword}
            onChange={setOld}
            autoComplete="current-password"
            show={show}
            onToggle={toggle}
            required
            autoFocus
          />
        </Field>
        <Field
          label="كلمة المرور الجديدة"
          hint={<Strength value={newPassword} />}
        >
          <PasswordInput
            value={newPassword}
            onChange={setNew}
            autoComplete="new-password"
            show={show}
            onToggle={toggle}
            minLength={MIN}
            maxLength={MAX}
            required
          />
        </Field>
        <Field label="تأكيد الكلمة الجديدة">
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            show={show}
            onToggle={toggle}
            required
          />
        </Field>

        <InfoBox>
          بعد التغيير هتتسجل خروج من كل الأجهزة وتدخل بالكلمة الجديدة.
        </InfoBox>
        {error && <ErrorLine>{error}</ErrorLine>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className={BTN_OUTLINE}
            onClick={onClose}
            disabled={change.isPending}
          >
            إلغاء
          </button>
          <button className={BTN_PRIMARY} disabled={change.isPending}>
            {change.isPending && <Spin />}
            {change.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddAdminModal({ onClose }: { onClose: () => void }) {
  const create = useCreateAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim().toLowerCase();
    if (!u) return setError("اكتب اسم المستخدم");
    if (u.length > 30) return setError("اسم المستخدم لازم يكون أقل من 30 حرف");
    if (password.length < MIN || password.length > MAX)
      return setError(`كلمة المرور لازم تكون من ${MIN} لـ ${MAX} حرف`);
    try {
      await create.mutateAsync({ username: u, password });
      setCreated({ username: u, password });
      setUsername("");
      setPassword("");
      setShow(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function copyCreds() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        `اسم المستخدم: ${created.username}\nكلمة المرور: ${created.password}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; the values are still on screen */
    }
  }

  if (created) {
    return (
      <Modal
        title="إضافة مشرف جديد"
        icon={<UserPlus size={18} />}
        onClose={onClose}
      >
        <div className="space-y-4">
          <div className="rounded-[10px] border border-[var(--br)]/30 bg-[var(--bs)] p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-[var(--br)] font-bold text-sm">
              <Check size={18} />
              <span>تم إنشاء المشرف بنجاح</span>
            </div>
            <p className="m-0 text-xs text-[var(--tx)] font-medium leading-relaxed">
              احتفظ ببيانات الدخول هذه، فلن تظهر كلمة المرور مرة أخرى بعد إغلاق
              هذه النافذة.
            </p>
            <div
              dir="ltr"
              className="rounded-[8px] border border-[var(--bd)] bg-[var(--cd)] divide-y divide-[var(--bd)] text-sm overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="text-xs font-semibold text-[var(--mu)]">
                  اسم المستخدم
                </span>
                <span className="font-bold tabular-nums text-[var(--tx)] select-all">
                  {created.username}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="text-xs font-semibold text-[var(--mu)]">
                  كلمة المرور
                </span>
                <span className="font-bold tabular-nums text-[var(--br)] select-all font-mono">
                  {created.password}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" className={BTN_OUTLINE} onClick={copyCreds}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "اتنسخ" : "نسخ البيانات"}
            </button>
            <button
              type="button"
              className={BTN_OUTLINE}
              onClick={() => setCreated(null)}
            >
              <UserPlus size={16} />
              إضافة مشرف تاني
            </button>
            <button type="button" className={BTN_PRIMARY} onClick={onClose}>
              تم
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="إضافة مشرف جديد"
      icon={<UserPlus size={18} />}
      onClose={onClose}
      busy={create.isPending}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="اسم المستخدم" hint="بيتحفظ بحروف صغيرة.">
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            autoComplete="off"
            autoFocus
          />
        </Field>

        <Field label="كلمة المرور" hint={<Strength value={password} />}>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                show={show}
                onToggle={() => setShow((s) => !s)}
                maxLength={MAX}
              />
            </div>
            <button
              type="button"
              title="توليد كلمة مرور"
              aria-label="توليد كلمة مرور"
              onClick={() => {
                setPassword(genPassword());
                setShow(true);
              }}
              className={`${ICON_BTN} w-[38px] h-[38px] hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)]`}
            >
              <Dices size={17} />
            </button>
          </div>
        </Field>

        {error && <ErrorLine>{error}</ErrorLine>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className={BTN_OUTLINE}
            onClick={onClose}
            disabled={create.isPending}
          >
            إلغاء
          </button>
          <button className={BTN_PRIMARY} disabled={create.isPending}>
            {create.isPending ? <Spin /> : <UserPlus size={16} />}
            {create.isPending ? "جاري الإضافة..." : "إضافة مشرف"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteAdminModal({
  target,
  onClose,
}: {
  target: Admin;
  onClose: () => void;
}) {
  const del = useDeleteAdmin();
  const [error, setError] = useState("");

  async function onConfirm() {
    setError("");
    try {
      await del.mutateAsync(target.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal
      title="حذف مشرف"
      icon={<Trash2 size={18} className="text-[var(--da)]" />}
      onClose={onClose}
      busy={del.isPending}
    >
      <div className="space-y-4">
        <p className="m-0 text-sm font-medium leading-relaxed">
          هيتمسح المشرف "<b>{target.username}</b>" ومش هيعرف يدخل تاني. العمليات
          اللي سجّلها هتفضل زي ما هي.
        </p>
        {error && <ErrorLine>{error}</ErrorLine>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={BTN_OUTLINE}
            onClick={onClose}
            disabled={del.isPending}
          >
            إلغاء
          </button>
          <button
            type="button"
            className={BTN_DANGER}
            onClick={onConfirm}
            disabled={del.isPending}
          >
            {del.isPending ? <Spin /> : <Trash2 size={16} />}
            حذف
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- page ---------- */

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { data, isPending, error } = useAdmins();
  const [modal, setModal] = useState<"password" | "add" | null>(null);
  const [target, setTarget] = useState<Admin | null>(null);

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{THEME_CSS}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold m-0">حسابي</h2>
          <p className="m-0 mt-1 text-xs text-[var(--mu)] font-medium">
            مسجّل دخول باسم <b className="text-[var(--tx)]">{user?.username}</b>
          </p>
        </div>
        <button type="button" className={BTN_OUTLINE} onClick={logout}>
          <LogOut size={17} />
          تسجيل خروج
        </button>
      </div>

      {/* Admins */}
      <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-[10px] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--mu)]" />
            <h3 className="m-0 text-sm font-bold">المشرفين</h3>
            {data && (
              <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2 py-0.5 text-[11px] font-bold tabular-nums">
                {data.length}
              </span>
            )}
          </div>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => setModal("add")}
          >
            <UserPlus size={17} />
            إضافة مشرف
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
                <th className="px-4 py-3 font-semibold w-16">#</th>
                <th className="px-4 py-3 font-semibold">اسم المستخدم</th>
                <th className="px-4 py-3 font-semibold w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isPending &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--bd)]">
                    {[0, 1, 2].map((c) => (
                      <td key={c} className="px-4 py-4">
                        <div className="h-3.5 w-full max-w-[100px] rounded-[99px] bg-[var(--bd)] animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isPending && error && (
                <tr>
                  <td
                    colSpan={3}
                    className="p-10 text-center text-[var(--da)] font-semibold"
                  >
                    {errorMessage(error)}
                  </td>
                </tr>
              )}

              {data?.map((a) => {
                const me = a.id === user?.id;
                return (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--bd)] last:border-b-0 hover:bg-[var(--bs)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[var(--mu)] tabular-nums font-medium">
                      {a.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-[var(--bs)] text-[var(--br)] text-sm font-bold uppercase">
                          {a.username.charAt(0)}
                        </span>
                        <span className="font-semibold">{a.username}</span>
                        {me && (
                          <span className="rounded-[99px] bg-[var(--bs)] text-[var(--br)] px-2.5 py-0.5 text-xs font-semibold">
                            أنت
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {me && (
                          <button
                            type="button"
                            title="تغيير كلمة المرور"
                            aria-label="تغيير كلمة المرور"
                            onClick={() => setModal("password")}
                            className={`${ICON_BTN} hover:border-[var(--br)] hover:text-[var(--br)] hover:bg-[var(--bs)]`}
                          >
                            <KeyRound size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          title="حذف المشرف"
                          aria-label={`حذف المشرف ${a.username}`}
                          onClick={() => setTarget(a)}
                          className={`${ICON_BTN} hover:border-[var(--da)] hover:text-[var(--da)] hover:bg-[var(--ds)]`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "password" && (
        <ChangePasswordModal onClose={() => setModal(null)} />
      )}
      {modal === "add" && <AddAdminModal onClose={() => setModal(null)} />}
      {target && (
        <DeleteAdminModal target={target} onClose={() => setTarget(null)} />
      )}
    </div>
  );
}
