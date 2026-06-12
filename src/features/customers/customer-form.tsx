"use client";

import { useActionState, useEffect } from "react";
import {
  createCustomer,
  updateCustomer,
  type CustomerFormState,
} from "./actions";

const initialState: CustomerFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export type EditableCustomer = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
};

export function CustomerForm({
  customer,
  onClose,
}: {
  customer?: EditableCustomer;
  onClose: () => void;
}) {
  const isEdit = !!customer;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateCustomer : createCustomer,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="customerId" value={customer!.id} />}
      <div>
        <label className={labelClass} htmlFor="name">
          Customer name
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          defaultValue={customer?.name ?? ""}
          placeholder="e.g. Ahmed Khan"
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="phone">
          Phone <span className="text-muted/60">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={customer?.phone ?? ""}
          placeholder="07X XXX XXXX"
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="note">
          Note <span className="text-muted/60">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          defaultValue={customer?.note ?? ""}
          placeholder="e.g. regular, pays weekly"
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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
        </button>
      </div>
    </form>
  );
}
