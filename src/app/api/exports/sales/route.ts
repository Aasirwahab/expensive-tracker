import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";
import { resolvePeriod } from "@/lib/date-range";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return new Response("Unauthorized", { status: 401 });
  if (ctx.role !== "OWNER") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const { range, month } = resolvePeriod(params.get("range"), params.get("month"));
  const soldAt = range.from
    ? { gte: range.from, lte: range.to }
    : { lte: range.to };

  const items = await prisma.saleItem.findMany({
    where: { businessId: ctx.business.id, sale: { status: "COMPLETED", soldAt } },
    select: {
      productNameSnapshot: true,
      skuSnapshot: true,
      quantity: true,
      unitCost: true,
      unitPrice: true,
      lineRevenue: true,
      lineCogs: true,
      lineProfit: true,
      sale: {
        select: {
          saleNumber: true,
          soldAt: true,
          paymentMethod: true,
          createdBy: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Sale #",
    "Date",
    "Product",
    "SKU",
    "Qty",
    "Unit cost",
    "Unit price",
    "Revenue",
    "COGS",
    "Profit",
    "Payment",
    "Staff",
  ];
  const rows = items.map((i) => [
    i.sale.saleNumber,
    i.sale.soldAt.toISOString(),
    i.productNameSnapshot,
    i.skuSnapshot ?? "",
    i.quantity,
    i.unitCost,
    i.unitPrice,
    i.lineRevenue,
    i.lineCogs,
    i.lineProfit,
    String(i.sale.paymentMethod),
    i.sale.createdBy.displayName,
  ]);

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${month ?? range.key}.csv"`,
    },
  });
}
