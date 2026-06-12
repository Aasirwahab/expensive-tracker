import { Users } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { formatRs, formatNumber } from "@/lib/money";
import { listCustomersWithBalances } from "@/features/customers/queries";
import { CustomersList } from "@/features/customers/customers-list";

export default async function CustomersPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Customers
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can view customer balances.
          </p>
        </div>
      </div>
    );
  }

  const customers = await listCustomersWithBalances(ctx.business.id);
  const owing = customers.filter((c) => c.balance > 0);
  const totalReceivable = owing.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Customers
          </p>
          <p className="text-sm text-muted">
            {formatNumber(customers.length)} customer
            {customers.length === 1 ? "" : "s"} · {formatNumber(owing.length)} on
            credit
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-right">
          <p className="text-xs text-muted">Total to collect</p>
          <p className="font-mono text-xl font-bold tnum text-loss">
            {formatRs(totalReceivable)}
          </p>
        </div>
      </div>

      <CustomersList customers={customers} />
    </div>
  );
}
