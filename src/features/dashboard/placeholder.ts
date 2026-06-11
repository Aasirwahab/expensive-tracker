// TEMPORARY placeholder data for the dashboard UI.
// Shapes mirror what real Prisma queries will return, so swapping to live
// data later is a drop-in. All money values are whole rupees (integers).

export type Kpi = {
  key: string;
  label: string;
  value: number;
  format: "rs" | "count";
  deltaPct: number;
  spark: number[];
  tone: "brand" | "neutral" | "loss";
};

export const kpis: Kpi[] = [
  {
    key: "grossSales",
    label: "Gross sales",
    value: 184500,
    format: "rs",
    deltaPct: 12.4,
    spark: [21, 26, 19, 31, 28, 35, 40],
    tone: "neutral",
  },
  {
    key: "grossProfit",
    label: "Gross profit",
    value: 63500,
    format: "rs",
    deltaPct: 8.1,
    spark: [9, 11, 8, 12, 11, 13, 14],
    tone: "brand",
  },
  {
    key: "expenses",
    label: "Operating expenses",
    value: 18200,
    format: "rs",
    deltaPct: -3.2,
    spark: [4, 3, 5, 4, 3, 2, 3],
    tone: "loss",
  },
  {
    key: "netProfit",
    label: "Est. net profit",
    value: 45300,
    format: "rs",
    deltaPct: 14.7,
    spark: [6, 8, 6, 9, 9, 11, 12],
    tone: "brand",
  },
];

export type DayPoint = { day: string; sales: number; profit: number };

export const salesSeries: DayPoint[] = [
  { day: "Mon", sales: 22000, profit: 7600 },
  { day: "Tue", sales: 26500, profit: 9100 },
  { day: "Wed", sales: 19800, profit: 6800 },
  { day: "Thu", sales: 31200, profit: 10800 },
  { day: "Fri", sales: 28400, profit: 9600 },
  { day: "Sat", sales: 35100, profit: 12200 },
  { day: "Sun", sales: 21500, profit: 7400 },
];

export type TopProduct = {
  name: string;
  sku: string;
  units: number;
  revenue: number;
  margin: number; // percent
  trend: number[];
};

export const topProducts: TopProduct[] = [
  { name: "Casio Enticer", sku: "CAS-204", units: 14, revenue: 63000, margin: 34, trend: [3, 5, 4, 6, 7, 6, 8] },
  { name: "Titan Neo", sku: "TIT-118", units: 11, revenue: 49500, margin: 31, trend: [2, 3, 5, 4, 5, 6, 6] },
  { name: "Seiko 5 Sport", sku: "SEI-553", units: 6, revenue: 41400, margin: 28, trend: [1, 2, 2, 3, 3, 4, 5] },
  { name: "Fastrack Reflex", sku: "FAS-090", units: 9, revenue: 18900, margin: 41, trend: [4, 3, 4, 5, 4, 5, 5] },
  { name: "Casio Vintage", sku: "CAS-771", units: 7, revenue: 11200, margin: 46, trend: [2, 2, 3, 2, 3, 4, 4] },
];

export type ExpenseSlice = { name: string; amount: number; color: string };

export const expenseSlices: ExpenseSlice[] = [
  { name: "Rent", amount: 9000, color: "#0c1411" },
  { name: "Salary", amount: 5200, color: "#0f9d6a" },
  { name: "Utilities", amount: 2100, color: "#c2891d" },
  { name: "Transport", amount: 1100, color: "#7c8b86" },
  { name: "Other", amount: 800, color: "#cdbf9f" },
];

export type Activity = {
  kind: "sale" | "expense" | "stock";
  title: string;
  detail: string;
  amount: number;
  positive: boolean;
  time: string;
};

export const recentActivity: Activity[] = [
  { kind: "sale", title: "Sale #1047", detail: "Casio Enticer × 1 · cash", amount: 4500, positive: true, time: "2m ago" },
  { kind: "expense", title: "Tea & snacks", detail: "Miscellaneous", amount: 350, positive: false, time: "31m ago" },
  { kind: "sale", title: "Sale #1046", detail: "Titan Neo × 1 · card", amount: 4500, positive: true, time: "1h ago" },
  { kind: "stock", title: "Stock in", detail: "Seiko 5 Sport × 5", amount: 0, positive: true, time: "2h ago" },
  { kind: "sale", title: "Sale #1045", detail: "Fastrack Reflex × 2 · cash", amount: 4200, positive: true, time: "3h ago" },
];

export const summary = {
  salesCount: 47,
  unitsSold: 58,
  avgOrder: 3926,
  lowStock: 3,
};
