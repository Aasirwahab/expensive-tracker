import { prisma } from "@/lib/db";
import type {
  DashboardData,
  Kpi,
  DayPoint,
  ExpenseSlice,
  Activity,
} from "./types";
import type { ResolvedRange } from "@/lib/date-range";

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

export async function getDashboardData(
  businessId: string,
  range: ResolvedRange,
): Promise<DashboardData> {
  const to = range.to;
  const from = range.from; // null = all time

  // Previous period of equal length, for delta chips.
  let prevFrom: Date | null = null;
  if (from) {
    const len = to.getTime() - from.getTime();
    prevFrom = new Date(from.getTime() - len);
  }
  const lower = prevFrom ?? from;
  const salesWindow = lower ? { gte: lower, lte: to } : { lte: to };
  const rangeWindow = from ? { gte: from, lte: to } : { lte: to };

  // The trend chart is always the last 7 days, independent of the KPI range.
  const today0 = startOfDay(new Date());
  const weekStart = addDays(today0, -6);

  const [
    rangeSales,
    weekSales,
    items,
    expenses,
    lowStockProducts,
    recentSales,
    recentExpenses,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, status: "COMPLETED", soldAt: salesWindow },
      select: { total: true, totalCogs: true, grossProfit: true, soldAt: true },
    }),
    prisma.sale.findMany({
      where: { businessId, status: "COMPLETED", soldAt: { gte: weekStart } },
      select: { total: true, grossProfit: true, soldAt: true },
    }),
    prisma.saleItem.findMany({
      where: { businessId, sale: { status: "COMPLETED", soldAt: rangeWindow } },
      select: {
        productNameSnapshot: true,
        skuSnapshot: true,
        quantity: true,
        lineRevenue: true,
        lineProfit: true,
      },
    }),
    prisma.expense.findMany({
      where: { businessId, status: "ACTIVE", expenseDate: salesWindow },
      select: {
        amount: true,
        expenseDate: true,
        expenseCategory: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { businessId, archivedAt: null, lowStockThreshold: { not: null } },
      select: { name: true, stockQuantity: true, lowStockThreshold: true },
    }),
    prisma.sale.findMany({
      where: { businessId, status: "COMPLETED" },
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

  // --- KPI sums (current range vs previous) ---
  let grossSales = 0;
  let grossProfit = 0;
  let salesCount = 0;
  let prevSales = 0;
  let prevProfit = 0;
  for (const s of rangeSales) {
    if (!from || s.soldAt >= from) {
      grossSales += s.total;
      grossProfit += s.grossProfit;
      salesCount++;
    } else {
      prevSales += s.total;
      prevProfit += s.grossProfit;
    }
  }

  let expensesTotal = 0;
  let prevExpenses = 0;
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    if (!from || e.expenseDate >= from) {
      expensesTotal += e.amount;
      const name = e.expenseCategory?.name ?? "Other";
      byCategory.set(name, (byCategory.get(name) ?? 0) + e.amount);
    } else {
      prevExpenses += e.amount;
    }
  }
  const netProfit = grossProfit - expensesTotal;
  const prevNet = prevProfit - prevExpenses;

  // --- 7-day trend chart ---
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today0, -i));
  const daily = new Map<string, { sales: number; profit: number }>();
  for (const d of days) daily.set(dayKey(d), { sales: 0, profit: 0 });
  for (const s of weekSales) {
    const b = daily.get(dayKey(startOfDay(s.soldAt)));
    if (b) {
      b.sales += s.total;
      b.profit += s.grossProfit;
    }
  }
  const series: DayPoint[] = days.map((d) => {
    const b = daily.get(dayKey(d))!;
    return { day: WEEKDAYS[d.getDay()], sales: b.sales, profit: b.profit };
  });
  const salesSpark = series.map((d) => d.sales);
  const profitSpark = series.map((d) => d.profit);

  // --- units + top products (current range) ---
  let unitsSold = 0;
  const products = new Map<
    string,
    { name: string; sku: string | null; units: number; revenue: number; profit: number }
  >();
  for (const it of items) {
    unitsSold += it.quantity;
    const e = products.get(it.productNameSnapshot) ?? {
      name: it.productNameSnapshot,
      sku: it.skuSnapshot,
      units: 0,
      revenue: 0,
      profit: 0,
    };
    e.units += it.quantity;
    e.revenue += it.lineRevenue;
    e.profit += it.lineProfit;
    products.set(it.productNameSnapshot, e);
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

  const lowStockItems = lowStockProducts
    .filter(
      (p) => p.lowStockThreshold != null && p.stockQuantity <= p.lowStockThreshold,
    )
    .map((p) => ({
      name: p.name,
      stock: p.stockQuantity,
      threshold: p.lowStockThreshold as number,
    }))
    .sort((a, b) => a.stock - b.stock);

  return {
    kpis,
    summary: {
      salesCount,
      unitsSold,
      avgOrder: salesCount > 0 ? Math.round(grossSales / salesCount) : 0,
      lowStock: lowStockItems.length,
    },
    series,
    topProducts,
    expenseSlices,
    recentActivity,
    lowStockItems,
    hasData: rangeSales.length > 0 || expenses.length > 0,
  };
}
