import { useState } from "react";
import { Receipt, Truck } from "lucide-react";
import type { Unit } from "../../lib/format";
import ItemSalesHistory from "./ItemSalesHistory";
import ItemPurchasesHistory from "./ItemPurchasesHistory";

type Tab = "sales" | "purchases";

const tabs: { id: Tab; label: string; Icon: typeof Receipt }[] = [
  { id: "sales", label: "سجل المبيعات", Icon: Receipt },
  { id: "purchases", label: "سجل المشتريات", Icon: Truck },
];

// تابين (مبيعات | مشتريات): واحد بس ظاهر، والتاني بيتحمّل أول ما تفتحه وبيحتفظ بفلاتره
export default function ItemHistory({
  itemId,
  unit,
}: {
  itemId: number;
  unit: Unit;
}) {
  const [tab, setTab] = useState<Tab>("sales");
  const [opened, setOpened] = useState<Set<Tab>>(new Set(["sales"]));
  const pick = (t: Tab) => {
    setTab(t);
    setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
  };

  return (
    <section className="mt-8">
      <div
        role="tablist"
        className="inline-flex gap-1 p-1 mb-4 bg-[var(--bg)] border border-[var(--bd)] rounded-[10px]"
      >
        {tabs.map(({ id, label, Icon }) => {
          const on = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => pick(id)}
              className={`font-[inherit] inline-flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-bold cursor-pointer border-0 transition-colors ${
                on
                  ? "bg-[var(--cd)] text-[var(--br)] shadow-xs"
                  : "bg-transparent text-[var(--mu)] hover:text-[var(--tx)]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {opened.has("sales") && (
        <div hidden={tab !== "sales"}>
          <ItemSalesHistory itemId={itemId} unit={unit} />
        </div>
      )}
      {opened.has("purchases") && (
        <div hidden={tab !== "purchases"}>
          <ItemPurchasesHistory itemId={itemId} unit={unit} />
        </div>
      )}
    </section>
  );
}
