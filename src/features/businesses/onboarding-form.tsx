"use client";

import { useActionState } from "react";
import { createBusiness, type CreateBusinessState } from "./actions";

const BUSINESS_TYPES = [
  "Clothing",
  "Cosmetics & beauty",
  "Hardware",
  "Electronics",
  "Mobile & accessories",
  "Grocery",
  "Pharmacy",
  "Gift shop",
  "Watch shop",
  "Other",
];

const initialState: CreateBusinessState = { error: null };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createBusiness,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Business name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Laksiri Stores"
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="businessType" className="text-sm font-medium">
          What kind of business is it?
        </label>
        <select
          id="businessType"
          name="businessType"
          required
          defaultValue=""
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface"
        >
          <option value="" disabled>
            Choose a type…
          </option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          ShopLedger works for any shop — this just helps us tailor things later.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? "Creating your shop…" : "Create my shop"}
      </button>

      <p className="text-center text-xs text-muted">
        Currency is set to Rupees (Rs). You can add staff and change settings
        later.
      </p>
    </form>
  );
}
