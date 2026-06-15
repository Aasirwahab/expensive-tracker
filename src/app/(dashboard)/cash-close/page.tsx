import { Banknote } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { formatRs, formatNumber } from "@/lib/money";
import { resolveDay, todayValue } from "@/lib/date-range";
import { getDayCloseData } from "@/features/cash-close/queries";
import { CashCount } from "@/features/cash-close/cash-count";
import { DayPicker } from "@/components/ui/day-picker";
import { Panel } from "@/components/ui/panel";

function signedRs(n: number) {
  return n < 0 ? `−${formatRs(-n)}` : formatRs(n);
}

export default async function CashClosePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <Banknote className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Day close
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can close the day.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const day = resolveDay(sp.date);
  const data = await getDayCloseData(ctx.business.id, day.from, day.to);

  const cards = [
    { label: "Sales", value: formatRs(data.revenue), sub: `${formatNumber(data.salesCount)} sale${data.salesCount === 1 ? "" : "s"}` },
    { label: "Gross profit", value: formatRs(data.grossProfit), cls: "text-brand-deep" },
    { label: "Expenses", value: formatRs(data.expenses), cls: "text-loss" },
    {
      label: "Net profit",
      value: signedRs(data.netProfit),
      cls: data.netProfit < 0 ? "text-loss" : "text-brand-deep",
      sub: "profit − expenses",
    },
  ];

  const cashLines = [
    { label: "Cash from sales", amount: data.cashSales, sign: 1 },
    { label: "Cash repayments (customers)", amount: data.cashRepaid, sign: 1 },
    { label: "Cash expenses", amount: data.cashExpenses, sign: -1 },
    { label: "Cash paid to suppliers", amount: data.cashToSuppliers, sign: -1 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Day close
          </p>
          <p className="text-sm text-muted">{day.label}</p>
        </div>
        <DayPicker value={day.value} max={todayValue()} basePath="/cash-close" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <p className="text-xs text-muted">{c.label}</p>
            <p className={`mt-1 font-mono text-xl font-bold tnum ${c.cls ?? ""}`}>
              {c.value}
            </p>
            {c.sub && <p className="mt-0.5 text-xs text-muted">{c.sub}</p>}
          </div>
        ))}
      </div>

      <Panel
        title="Cash drawer"
        subtitle="Only cash flows are counted here — card, bank and credit don't touch the drawer"
      >
        <ul className="space-y-1.5 text-sm">
          {cashLines.map((l) => (
            <li key={l.label} className="flex items-center justify-between">
              <span className="text-muted">{l.label}</span>
              <span
                className={`font-mono tnum ${l.sign < 0 ? "text-loss" : "text-text"}`}
              >
                {l.sign < 0 ? "−" : "+"}
                {formatRs(l.amount)}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-line pt-1.5 font-medium">
            <span>Expected cash change today</span>
            <span className="font-mono font-semibold tnum">
              {signedRs(data.expectedCashNet)}
            </span>
          </li>
        </ul>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-3 text-sm font-medium">Count the drawer</p>
          <CashCount expectedNet={data.expectedCashNet} />
        </div>
      </Panel>
    </div>
  );
}
