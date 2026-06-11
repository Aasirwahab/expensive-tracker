import { topProducts } from "@/features/dashboard/placeholder";
import { formatRs, formatNumber } from "@/lib/money";
import { Sparkline } from "./sparkline";

export function TopProducts() {
  const max = Math.max(...topProducts.map((p) => p.revenue));

  return (
    <div className="space-y-0.5">
      {topProducts.map((p) => (
        <div
          key={p.sku}
          className="flex items-center gap-4 rounded-xl px-2 py-2.5 transition hover:bg-paper"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/5 font-display text-xs font-bold text-ink">
            {p.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted">
              {formatNumber(p.units)} sold · {p.margin}% margin
            </p>
          </div>
          <Sparkline data={p.trend} className="hidden text-brand/70 sm:block" />
          <div className="w-28 text-right">
            <p className="font-mono text-sm font-semibold tnum">
              {formatRs(p.revenue)}
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${(p.revenue / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
