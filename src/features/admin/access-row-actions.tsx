"use client";

import { useState, useTransition } from "react";
import { setAccessStatus } from "./actions";

/** Suspend an active client (with a confirm step) or re-activate a suspended one. */
export function AccessStatusButton({
  email,
  status,
}: {
  email: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (status === "SUSPENDED") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setAccessStatus(email, "ACTIVE");
          })
        }
        className="text-xs font-medium text-brand-deep hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Re-activate"}
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-muted">Cut off?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setAccessStatus(email, "SUSPENDED");
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
      className="text-xs font-medium text-loss hover:underline"
    >
      Suspend
    </button>
  );
}
