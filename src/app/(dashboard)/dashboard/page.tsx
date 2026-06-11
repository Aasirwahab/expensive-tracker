import { currentUser } from "@clerk/nextjs/server";
import { TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ExpenseDonut } from "@/components/dashboard/expense-donut";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Panel } from "@/components/ui/panel";
import { kpis, summary } from "@/features/dashboard/placeholder";
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

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "there";
  const netProfit = kpis.find((k) => k.key === "netProfit")!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Good day, {firstName} 👋
          </p>
          <p className="text-sm text-muted">
            A quick look at this week&apos;s numbers.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Sample data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
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
          <SalesChart />
        </Panel>

        <div className="flex flex-col justify-between rounded-2xl bg-ink p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Est. net profit · this week
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
            <HeroStat label="Sales" value={formatNumber(summary.salesCount)} />
            <HeroStat label="Units sold" value={formatNumber(summary.unitsSold)} />
            <HeroStat label="Avg order" value={formatRs(summary.avgOrder)} />
            <HeroStat label="Low stock" value={`${summary.lowStock} items`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Top products"
          subtitle="By revenue this week"
          className="xl:col-span-2"
        >
          <TopProducts />
        </Panel>
        <Panel title="Where money went" subtitle="Expense breakdown">
          <ExpenseDonut />
        </Panel>
      </div>

      <Panel title="Recent activity" subtitle="Latest sales, expenses & stock">
        <RecentActivity />
      </Panel>
    </div>
  );
}
