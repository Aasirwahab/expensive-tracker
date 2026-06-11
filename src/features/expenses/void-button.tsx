"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { voidExpense } from "./actions";

export function VoidButton({ expenseId }: { expenseId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="flex items-center justify-end gap-2 text-xs">
        <span className="text-muted">Void?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await voidExpense(expenseId);
            })
          }
          className="font-semibold text-loss disabled:opacity-50"
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-muted"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Void"
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-loss/10 hover:text-loss"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
