import { Truck } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { formatRs, formatNumber } from "@/lib/money";
import { listSuppliersWithBalances } from "@/features/suppliers/queries";
import { SuppliersList } from "@/features/suppliers/suppliers-list";

export default async function SuppliersPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <Truck className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Suppliers
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can view supplier balances.
          </p>
        </div>
      </div>
    );
  }

  const suppliers = await listSuppliersWithBalances(ctx.business.id);
  const owing = suppliers.filter((s) => s.balance > 0);
  const totalPayable = owing.reduce((sum, s) => sum + s.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Suppliers
          </p>
          <p className="text-sm text-muted">
            {formatNumber(suppliers.length)} supplier
            {suppliers.length === 1 ? "" : "s"} · {formatNumber(owing.length)} to
            pay
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-right">
          <p className="text-xs text-muted">Total to pay</p>
          <p className="font-mono text-xl font-bold tnum text-loss">
            {formatRs(totalPayable)}
          </p>
        </div>
      </div>

      <SuppliersList suppliers={suppliers} />
    </div>
  );
}
