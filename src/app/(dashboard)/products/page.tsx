import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { formatRs, formatNumber } from "@/lib/money";
import { Panel } from "@/components/ui/panel";
import { ProductForm } from "@/features/products/product-form";
import {
  ProductsTable,
  type ProductRow,
} from "@/features/products/products-table";

export default async function ProductsPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  const isOwner = ctx.role === "OWNER";

  const products = await prisma.product.findMany({
    where: { businessId: ctx.business.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imageUrl: p.imageUrl,
    currentCost: p.currentCost,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
  }));

  const stockValue = products.reduce(
    (sum, p) => sum + p.currentCost * p.stockQuantity,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Products
          </p>
          <p className="text-sm text-muted">
            {formatNumber(products.length)} item
            {products.length === 1 ? "" : "s"} · stock value{" "}
            {formatRs(stockValue)}
          </p>
        </div>
      </div>

      {isOwner && (
        <Panel
          title="Add a product"
          subtitle="Cost is in whole Rupees; selling price is set at sale time"
        >
          <ProductForm />
        </Panel>
      )}

      <Panel title="Your products">
        <ProductsTable products={rows} isOwner={isOwner} />
      </Panel>
    </div>
  );
}
