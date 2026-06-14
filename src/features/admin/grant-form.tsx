"use client";

import { useActionState, useEffect, useRef } from "react";
import { grantAccess, type GrantState } from "./actions";

const initialState: GrantState = { error: null };

export function GrantForm() {
  const [state, formAction, pending] = useActionState(grantAccess, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Client email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="client@email.com"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="note"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Note (optional)
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="e.g. Sold to Yousuf Trader"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Approving…" : "Approve client"}
        </button>
      </div>
      {state.error && <p className="text-sm text-loss">{state.error}</p>}
      {state.ok && !state.error && (
        <p className="text-sm font-medium text-brand-deep">Access granted ✓</p>
      )}
    </form>
  );
}
