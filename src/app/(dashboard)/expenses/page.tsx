import { Wallet } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { formatRs, formatNumber } from "@/lib/money";
import { Panel } from "@/components/ui/panel";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { VoidButton } from "@/features/expenses/void-button";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function ExpensesPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <Wallet className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Expenses
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can manage expenses.
          </p>
        </div>
      </div>
    );
  }

  const businessId = ctx.business.id;
  const [categories, expenses] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.expense.findMany({
      where: { businessId, status: "ACTIVE" },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { expenseCategory: { select: { name: true } } },
    }),
  ]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-bold tracking-tight">
          Expenses
        </p>
        <p className="text-sm text-muted">
          {formatNumber(expenses.length)} expense
          {expenses.length === 1 ? "" : "s"} · total {formatRs(total)}
        </p>
      </div>

      <Panel
        title="Add an expense"
        subtitle="Stock purchases aren't expenses — those are tracked as product cost"
      >
        <ExpenseForm categories={categories} />
      </Panel>

      <Panel title="Recent expenses">
        {expenses.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="font-medium">No expenses yet</p>
            <p className="text-sm text-muted">Add your first expense above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">Payee</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-line/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-2 py-3 text-muted">
                      {dateFmt.format(e.expenseDate)}
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium">
                        {e.expenseCategory.name}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-medium">{e.description}</td>
                    <td className="px-2 py-3 text-muted">{e.payee ?? "—"}</td>
                    <td className="px-2 py-3 text-right font-mono tnum">
                      {formatRs(e.amount)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <VoidButton expenseId={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
