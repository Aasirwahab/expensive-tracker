import { prisma } from "@/lib/db";

export type DayClose = {
  salesCount: number;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number; // grossProfit − expenses
  // Cash drawer movement for the day:
  cashSales: number; // cash-method sales
  cashRepaid: number; // customer repayments taken in cash
  cashExpenses: number; // expenses paid in cash
  cashToSuppliers: number; // supplier payments made in cash
  expectedCashNet: number; // cash in − cash out
};

/**
 * End-of-day numbers for one business day. Money totals come from COMPLETED
 * sales and ACTIVE expenses only; the cash drawer figures count just the
 * CASH-method flows. Owner-only data (revenue/profit). The up-front cash on a
 * credit sale isn't counted as cash here (the sale's method is CREDIT).
 */
export async function getDayCloseData(
  businessId: string,
  from: Date,
  to: Date,
): Promise<DayClose> {
  const soldAt = { gte: from, lte: to };
  const paidAt = { gte: from, lte: to };
  const expenseDate = { gte: from, lte: to };

  const [salesAll, salesCash, repayCash, expAll, expCash, supCash] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { businessId, status: "COMPLETED", soldAt },
        _sum: { total: true, grossProfit: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { businessId, status: "COMPLETED", paymentMethod: "CASH", soldAt },
        _sum: { total: true },
      }),
      prisma.customerPayment.aggregate({
        where: { businessId, method: "CASH", paidAt },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { businessId, status: "ACTIVE", expenseDate },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { businessId, status: "ACTIVE", paymentMethod: "CASH", expenseDate },
        _sum: { amount: true },
      }),
      prisma.supplierPayment.aggregate({
        where: { businessId, method: "CASH", paidAt },
        _sum: { amount: true },
      }),
    ]);

  const revenue = salesAll._sum.total ?? 0;
  const grossProfit = salesAll._sum.grossProfit ?? 0;
  const expenses = expAll._sum.amount ?? 0;
  const cashSales = salesCash._sum.total ?? 0;
  const cashRepaid = repayCash._sum.amount ?? 0;
  const cashExpenses = expCash._sum.amount ?? 0;
  const cashToSuppliers = supCash._sum.amount ?? 0;

  return {
    salesCount: salesAll._count,
    revenue,
    grossProfit,
    expenses,
    netProfit: grossProfit - expenses,
    cashSales,
    cashRepaid,
    cashExpenses,
    cashToSuppliers,
    expectedCashNet: cashSales + cashRepaid - cashExpenses - cashToSuppliers,
  };
}
