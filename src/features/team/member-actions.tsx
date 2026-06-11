"use client";

import { useState, useTransition } from "react";
import { revokeInvitation, removeMember } from "./actions";

export function RevokeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await revokeInvitation(id);
        })
      }
      className="text-xs font-medium text-loss hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Revoke"}
    </button>
  );
}

export function RemoveButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-muted">Remove?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await removeMember(id);
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
      Remove
    </button>
  );
}
