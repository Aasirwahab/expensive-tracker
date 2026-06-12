import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { QuickSale, type SaleProduct } from "@/features/sales/quick-sale";
import { listCustomersForPicker } from "@/features/customers/queries";

export default async function QuickSalePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding
  const isOwner = ctx.role === "OWNER";
  const sp = await searchParams;

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: ctx.business.id, archivedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
    // Owners see each customer's outstanding balance in the picker; staff don't.
    listCustomersForPicker(ctx.business.id, isOwner),
  ]);

  // A ?customer= link (from the Customers page) pre-selects that customer for a
  // credit sale — but only if they really belong to this business.
  const initialCustomerId =
    sp.customer && customers.some((c) => c.id === sp.customer)
      ? sp.customer
      : null;

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
      <QuickSale
        products={saleProducts}
        customers={customers}
        showProfit={isOwner}
        businessName={ctx.business.name}
        initialCustomerId={initialCustomerId}
      />
    </div>
  );
}
