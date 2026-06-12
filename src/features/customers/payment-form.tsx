"use client";

import { useActionState, useEffect } from "react";
import { formatRs } from "@/lib/money";
import { recordCustomerPayment, type CustomerFormState } from "./actions";

const initialState: CustomerFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export function PaymentForm({
  customerId,
  customerName,
  balance,
  onClose,
}: {
  customerId: string;
  customerName: string;
  balance: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    recordCustomerPayment,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="rounded-xl bg-paper px-3 py-2.5 text-sm">
        <span className="text-muted">{customerName} owes </span>
        <span className="font-mono font-semibold tnum text-loss">
          {formatRs(Math.max(0, balance))}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="amount">
            Amount received (Rs)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            autoFocus
            defaultValue={balance > 0 ? balance : ""}
            placeholder="0"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="method">
            Method
          </label>
          <select
            id="method"
            name="method"
            defaultValue="CASH"
            className={fieldClass}
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="note">
          Note <span className="text-muted/60">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          placeholder="e.g. part payment"
          className={fieldClass}
        />
      </div>

      {state.error && <p className="text-sm text-loss">{state.error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-text hover:bg-paper"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
