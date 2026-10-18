import { useState, type FormEvent } from "react";
import Modal from "../components/Modal";
import { errorMessage, api } from "../lib/api";
import { fmtMoney } from "../lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// تعريف الأنواع الأساسية للمورد
type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  openingBalance: number;
  totalPurchased: number;
  totalPaid: number;
  remaining: number;
};

// هوك جلب الموردين
function useSuppliers(search: string) {
  return useQuery({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      const res = await api.get<{
        success: boolean;
        data: { suppliers: Supplier[] };
      }>(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      return res.data.data.suppliers;
    },
  });
}

// هوك تفاصيل المورد ومع معاملاته
function useSupplierDetails(id: number | null) {
  return useQuery({
    queryKey: ["supplier", id],
    enabled: id !== null,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(
        `/suppliers/${id}`,
      );
      return res.data.data;
    },
  });
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const { data: suppliers, isPending, error } = useSuppliers(search);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="p-5 font-['Cairo',sans-serif] text-[var(--tx)]" dir="rtl">
      <style>{`
        :root {
          --bg: #f3f5f2; --cd: #fff; --tx: #1b2a21; --mu: #66756b; --br: #2d7a4f; --bs: #e8f3ec; --bd: #dfe6e1; --wa: #b87a06; --ws: #fbf1da; --da: #b83a2c; --ds: #fbe6e3; --sb: #17301f;
        }
        @media(prefers-color-scheme: dark){
          :root:not([data-theme="light"]){--bg:#111a14;--cd:#1a261e;--tx:#e5eee8;--mu:#92a398;--br:#4fb27b;--bs:#21382a;--bd:#2a3a30;--wa:#e0a93a;--ws:#3a2f14;--da:#e5776a;--ds:#3d1f1b;--sb:#0c130e}
        }
      `}</style>

      {/* شريط العنوان والأزرار */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold m-0">الموردين</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="font-[inherit] px-3.5 py-2 rounded-[8px] border border-[var(--br)] bg-[var(--br)] text-white cursor-pointer text-sm font-semibold hover:opacity-95 transition-opacity"
        >
          + مورد جديد
        </button>
      </div>

      {/* شريط البحث */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="font-[inherit] px-3 py-1.5 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-[var(--tx)] text-sm w-72 outline-none focus:border-[var(--br)]"
          placeholder="ابحث باسم المورد أو رقم التليفون..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* جدول الموردين */}
      <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[10px]">
        <table className="w-full border-collapse text-right whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)] text-xs font-semibold">
              {[
                "المورد",
                "التليفون",
                "إجمالي التوريدات",
                "المدفوع له",
                "المتبقي علينا",
              ].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--mu)]">
                  جاري التحميل...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--da)]">
                  {errorMessage(error)}
                </td>
              </tr>
            )}
            {suppliers?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--mu)]">
                  مفيش موردين مطابقين
                </td>
              </tr>
            )}
            {suppliers?.map((sup) => {
              const isCleared = sup.remaining <= 0;
              return (
                <tr
                  key={sup.id}
                  onClick={() => setSelectedSupplierId(sup.id)}
                  className="border-b border-[var(--bd)] hover:bg-[var(--bs)] transition-colors cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-semibold text-[var(--br)]">
                    {sup.name}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--mu)]">
                    {sup.phone || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {fmtMoney(sup.totalPurchased)}
                  </td>
                  <td className="px-3 py-2.5">{fmtMoney(sup.totalPaid)}</td>
                  <td className="px-3 py-2.5">
                    {isCleared ? (
                      <span className="inline-block px-2 py-0.5 rounded-[99px] text-xs font-semibold bg-[var(--bs)] text-[var(--br)]">
                        مسدد
                      </span>
                    ) : (
                      <span className="font-bold text-[var(--da)]">
                        {fmtMoney(sup.remaining)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* نافذة إضافة مورد جديد */}
      {isCreating && (
        <Modal title="مورد جديد" onClose={() => setIsCreating(false)}>
          <SupplierForm onDone={() => setIsCreating(false)} />
        </Modal>
      )}

      {/* نافذة تفاصيل المورد وسجل معاملاته */}
      {selectedSupplierId !== null && (
        <Modal
          title="تفاصيل حساب المورد"
          onClose={() => setSelectedSupplierId(null)}
          wide
        >
          <SupplierDetails supplierId={selectedSupplierId} />
        </Modal>
      )}
    </div>
  );
}

// نموذج إضافة مورد
function SupplierForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      phone?: string;
      openingBalance: number;
    }) => {
      return api.post("/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onDone();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    createMutation.mutate({
      name,
      phone: phone.trim() ? phone : undefined,
      openingBalance: Number(openingBalance) || 0,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-right">
      {error && (
        <div className="p-3 rounded-[8px] bg-[var(--ds)] text-[var(--da)] text-xs font-semibold">
          {error}
        </div>
      )}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-[var(--mu)]">
          اسم المورد
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-sm outline-none focus:border-[var(--br)]"
          placeholder="أدخل اسم المورد أو الشركة"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-[var(--mu)]">
          رقم التليفون
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-sm outline-none focus:border-[var(--br)]"
          placeholder="010xxxxxxxx"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-[var(--mu)]">
          رصيد أول المدة (مستحق للمورد)
        </label>
        <input
          type="number"
          step="0.01"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--bd)] rounded-[8px] bg-[var(--cd)] text-sm outline-none focus:border-[var(--br)]"
        />
      </div>
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full py-2.5 bg-[var(--br)] text-white font-semibold rounded-[8px] cursor-pointer hover:opacity-95 text-sm"
      >
        {createMutation.isPending ? "جاري الحفظ..." : "حفظ المورد"}
      </button>
    </form>
  );
}

