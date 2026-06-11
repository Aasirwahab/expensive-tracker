import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { formatRs, formatNumber } from "@/lib/money";
import { Panel } from "@/components/ui/panel";
import { SalesTable, type SaleRow } from "@/features/sales/sales-table";

const dtFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default async function SalesPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  const isOwner = ctx.role === "OWNER";
  const businessId = ctx.business.id;

  // Owner sees all sales; staff see only their own.
  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      ...(isOwner ? {} : { createdByUserId: ctx.user.id }),
    },
    orderBy: { createdAt: "desc" },
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
  });

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

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.grossProfit, 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-bold tracking-tight">Sales</p>
        <p className="text-sm text-muted">
          {formatNumber(sales.length)} sale{sales.length === 1 ? "" : "s"} ·
          total {formatRs(totalRevenue)}
          {isOwner && ` · profit ${formatRs(totalProfit)}`}
        </p>
      </div>

      <Panel title={isOwner ? "All sales" : "Your sales"}>
        <SalesTable sales={rows} showProfit={isOwner} />
      </Panel>
    </div>
  );
}
