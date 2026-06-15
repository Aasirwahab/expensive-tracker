"use client";

import { useState } from "react";
import { formatRs } from "@/lib/money";

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-right font-mono text-sm tnum outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

/**
 * Drawer count helper. The owner enters the cash they started the day with
 * (float) and what they physically counted now; we show what the drawer
 * *should* hold and whether it's over or short. Nothing is saved — it's a
 * check, so a wrong count never corrupts the books.
 */
export function CashCount({ expectedNet }: { expectedNet: number }) {
  const [openingFloat, setOpeningFloat] = useState("");
  const [counted, setCounted] = useState("");

  const opening = Math.max(0, Math.floor(Number(openingFloat) || 0));
  const expected = opening + expectedNet;
  const hasCount = counted.trim() !== "";
  const count = Math.floor(Number(counted) || 0);
  const diff = count - expected;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="opening">
            Opening cash (float)
          </label>
          <input
            id="opening"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="counted">
            Counted cash now
          </label>
          <input
            id="counted"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder="0"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1.5 rounded-xl border border-line bg-paper/60 p-3 text-sm">
        <div className="flex items-center justify-between text-muted">
          <span>Cash change today</span>
          <span className="font-mono tnum">
            {expectedNet < 0 ? `−${formatRs(-expectedNet)}` : formatRs(expectedNet)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Drawer should hold</span>
          <span className="font-mono font-semibold tnum">{formatRs(expected)}</span>
        </div>
        {hasCount && (
          <div className="flex items-center justify-between border-t border-line pt-1.5">
            <span className="font-medium">
              {diff === 0 ? "Balanced ✓" : diff > 0 ? "Over by" : "Short by"}
            </span>
            <span
              className={`font-mono font-semibold tnum ${
                diff === 0
                  ? "text-brand-deep"
                  : diff > 0
                    ? "text-brand-deep"
                    : "text-loss"
              }`}
            >
              {diff === 0 ? formatRs(0) : formatRs(Math.abs(diff))}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted">
        This is just a check — nothing is saved, so a mistyped count never
        affects your records.
      </p>
    </div>
  );
}
