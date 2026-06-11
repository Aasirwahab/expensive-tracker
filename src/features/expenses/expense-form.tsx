"use client";

import { useActionState, useEffect, useRef } from "react";
import { createExpense, type ExpenseFormState } from "./actions";

const initialState: ExpenseFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export function ExpenseForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createExpense,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="expenseCategoryId">
            Category
          </label>
          <select
            id="expenseCategoryId"
            name="expenseCategoryId"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="amount">
            Amount (Rs)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="expenseDate">
            Date
          </label>
          <input
            id="expenseDate"
            name="expenseDate"
            type="date"
            required
            defaultValue={today}
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">
            Description
          </label>
          <input
            id="description"
            name="description"
            required
            placeholder="e.g. June shop rent"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="paymentMethod">
            Paid by <span className="text-muted/60">(optional)</span>
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue=""
            className={fieldClass}
          >
            <option value="">—</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass} htmlFor="payee">
            Payee <span className="text-muted/60">(optional)</span>
          </label>
          <input
            id="payee"
            name="payee"
            placeholder="Who you paid"
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
          {pending ? "Adding…" : "Add expense"}
        </button>
        {state.error && <span className="text-sm text-loss">{state.error}</span>}
        {state.ok && !state.error && (
          <span className="text-sm font-medium text-brand-deep">Added ✓</span>
        )}
      </div>
    </form>
  );
}
