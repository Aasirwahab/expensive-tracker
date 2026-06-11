import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return new Response("Unauthorized", { status: 401 });
  if (ctx.role !== "OWNER") return new Response("Forbidden", { status: 403 });

  const products = await prisma.product.findMany({
    where: { businessId: ctx.business.id, archivedAt: null },
    orderBy: { name: "asc" },
  });

  const headers = ["Product", "SKU", "Purchase cost", "Stock", "Stock value"];
  const rows = products.map((p) => [
    p.name,
    p.sku ?? "",
    p.currentCost,
    p.stockQuantity,
    p.currentCost * p.stockQuantity,
  ]);

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products.csv"`,
    },
  });
}
