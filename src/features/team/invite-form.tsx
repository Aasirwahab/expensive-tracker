"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteStaff, type InviteState } from "./actions";

const initialState: InviteState = { error: null };

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    inviteStaff,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="min-w-[220px] flex-1">
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium text-muted"
        >
          Staff email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="employee@email.com"
          className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-surface"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? "Inviting…" : "Send invite"}
      </button>
      {state.error && <span className="text-sm text-loss">{state.error}</span>}
      {state.ok && !state.error && (
        <span className="text-sm font-medium text-brand-deep">Invited ✓</span>
      )}
    </form>
  );
}
