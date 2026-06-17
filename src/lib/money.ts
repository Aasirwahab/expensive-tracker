// All money in ShopLedger is whole Sri Lankan Rupees stored as integers.
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Format whole rupees for display, e.g. 4500 -> "Rs 4,500". */
export function formatRs(amount: number): string {
  return `Rs ${nf.format(Math.round(amount))}`;
}

/** Format a plain integer with thousands separators. */
export function formatNumber(n: number): string {
  return nf.format(Math.round(n));
}

/** Format a period-over-period delta, e.g. 12.4 -> "+12.4%". */
export function formatDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Format an optional selling-price guide range for display:
 *   (5000, 7000) -> "Rs 5,000–7,000"
 *   (5000, 5000) -> "Rs 5,000"
 *   (5000, null) -> "Rs 5,000+"
 *   (null, 7000) -> "up to Rs 7,000"
 *   (null, null) -> null  (nothing to show)
 */
export function formatPriceRange(
  min: number | null,
  max: number | null,
): string | null {
  if (min != null && max != null) {
    return min === max ? formatRs(min) : `${formatRs(min)}–${formatNumber(max)}`;
  }
  if (min != null) return `${formatRs(min)}+`;
  if (max != null) return `up to ${formatRs(max)}`;
  return null;
}
