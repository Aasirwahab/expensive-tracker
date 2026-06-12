import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, PackageCheck, TriangleAlert } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { getDashboardData } from "@/features/dashboard/queries";
import { resolvePeriod, RANGE_OPTIONS, currentMonthValue } from "@/lib/date-range";
import { MonthPicker } from "@/components/ui/month-picker";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ExpenseDonut } from "@/components/dashboard/expense-donut";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Panel } from "@/components/ui/panel";
import { formatRs, formatNumber, formatDelta } from "@/lib/money";

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-ink" /> Sales
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-brand" /> Profit
      </span>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="font-mono text-sm font-semibold tnum">{value}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  if (ctx.role !== "OWNER") redirect("/quick-sale");

  const sp = await searchParams;
  const { range, month } = resolvePeriod(sp.range, sp.month);
  const data = await getDashboardData(ctx.business.id, range);
  const netProfit = data.kpis.find((k) => k.key === "netProfit")!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Good day, {ctx.user.displayName} 👋
          </p>
          <p className="text-sm text-muted">Your shop — {range.label.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
            {RANGE_OPTIONS.map((r) => (
              <Link
                key={r.key}
                href={`/dashboard?range=${r.key}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  !month && range.key === r.key
                    ? "bg-ink text-white"
                    : "text-muted hover:text-text"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <MonthPicker
            value={month ?? ""}
            max={currentMonthValue()}
            basePath="/dashboard"
          />
        </div>
      </div>

      {!data.hasData && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-muted">
          No sales or expenses in this period. Record a sale in{" "}
          <span className="font-medium text-text">Quick Sale</span> to see your
          numbers.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <StatCard key={kpi.key} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Sales & profit"
          subtitle="Last 7 days"
          action={<Legend />}
          className="xl:col-span-2"
        >
          <SalesChart data={data.series} />
        </Panel>

        <div className="flex flex-col justify-between rounded-2xl bg-ink p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Est. net profit · {range.label.toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[11px] font-semibold text-brand">
              <TrendingUp className="h-3 w-3" />
              {formatDelta(netProfit.deltaPct)}
            </span>
          </div>
          <div className="my-5">
            <p className="font-mono text-4xl font-semibold tracking-tight tnum">
              {formatRs(netProfit.value)}
            </p>
            <p className="mt-1 text-sm text-white/50">
              Gross profit minus operating expenses.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <HeroStat label="Sales" value={formatNumber(data.summary.salesCount)} />
            <HeroStat
              label="Units sold"
              value={formatNumber(data.summary.unitsSold)}
            />
            <HeroStat label="Avg order" value={formatRs(data.summary.avgOrder)} />
            <HeroStat
              label="Low stock"
              value={`${data.summary.lowStock} items`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Top products"
          subtitle={`By revenue · ${range.label.toLowerCase()}`}
          className="xl:col-span-2"
        >
          <TopProducts products={data.topProducts} />
        </Panel>
        <Panel title="Where money went" subtitle="Expense breakdown">
          <ExpenseDonut slices={data.expenseSlices} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Recent activity"
          subtitle="Latest sales & expenses"
          className="xl:col-span-2"
        >
          <RecentActivity items={data.recentActivity} />
        </Panel>
        <Panel title="Low stock" subtitle="Restock soon">
          {data.lowStockItems.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted">
              <PackageCheck className="h-4 w-4 text-brand" /> Everything is well
              stocked.
            </div>
          ) : (
            <ul className="space-y-2">
              {data.lowStockItems.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warn" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="font-mono tnum text-loss">
                    {formatNumber(p.stock)} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
