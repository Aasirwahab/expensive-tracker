import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { resolveRange, RANGE_OPTIONS } from "@/lib/date-range";
import { getReportData } from "@/features/reports/queries";
import { formatRs, formatNumber } from "@/lib/money";
import { Panel } from "@/components/ui/panel";

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-mono tracking-tight tnum ${strong ? "text-xl font-semibold" : "text-lg font-medium"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Reports
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can view reports.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const range = resolveRange(sp.range);
  const data = await getReportData(ctx.business.id, range.from, range.to);
  const q = `?range=${range.key}`;
  const s = data.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Reports
          </p>
          <p className="text-sm text-muted">{range.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
            {RANGE_OPTIONS.map((r) => (
              <Link
                key={r.key}
                href={`/reports?range=${r.key}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  range.key === r.key
                    ? "bg-ink text-white"
                    : "text-muted hover:text-text"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Gross sales" value={formatRs(s.grossSales)} strong />
        <Stat label="Cost of goods" value={formatRs(s.cogs)} />
        <Stat label="Gross profit" value={formatRs(s.grossProfit)} strong />
        <Stat label="Expenses" value={formatRs(s.expenses)} />
        <Stat label="Net profit" value={formatRs(s.netProfit)} strong />
        <Stat label="Sales" value={formatNumber(s.salesCount)} />
        <Stat label="Units sold" value={formatNumber(s.unitsSold)} />
        <Stat label="Avg order" value={formatRs(s.avgOrder)} />
      </div>

      {/* Exports */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Export CSV:</span>
        {[
          { href: `/api/exports/sales${q}`, label: "Sales" },
          { href: `/api/exports/expenses${q}`, label: "Expenses" },
          { href: `/api/exports/products`, label: "Products" },
        ].map((x) => (
          <a
            key={x.label}
            href={x.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:text-brand-deep"
          >
            <Download className="h-3.5 w-3.5" />
            {x.label}
          </a>
        ))}
      </div>

      {/* Product performance */}
      <Panel title="Product performance" subtitle="By revenue in this period">
        {data.products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No sales in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 text-right font-medium">Units</th>
                  <th className="px-2 py-2 text-right font-medium">Revenue</th>
                  <th className="px-2 py-2 text-right font-medium">Cost</th>
                  <th className="px-2 py-2 text-right font-medium">Profit</th>
                  <th className="px-2 py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr
                    key={p.name}
                    className="border-b border-line/60 last:border-0"
                  >
                    <td className="px-2 py-3 font-medium">{p.name}</td>
                    <td className="px-2 py-3 text-right font-mono tnum">
                      {formatNumber(p.units)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono tnum">
                      {formatRs(p.revenue)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono tnum text-muted">
                      {formatRs(p.cogs)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono tnum text-brand-deep">
                      {formatRs(p.profit)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono tnum">
                      {p.margin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Expenses by category">
          {data.expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No expenses in this period.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.expenses.map((e) => (
                <li
                  key={e.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted">{e.category}</span>
                  <span className="font-mono tnum">{formatRs(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Sales by staff">
          {data.staff.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No sales in this period.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.staff.map((st) => (
                <li
                  key={st.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {st.name}{" "}
                    <span className="text-muted">
                      · {formatNumber(st.salesCount)} sale
                      {st.salesCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-mono tnum">{formatRs(st.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
