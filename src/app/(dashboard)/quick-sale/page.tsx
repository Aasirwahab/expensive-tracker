import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { QuickSale, type SaleProduct } from "@/features/sales/quick-sale";

export default async function QuickSalePage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  const isOwner = ctx.role === "OWNER";

  const products = await prisma.product.findMany({
    where: { businessId: ctx.business.id, archivedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });

  // Cost is owner-only: never send it to a staff member's browser.
  const saleProducts: SaleProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imageUrl: p.imageUrl,
    currentCost: isOwner ? p.currentCost : 0,
    stockQuantity: p.stockQuantity,
    allowNegativeStock: p.allowNegativeStock,
  }));

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-bold tracking-tight">
          Quick Sale
        </p>
        <p className="text-sm text-muted">
          Tap or drag a product, set the price, and complete the sale.
        </p>
      </div>
      <QuickSale products={saleProducts} showProfit={isOwner} />
    </div>
  );
}
