"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { expenseSlices } from "@/features/dashboard/placeholder";
import { formatRs } from "@/lib/money";

export function ExpenseDonut() {
  const total = expenseSlices.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expenseSlices}
              dataKey="amount"
              nameKey="name"
              innerRadius={48}
              outerRadius={66}
              paddingAngle={2}
              stroke="none"
            >
              {expenseSlices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-muted">
            Total
          </span>
          <span className="font-mono text-sm font-semibold tnum">
            {formatRs(total)}
          </span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {expenseSlices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-muted">{s.name}</span>
            <span className="ml-auto font-mono tnum">{formatRs(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
