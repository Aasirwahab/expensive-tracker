"use client";

import { useActionState } from "react";
import { updateBusinessProfile, type FormState } from "./actions";

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

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export function BusinessProfileForm({
  name,
  businessType,
}: {
  name: string;
  businessType: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessProfile,
    { error: null } as FormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Business name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={name}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="businessType">
            Business type
          </label>
          <select
            id="businessType"
            name="businessType"
            required
            defaultValue={businessType || ""}
            className={fieldClass}
          >
            {!businessType && (
              <option value="" disabled>
                Choose…
              </option>
            )}
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            {businessType && !BUSINESS_TYPES.includes(businessType) && (
              <option value={businessType}>{businessType}</option>
            )}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state.error && <span className="text-sm text-loss">{state.error}</span>}
        {state.ok && !state.error && (
          <span className="text-sm font-medium text-brand-deep">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
