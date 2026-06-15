"use client";

import { useEffect } from "react";

/**
 * Registers the service worker — production only. In dev (`pnpm dev`) a service
 * worker would cache build chunks and serve stale code after edits, so we skip
 * it. Test the installable/offline behaviour with `pnpm build && pnpm start`.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal — the app still works online.
    });
  }, []);

  return null;
}
