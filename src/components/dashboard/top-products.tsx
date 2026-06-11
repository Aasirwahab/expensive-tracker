import { formatRs, formatNumber } from "@/lib/money";
import type { TopProduct } from "@/features/dashboard/types";

export function TopProducts({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No sales yet — your best sellers will appear here.
      </p>
    );
  }

  const max = Math.max(...products.map((p) => p.revenue));

  return (
    <div className="space-y-0.5">
      {products.map((p) => (
        <div
          key={p.name}
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
          <div className="w-28 text-right">
            <p className="font-mono text-sm font-semibold tnum">
              {formatRs(p.revenue)}
            </p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${max > 0 ? (p.revenue / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
