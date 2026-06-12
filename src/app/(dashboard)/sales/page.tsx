import Link from "next/link";
import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { formatRs, formatNumber } from "@/lib/money";
import { resolvePeriod, RANGE_OPTIONS, currentMonthValue } from "@/lib/date-range";
import { Panel } from "@/components/ui/panel";
import { MonthPicker } from "@/components/ui/month-picker";
import { SalesTable, type SaleRow } from "@/features/sales/sales-table";

const dtFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  const isOwner = ctx.role === "OWNER";
  const businessId = ctx.business.id;

  // Sales history defaults to all time; tabs narrow it to today/week/month and
  // the month picker (?month=YYYY-MM) jumps to one specific calendar month.
  const sp = await searchParams;
  const { range, month } = resolvePeriod(sp.range ?? "all", sp.month);

  // Shared filter: owner sees all sales, staff only their own, within the range.
  const baseWhere = {
    businessId,
    ...(isOwner ? {} : { createdByUserId: ctx.user.id }),
    ...(range.from ? { soldAt: { gte: range.from, lte: range.to } } : {}),
  };

  const [sales, totals] = await Promise.all([
    prisma.sale.findMany({
      where: baseWhere,
      orderBy: { soldAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { displayName: true } },
        items: {
          select: {
            productNameSnapshot: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    }),
    // Voided sales don't count toward revenue or profit, so totals are
    // aggregated over COMPLETED sales across the whole range (not the
    // capped list above).
    prisma.sale.aggregate({
      where: { ...baseWhere, status: "COMPLETED" },
      _sum: { total: true, grossProfit: true },
      _count: true,
    }),
  ]);

  const rows: SaleRow[] = sales.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    soldAt: dtFmt.format(s.soldAt),
    staff: s.createdBy.displayName,
    payment: String(s.paymentMethod),
    total: s.total,
    profit: isOwner ? s.grossProfit : null, // cost/profit is owner-only
    status: String(s.status),
    items: s.items.map((i) => ({
      name: i.productNameSnapshot,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  }));

  const count = totals._count;
  const totalRevenue = totals._sum.total ?? 0;
  const totalProfit = totals._sum.grossProfit ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">Sales</p>
          <p className="text-sm text-muted">
            {formatNumber(count)} sale{count === 1 ? "" : "s"} ·{" "}
            {range.label.toLowerCase()} · total {formatRs(totalRevenue)}
            {isOwner && ` · profit ${formatRs(totalProfit)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
            {RANGE_OPTIONS.map((r) => (
              <Link
                key={r.key}
                href={`/sales?range=${r.key}`}
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
            basePath="/sales"
          />
        </div>
      </div>

      <Panel title={isOwner ? "All sales" : "Your sales"}>
        <SalesTable sales={rows} showProfit={isOwner} canVoid={isOwner} />
      </Panel>
    </div>
  );
}