// تفاصيل المورد
function SupplierDetails({ supplierId }: { supplierId: number }) {
  const { data, isPending, error } = useSupplierDetails(supplierId);

  if (isPending)
    return (
      <div className="p-6 text-center text-[var(--mu)]">جاري التحميل...</div>
    );
  if (error)
    return (
      <div className="p-6 text-center text-[var(--da)]">
        {errorMessage(error)}
      </div>
    );

  const { supplier, purchases, payments } = data || {};

  return (
    <div className="space-y-6 text-right">
      <div className="flex items-center justify-between border-b border-[var(--bd)] pb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--tx)] m-0">
            {supplier.name}
          </h3>
          <p className="text-xs text-[var(--mu)] mt-1">
            تليفون: {supplier.phone || "غير مسجل"}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-[var(--bg)] rounded-[8px] border border-[var(--bd)]">
            <span className="block text-[11px] text-[var(--mu)]">
              إجمالي التوريدات
            </span>
            <span className="font-bold text-sm">
              {fmtMoney(supplier.totalPurchased)}
            </span>
          </div>
          <div className="text-center px-4 py-2 bg-[var(--bg)] rounded-[8px] border border-[var(--bd)]">
            <span className="block text-[11px] text-[var(--mu)]">
              المتبقي علينا
            </span>
            <span className="font-bold text-sm text-[var(--da)]">
              {fmtMoney(supplier.remaining)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold mb-2">فواتير الشراء والتوريدات</h4>
        <div className="overflow-x-auto bg-[var(--cd)] border border-[var(--bd)] rounded-[8px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--bd)] bg-[var(--bg)] text-[var(--mu)]">
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">رقم الفاتورة</th>
                <th className="p-2.5">الإجمالي</th>
                <th className="p-2.5">المدفوع</th>
                <th className="p-2.5">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {purchases?.map((p: any) => (
                <tr key={p.id} className="border-b border-[var(--bd)]">
                  <td className="p-2.5">{p.date}</td>
                  <td className="p-2.5 font-semibold">
                    {p.invoiceNumber || p.id}
                  </td>
                  <td className="p-2.5">{fmtMoney(p.total)}</td>
                  <td className="p-2.5">{fmtMoney(p.paid)}</td>
                  <td className="p-2.5 text-[var(--da)] font-semibold">
                    {fmtMoney(p.total - p.paid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
