"use client";

import { useActionState, useEffect } from "react";
import { formatRs } from "@/lib/money";
import { recordCustomerCharge, type CustomerFormState } from "./actions";

const initialState: CustomerFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

const PRESETS = ["Repair", "Old balance", "Off-catalogue item", "Battery / service"];

export function ChargeForm({
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
    recordCustomerCharge,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="rounded-xl bg-paper px-3 py-2.5 text-sm">
        <span className="text-muted">{customerName}&apos;s current balance: </span>
        <span className="font-mono font-semibold tnum">
          {balance < 0 ? `${formatRs(-balance)} adv` : formatRs(Math.max(0, balance))}
        </span>
      </div>
      <div>
        <label className={labelClass} htmlFor="amount">
          Amount owed (Rs)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          autoFocus
          placeholder="0"
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="reason">
          What is it for?
        </label>
        <input
          id="reason"
          name="reason"
          required
          list="charge-reasons"
          placeholder="e.g. Repair, old balance"
          className={fieldClass}
        />
        <datalist id="charge-reasons">
          {PRESETS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
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
          {pending ? "Saving…" : "Add to tab"}
        </button>
      </div>
    </form>
  );
}
