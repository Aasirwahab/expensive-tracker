"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRs } from "@/lib/money";
import type { MonthlyRow } from "@/features/reports/queries";

type TooltipEntry = { dataKey?: string | number; value?: number; color?: string };

const LABELS: Record<string, string> = {
  sales: "Sales",
  net: "Net profit",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{LABELS[String(p.dataKey)] ?? p.dataKey}</span>
          <span className="ml-auto font-mono font-medium tnum">
            {formatRs(p.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function MonthlyChart({ data }: { data: MonthlyRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 6 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
        <XAxis
          dataKey="short"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted)", fontSize: 12 }}
          dy={8}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--line)", opacity: 0.3 }} />
        <Bar dataKey="sales" fill="var(--ink)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="net" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
