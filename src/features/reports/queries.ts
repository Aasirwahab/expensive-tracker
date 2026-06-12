import { prisma } from "@/lib/db";

export type MonthlyRow = {
  key: string; // "2026-06"
  label: string; // "Jun 2026"
  short: string; // "Jun"
  sales: number; // gross revenue (completed sales)
  profit: number; // gross profit
  expenses: number; // active expenses
  net: number; // profit - expenses
  salesCount: number;
  salesChangePct: number | null; // vs previous month; null = no baseline
  netChangePct: number | null;
};

function pctChange(prev: number, curr: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null; // null = "new" (nothing to compare to)
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

/**
 * A month-by-month breakdown of sales, profit, expenses and net profit for the
 * last `monthsBack` calendar months, with month-over-month % change. Month
 * boundaries use server-local time, consistent with the rest of the app's
 * date ranges (see lib/date-range.ts).
 */
export async function getMonthlyComparison(
  businessId: string,
  monthsBack = 6,
): Promise<MonthlyRow[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, status: "COMPLETED", soldAt: { gte: start, lte: end } },
      select: { total: true, grossProfit: true, soldAt: true },
    }),
    prisma.expense.findMany({
      where: { businessId, status: "ACTIVE", expenseDate: { gte: start, lte: end } },
      select: { amount: true, expenseDate: true },
    }),
  ]);

  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const months: MonthlyRow[] = [];
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1) + i, 1);
    indexByKey.set(keyOf(d), months.length);
    months.push({
      key: keyOf(d),
      label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      short: d.toLocaleDateString("en-GB", { month: "short" }),
      sales: 0,
      profit: 0,
      expenses: 0,
      net: 0,
      salesCount: 0,
      salesChangePct: null,
      netChangePct: null,
    });
  }

  for (const s of sales) {
    const idx = indexByKey.get(keyOf(s.soldAt));
    if (idx === undefined) continue;
    months[idx].sales += s.total;
    months[idx].profit += s.grossProfit;
    months[idx].salesCount += 1;
  }
  for (const e of expenses) {
    const idx = indexByKey.get(keyOf(e.expenseDate));
    if (idx === undefined) continue;
    months[idx].expenses += e.amount;
  }

  for (let i = 0; i < months.length; i++) {
    months[i].net = months[i].profit - months[i].expenses;
    if (i > 0) {
      months[i].salesChangePct = pctChange(months[i - 1].sales, months[i].sales);
      months[i].netChangePct = pctChange(months[i - 1].net, months[i].net);
    }
  }

  return months;
}

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
