export type RangeKey = "today" | "7d" | "month" | "all";

export type ResolvedRange = {
  key: RangeKey;
  label: string;
  from: Date | null; // null = no lower bound (all time)
  to: Date;
};

/** Resolve a range key from the URL into concrete date boundaries. */
export function resolveRange(key?: string): ResolvedRange {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  switch (key) {
    case "today":
      return { key: "today", label: "Today", from: startOfToday, to: endOfToday };
    case "month":
      return {
        key: "month",
        label: "This month",
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfToday,
      };
    case "all":
      return { key: "all", label: "All time", from: null, to: endOfToday };
    case "7d":
    default:
      return {
        key: "7d",
        label: "Last 7 days",
        from: new Date(startOfToday.getTime() - 6 * 86_400_000),
        to: endOfToday,
      };
  }
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "month", label: "This month" },
  { key: "all", label: "All" },
];

/** Resolve a specific calendar month ("YYYY-MM") into its boundaries, or null. */
export function resolveMonth(month?: string | null): ResolvedRange | null {
  if (!month) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]) - 1;
  if (mon < 0 || mon > 11) return null;
  const from = new Date(year, mon, 1);
  const to = new Date(year, mon + 1, 0, 23, 59, 59, 999);
  return {
    key: "month",
    label: from.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    from,
    to,
  };
}

/**
 * Resolve a report period from URL params. A specific `month` ("YYYY-MM") wins
 * over a relative `range`. Returns the resolved range plus the active month
 * string (null when a relative range is in effect).
 */
export function resolvePeriod(
  rangeParam?: string | null,
  monthParam?: string | null,
): { range: ResolvedRange; month: string | null } {
  const monthPeriod = resolveMonth(monthParam);
  if (monthPeriod) return { range: monthPeriod, month: monthParam! };
  return { range: resolveRange(rangeParam ?? undefined), month: null };
}

/** The current month as "YYYY-MM" (server-local) — useful as a picker max. */
export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
