"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

/**
 * Pick a specific calendar month to filter a page on. Navigates to
 * `${basePath}?month=YYYY-MM`; clearing it returns to the relative ranges.
 */
export function MonthPicker({
  value,
  max,
  basePath,
}: {
  value: string;
  max: string;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-xl border bg-surface px-2.5 py-1.5 text-xs font-medium transition ${
        value ? "border-brand text-brand-deep" : "border-line text-muted"
      }`}
    >
      <CalendarDays className="h-3.5 w-3.5" />
      <input
        type="month"
        value={value}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `${basePath}?month=${v}` : basePath);
        }}
        className="bg-transparent text-text outline-none"
        aria-label="Pick a month"
      />
    </label>
  );
}
