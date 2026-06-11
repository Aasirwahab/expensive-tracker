import { prisma } from "@/lib/db";

export type ReportData = {
  summary: {
    grossSales: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    salesCount: number;
    unitsSold: number;
    avgOrder: number;
  };
  products: {
    name: string;
    sku: string;
    units: number;
    revenue: number;
    cogs: number;
    profit: number;
    margin: number;
  }[];
  expenses: { category: string; amount: number }[];
  staff: { name: string; salesCount: number; revenue: number; profit: number }[];
};

export async function getReportData(
  businessId: string,
  from: Date | null,
  to: Date,
): Promise<ReportData> {
  const soldAt = from ? { gte: from, lte: to } : { lte: to };
  const expenseDate = from ? { gte: from, lte: to } : { lte: to };

  const [sales, items, expenseRows] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, status: "COMPLETED", soldAt },
      select: {
        total: true,
        totalCogs: true,
        grossProfit: true,
        createdByUserId: true,
        createdBy: { select: { displayName: true } },
      },
    }),
    prisma.saleItem.findMany({
      where: { businessId, sale: { status: "COMPLETED", soldAt } },
      select: {
        productNameSnapshot: true,
        skuSnapshot: true,
        quantity: true,
        lineRevenue: true,
        lineCogs: true,
        lineProfit: true,
      },
    }),
    prisma.expense.findMany({
      where: { businessId, status: "ACTIVE", expenseDate },
      select: { amount: true, expenseCategory: { select: { name: true } } },
    }),
  ]);

  let grossSales = 0;
  let cogs = 0;
  let grossProfit = 0;
  const staffMap = new Map<
    string,
    { name: string; salesCount: number; revenue: number; profit: number }
  >();
  for (const s of sales) {
    grossSales += s.total;
    cogs += s.totalCogs;
    grossProfit += s.grossProfit;
    const entry = staffMap.get(s.createdByUserId) ?? {
      name: s.createdBy.displayName,
      salesCount: 0,
      revenue: 0,
      profit: 0,
    };
    entry.salesCount++;
    entry.revenue += s.total;
    entry.profit += s.grossProfit;
    staffMap.set(s.createdByUserId, entry);
  }

  let unitsSold = 0;
  const productMap = new Map<
    string,
    {
      name: string;
      sku: string;
      units: number;
      revenue: number;
      cogs: number;
      profit: number;
    }
  >();
  for (const it of items) {
    unitsSold += it.quantity;
    const entry = productMap.get(it.productNameSnapshot) ?? {
      name: it.productNameSnapshot,
      sku: it.skuSnapshot ?? "",
      units: 0,
      revenue: 0,
      cogs: 0,
      profit: 0,
    };
    entry.units += it.quantity;
    entry.revenue += it.lineRevenue;
    entry.cogs += it.lineCogs;
    entry.profit += it.lineProfit;
    productMap.set(it.productNameSnapshot, entry);
  }

  let expensesTotal = 0;
  const expenseMap = new Map<string, number>();
  for (const ex of expenseRows) {
    expensesTotal += ex.amount;
    const name = ex.expenseCategory?.name ?? "Other";
    expenseMap.set(name, (expenseMap.get(name) ?? 0) + ex.amount);
  }

  const salesCount = sales.length;

  return {
    summary: {
      grossSales,
      cogs,
      grossProfit,
      expenses: expensesTotal,
      netProfit: grossProfit - expensesTotal,
      salesCount,
      unitsSold,
      avgOrder: salesCount > 0 ? Math.round(grossSales / salesCount) : 0,
    },
    products: [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({
        ...p,
        margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0,
      })),
    expenses: [...expenseMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount })),
    staff: [...staffMap.values()].sort((a, b) => b.revenue - a.revenue),
  };
}
