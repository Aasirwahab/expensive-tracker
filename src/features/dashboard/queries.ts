import { prisma } from "@/lib/db";
import type {
  DashboardData,
  Kpi,
  DayPoint,
  ExpenseSlice,
  Activity,
} from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLICE_COLORS = [
  "#0c1411",
  "#0f9d6a",
  "#c2891d",
  "#7c8b86",
  "#cdbf9f",
  "#9a86d4",
];

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/** Dashboard metrics for the last 7 days vs the previous 7 days. */
export async function getDashboardData(
  businessId: string,
): Promise<DashboardData> {
  const today0 = startOfDay(new Date());
  const weekStart = addDays(today0, -6); // 7 days including today
  const prevStart = addDays(today0, -13);

  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today0, -i));

  const [sales, saleItems, expenses, lowStockProducts, recentSales, recentExpenses] =
    await Promise.all([
      prisma.sale.findMany({
        where: { businessId, status: "COMPLETED", soldAt: { gte: prevStart } },
        select: { total: true, totalCogs: true, grossProfit: true, soldAt: true },
      }),
      prisma.saleItem.findMany({
        where: { businessId, createdAt: { gte: weekStart } },
        select: {
          productNameSnapshot: true,
          skuSnapshot: true,
          quantity: true,
          lineRevenue: true,
          lineProfit: true,
        },
      }),
      prisma.expense.findMany({
        where: { businessId, status: "ACTIVE", expenseDate: { gte: prevStart } },
        select: {
          amount: true,
          expenseDate: true,
          expenseCategory: { select: { name: true } },
        },
      }),
      prisma.product.findMany({
        where: {
          businessId,
          archivedAt: null,
          lowStockThreshold: { not: null },
        },
        select: { stockQuantity: true, lowStockThreshold: true },
      }),
      prisma.sale.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          saleNumber: true,
          total: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
      prisma.expense.findMany({
        where: { businessId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          description: true,
          amount: true,
          createdAt: true,
          expenseCategory: { select: { name: true } },
        },
      }),
    ]);

  // --- sales sums + daily series + deltas ---
  let grossSales = 0;
  let cogs = 0;
  let grossProfit = 0;
  let salesCount = 0;
  let prevSales = 0;
  let prevProfit = 0;
  const daily = new Map<string, { sales: number; profit: number }>();
  for (const d of days) daily.set(dayKey(d), { sales: 0, profit: 0 });

  for (const s of sales) {
    if (s.soldAt >= weekStart) {
      grossSales += s.total;
      cogs += s.totalCogs;
      grossProfit += s.grossProfit;
      salesCount++;
      const bucket = daily.get(dayKey(startOfDay(s.soldAt)));
      if (bucket) {
        bucket.sales += s.total;
        bucket.profit += s.grossProfit;
      }
    } else {
      prevSales += s.total;
      prevProfit += s.grossProfit;
    }
  }
  void cogs;

  // --- expenses ---
  let expensesTotal = 0;
  let prevExpenses = 0;
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    if (e.expenseDate >= weekStart) {
      expensesTotal += e.amount;
      const name = e.expenseCategory?.name ?? "Other";
      byCategory.set(name, (byCategory.get(name) ?? 0) + e.amount);
    } else {
      prevExpenses += e.amount;
    }
  }
  const netProfit = grossProfit - expensesTotal;
  const prevNet = prevProfit - prevExpenses;

  // --- units + top products ---
  let unitsSold = 0;
  const products = new Map<
    string,
    { name: string; sku: string | null; units: number; revenue: number; profit: number }
  >();
  for (const it of saleItems) {
    unitsSold += it.quantity;
    const entry = products.get(it.productNameSnapshot) ?? {
      name: it.productNameSnapshot,
      sku: it.skuSnapshot,
      units: 0,
      revenue: 0,
      profit: 0,
    };
    entry.units += it.quantity;
    entry.revenue += it.lineRevenue;
    entry.profit += it.lineProfit;
    products.set(it.productNameSnapshot, entry);
  }
  const topProducts = [...products.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      sku: p.sku ?? "",
      units: p.units,
      revenue: p.revenue,
      margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0,
    }));

  const series: DayPoint[] = days.map((d) => {
    const bucket = daily.get(dayKey(d))!;
    return {
      day: WEEKDAYS[d.getDay()],
      sales: bucket.sales,
      profit: bucket.profit,
    };
  });
  const salesSpark = series.map((d) => d.sales);
  const profitSpark = series.map((d) => d.profit);

  const kpis: Kpi[] = [
    {
      key: "grossSales",
      label: "Gross sales",
      value: grossSales,
      format: "rs",
      deltaPct: pct(grossSales, prevSales),
      spark: salesSpark,
      tone: "neutral",
    },
    {
      key: "grossProfit",
      label: "Gross profit",
      value: grossProfit,
      format: "rs",
      deltaPct: pct(grossProfit, prevProfit),
      spark: profitSpark,
      tone: "brand",
    },
    {
      key: "expenses",
      label: "Operating expenses",
      value: expensesTotal,
      format: "rs",
      deltaPct: pct(expensesTotal, prevExpenses),
      spark: series.map(() => 0),
      tone: "loss",
    },
    {
      key: "netProfit",
      label: "Est. net profit",
      value: netProfit,
      format: "rs",
      deltaPct: pct(netProfit, prevNet),
      spark: profitSpark,
      tone: "brand",
    },
  ];

  const expenseSlices: ExpenseSlice[] = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount], i) => ({
      name,
      amount,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));

  const activity: (Activity & { at: Date })[] = [
    ...recentSales.map((s) => ({
      kind: "sale" as const,
      title: `Sale #${s.saleNumber}`,
      detail: String(s.paymentMethod).toLowerCase().replace("_", " "),
      amount: s.total,
      positive: true,
      time: timeAgo(s.createdAt),
      at: s.createdAt,
    })),
    ...recentExpenses.map((e) => ({
      kind: "expense" as const,
      title: e.description,
      detail: e.expenseCategory?.name ?? "Expense",
      amount: e.amount,
      positive: false,
      time: timeAgo(e.createdAt),
      at: e.createdAt,
    })),
  ];
  const recentActivity: Activity[] = activity
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6)
    .map(({ at: _at, ...rest }) => rest);

  const lowStock = lowStockProducts.filter(
    (p) => p.lowStockThreshold != null && p.stockQuantity <= p.lowStockThreshold,
  ).length;

  return {
    kpis,
    summary: {
      salesCount,
      unitsSold,
      avgOrder: salesCount > 0 ? Math.round(grossSales / salesCount) : 0,
      lowStock,
    },
    series,
    topProducts,
    expenseSlices,
    recentActivity,
    hasData: sales.length > 0 || expenses.length > 0,
  };
}
