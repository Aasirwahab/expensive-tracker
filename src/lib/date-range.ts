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
