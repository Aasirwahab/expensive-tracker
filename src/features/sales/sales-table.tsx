"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { formatRs, formatNumber } from "@/lib/money";

export type SaleRow = {
  id: string;
  saleNumber: string;
  soldAt: string;
  staff: string;
  payment: string;
  total: number;
  profit: number | null;
  status: string;
  items: { name: string; quantity: number; unitPrice: number }[];
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank",
  OTHER: "Other",
};

const FILTERS = ["ALL", "CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export function SalesTable({
  sales,
  showProfit,
}: {
  sales: SaleRow[];
  showProfit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState<string>("ALL");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) => {
      if (payment !== "ALL" && s.payment !== payment) return false;
      if (
        q &&
        !s.saleNumber.toLowerCase().includes(q) &&
        !s.items.some((i) => i.name.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [sales, query, payment]);

  if (sales.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        No sales yet — record one in Quick Sale.
      </p>
    );
  }

  const colSpan = showProfit ? 7 : 6;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sale # or product…"
            className="w-full rounded-xl border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:bg-surface"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPayment(f)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                payment === f
                  ? "bg-ink text-white"
                  : "text-muted hover:text-text"
              }`}
            >
              {f === "ALL" ? "All" : PAYMENT_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-2 font-medium">Sale</th>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Staff</th>
              <th className="px-2 py-2 text-right font-medium">Items</th>
              <th className="px-2 py-2 font-medium">Payment</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
              {showProfit && (
                <th className="px-2 py-2 text-right font-medium">Profit</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const isOpen = open === s.id;
              const units = s.items.reduce((n, i) => n + i.quantity, 0);
              return (
                <FragmentRow
                  key={s.id}
                  sale={s}
                  isOpen={isOpen}
                  units={units}
                  colSpan={colSpan}
                  showProfit={showProfit}
                  onToggle={() => setOpen(isOpen ? null : s.id)}
                />
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No sales match your filter.
          </p>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  sale,
  isOpen,
  units,
  colSpan,
  showProfit,
  onToggle,
}: {
  sale: SaleRow;
  isOpen: boolean;
  units: number;
  colSpan: number;
  showProfit: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-line/60 transition hover:bg-paper"
      >
        <td className="px-2 py-3 font-medium">
          <span className="flex items-center gap-1.5">
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted transition ${isOpen ? "rotate-180" : ""}`}
            />
            #{sale.saleNumber}
          </span>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-muted">{sale.soldAt}</td>
        <td className="px-2 py-3 text-muted">{sale.staff}</td>
        <td className="px-2 py-3 text-right font-mono tnum">
          {formatNumber(units)}
        </td>
        <td className="px-2 py-3">{PAYMENT_LABEL[sale.payment] ?? sale.payment}</td>
        <td className="px-2 py-3 text-right font-mono font-medium tnum">
          {formatRs(sale.total)}
        </td>
        {showProfit && (
          <td className="px-2 py-3 text-right font-mono tnum text-brand-deep">
            {sale.profit != null ? formatRs(sale.profit) : "—"}
          </td>
        )}
      </tr>
      {isOpen && (
        <tr className="border-b border-line/60 bg-paper/50">
          <td colSpan={colSpan} className="px-2 py-2">
            <ul className="space-y-1 px-1">
              {sale.items.map((i, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-text">
                    {i.name}{" "}
                    <span className="text-muted">
                      × {formatNumber(i.quantity)}
                    </span>
                  </span>
                  <span className="font-mono tnum text-muted">
                    {formatNumber(i.quantity)} × {formatRs(i.unitPrice)} ={" "}
                    <span className="font-medium text-text">
                      {formatRs(i.quantity * i.unitPrice)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
