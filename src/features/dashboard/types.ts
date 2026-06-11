export type Kpi = {
  key: string;
  label: string;
  value: number;
  format: "rs" | "count";
  deltaPct: number;
  spark: number[];
  tone: "brand" | "neutral" | "loss";
};

export type DayPoint = { day: string; sales: number; profit: number };

export type TopProduct = {
  name: string;
  sku: string;
  units: number;
  revenue: number;
  margin: number;
};

export type ExpenseSlice = { name: string; amount: number; color: string };

export type Activity = {
  kind: "sale" | "expense" | "stock";
  title: string;
  detail: string;
  amount: number;
  positive: boolean;
  time: string;
};

export type DashboardData = {
  kpis: Kpi[];
  summary: {
    salesCount: number;
    unitsSold: number;
    avgOrder: number;
    lowStock: number;
  };
  series: DayPoint[];
  topProducts: TopProduct[];
  expenseSlices: ExpenseSlice[];
  recentActivity: Activity[];
  hasData: boolean;
};
