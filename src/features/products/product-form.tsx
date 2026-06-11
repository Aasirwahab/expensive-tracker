"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProduct, type ProductFormState } from "./actions";

const initialState: ProductFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProduct,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelClass} htmlFor="name">
            Product name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Blue cotton shirt"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="sku">
            SKU / code <span className="text-muted/60">(optional)</span>
          </label>
          <input
            id="sku"
            name="sku"
            placeholder="e.g. SHIRT-01"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="currentCost">
            Purchase cost (Rs)
          </label>
          <input
            id="currentCost"
            name="currentCost"
            type="number"
            min="0"
            step="1"
            required
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="defaultPrice">
            Selling price (Rs)
          </label>
          <input
            id="defaultPrice"
            name="defaultPrice"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="openingStock">
            Opening stock
          </label>
          <input
            id="openingStock"
            name="openingStock"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="lowStockThreshold">
            Low-stock alert <span className="text-muted/60">(optional)</span>
          </label>
          <input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 5"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add product"}
        </button>
        {state.error && <span className="text-sm text-loss">{state.error}</span>}
        {state.ok && !state.error && (
          <span className="text-sm font-medium text-brand-deep">Added ✓</span>
        )}
      </div>
    </form>
  );
}
