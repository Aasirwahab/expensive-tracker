import { Package } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { formatRs, formatNumber } from "@/lib/money";
import { Panel } from "@/components/ui/panel";
import { ProductForm } from "@/features/products/product-form";

export default async function ProductsPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  const isOwner = ctx.role === "OWNER";

  const products = await prisma.product.findMany({
    where: { businessId: ctx.business.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

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
        <Panel title="Add a product" subtitle="Cost and price are in whole Rupees">
          <ProductForm />
        </Panel>
      )}

      <Panel title="Your products">
        {products.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
              <Package className="h-5 w-5" />
            </div>
            <p className="font-medium">No products yet</p>
            <p className="text-sm text-muted">
              {isOwner
                ? "Add your first product above to get started."
                : "The owner hasn't added any products yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 text-right font-medium">Cost</th>
                  <th className="px-2 py-2 text-right font-medium">Price</th>
                  <th className="px-2 py-2 text-right font-medium">Stock</th>
                  <th className="px-2 py-2 text-right font-medium">Stock value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low =
                    p.lowStockThreshold != null &&
                    p.stockQuantity <= p.lowStockThreshold;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-line/60 last:border-0"
                    >
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/5 font-display text-xs font-bold text-ink">
                              {p.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted">{p.sku ?? "—"}</td>
                      <td className="px-2 py-3 text-right font-mono tnum">
                        {formatRs(p.currentCost)}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tnum">
                        {p.defaultPrice != null ? formatRs(p.defaultPrice) : "—"}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tnum">
                        <span className={low ? "text-loss" : ""}>
                          {formatNumber(p.stockQuantity)}
                        </span>
                        {low && (
                          <span className="ml-1 rounded bg-loss/10 px-1 text-[10px] text-loss">
                            low
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tnum">
                        {formatRs(p.currentCost * p.stockQuantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
