"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRs } from "@/lib/money";
import type { DayPoint } from "@/features/dashboard/types";

type TooltipEntry = { dataKey?: string | number; value?: number; color?: string };

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
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="capitalize text-muted">{String(p.dataKey)}</span>
          <span className="ml-auto font-mono font-medium tnum">
            {formatRs(p.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function SalesChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 6 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted)", fontSize: 12 }}
          dy={8}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--line)" }} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="var(--ink)"
          strokeWidth={2}
          fill="url(#salesFill)"
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="var(--brand)"
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
