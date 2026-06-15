"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { formatNumber } from "@/lib/money";
import { thumbUrl } from "@/lib/image";
import {
  RestockModal,
  type ProductRow,
  type SupplierOption,
} from "./products-table";

// Actionable low-stock list: items at or below their alert level, sorted most
// urgent first, each with one-tap restock (reuses the products RestockModal).
export function ReorderPanel({
  products,
  suppliers = [],
}: {
  products: ProductRow[];
  suppliers?: SupplierOption[];
}) {
  const [restocking, setRestocking] = useState<ProductRow | null>(null);

  const low = products
    .filter(
      (p) =>
        p.lowStockThreshold != null && p.stockQuantity <= p.lowStockThreshold,
    )
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  if (low.length === 0) return null;

  return (
    <>
      <ul className="divide-y divide-line/60">
        {low.map((p) => {
          const out = p.stockQuantity <= 0;
          return (
            <li key={p.id} className="flex items-center gap-3 py-3">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl(p.imageUrl, 96)}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/5 font-display text-xs font-bold text-ink">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs">
                  <span className="font-medium text-loss">
                    {out ? "Out of stock" : `${formatNumber(p.stockQuantity)} left`}
                  </span>
                  {p.lowStockThreshold != null && (
                    <span className="text-muted">
                      {" "}
                      · alert at {formatNumber(p.lowStockThreshold)}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestocking(p)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
              >
                <PackagePlus className="h-4 w-4" />
                Add stock
              </button>
            </li>
          );
        })}
      </ul>

      {restocking && (
        <RestockModal
          product={restocking}
          suppliers={suppliers}
          onClose={() => setRestocking(null)}
        />
      )}
    </>
  );
}
