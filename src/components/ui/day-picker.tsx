"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

/**
 * Pick a single day to view. Navigates to `${basePath}?date=YYYY-MM-DD`.
 */
export function DayPicker({
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
    <label className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition">
      <CalendarDays className="h-3.5 w-3.5 text-muted" />
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `${basePath}?date=${v}` : basePath);
        }}
        className="bg-transparent text-text outline-none"
        aria-label="Pick a day"
      />
    </label>
  );
}
