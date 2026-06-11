"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { X } from "lucide-react";
import {
  addExpenseCategory,
  removeExpenseCategory,
  type FormState,
} from "./actions";

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(
    addExpenseCategory,
    { error: null } as FormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="name"
        required
        placeholder="New category (e.g. Cleaning)"
        className="min-w-[200px] flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none transition focus:border-brand focus:bg-surface"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-soft disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <span className="text-sm text-loss">{state.error}</span>}
    </form>
  );
}

export function RemoveCategoryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeExpenseCategory(id);
        })
      }
      aria-label="Remove category"
      className="text-muted transition hover:text-loss disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
