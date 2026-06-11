import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatRs, formatNumber, formatDelta } from "@/lib/money";
import type { Kpi } from "@/features/dashboard/placeholder";
import { Sparkline } from "./sparkline";

const sparkColor: Record<Kpi["tone"], string> = {
  brand: "text-brand",
  neutral: "text-ink/35",
  loss: "text-loss/70",
};

export function StatCard({ kpi }: { kpi: Kpi }) {
  const up = kpi.deltaPct >= 0;
  const value =
    kpi.format === "rs" ? formatRs(kpi.value) : formatNumber(kpi.value);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(12,20,17,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {kpi.label}
        </span>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            up ? "bg-brand-soft text-brand-deep" : "bg-loss/10 text-loss"
          }`}
        >
          {up ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {formatDelta(kpi.deltaPct)}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="font-mono text-2xl font-semibold tracking-tight tnum">
          {value}
        </span>
        <Sparkline data={kpi.spark} className={sparkColor[kpi.tone]} />
      </div>
    </div>
  );
}
