"use client";

import { useActionState, useEffect } from "react";
import { formatRs } from "@/lib/money";
import {
  createSupplier,
  updateSupplier,
  recordSupplierBill,
  recordSupplierPayment,
  type SupplierFormState,
} from "./actions";

const initialState: SupplierFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export type EditableSupplier = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
};

export function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: EditableSupplier;
  onClose: () => void;
}) {
  const isEdit = !!supplier;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateSupplier : createSupplier,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="supplierId" value={supplier!.id} />}
      <div>
        <label className={labelClass} htmlFor="name">
          Supplier name
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          defaultValue={supplier?.name ?? ""}
          placeholder="e.g. ABC Distributors"
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
          defaultValue={supplier?.phone ?? ""}
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
          defaultValue={supplier?.note ?? ""}
          placeholder="e.g. supplies watch straps, pays on delivery"
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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add supplier"}
        </button>
      </div>
    </form>
  );
}

const BILL_PRESETS = ["Stock delivery", "Old balance", "Restock", "Service"];

export function BillForm({
  supplierId,
  supplierName,
  balance,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  balance: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    recordSupplierBill,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="supplierId" value={supplierId} />
      <div className="rounded-xl bg-paper px-3 py-2.5 text-sm">
        <span className="text-muted">You owe {supplierName} </span>
        <span className="font-mono font-semibold tnum text-loss">
          {formatRs(Math.max(0, balance))}
        </span>
      </div>
      <div>
        <label className={labelClass} htmlFor="amount">
          Bill amount (Rs)
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
          list="bill-reasons"
          placeholder="e.g. Stock delivery"
          className={fieldClass}
        />
        <datalist id="bill-reasons">
          {BILL_PRESETS.map((r) => (
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
          {pending ? "Saving…" : "Add bill"}
        </button>
      </div>
    </form>
  );
}

export function SupplierPaymentForm({
  supplierId,
  supplierName,
  balance,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  balance: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    recordSupplierPayment,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="supplierId" value={supplierId} />
      <div className="rounded-xl bg-paper px-3 py-2.5 text-sm">
        <span className="text-muted">You owe {supplierName} </span>
        <span className="font-mono font-semibold tnum text-loss">
          {formatRs(Math.max(0, balance))}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="amount">
            Amount paid (Rs)
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
