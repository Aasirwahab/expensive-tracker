"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, X } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useT } from "@/lib/i18n/client";

/**
 * The full-menu slide-out drawer for mobile. Controlled by a parent (the
 * BottomNav "More" tab) which passes a stable `onClose`. Rendered via a portal
 * into <body> because the Topbar uses `backdrop-blur` (backdrop-filter), which
 * would otherwise become the containing block for `position: fixed` and clip
 * the drawer to the topbar.
 *
 * No SSR guard is needed: it only renders when `open` is true, which can only
 * happen after a client-side tap (well after hydration), so `document` exists.
 */
export function MobileNavDrawer({
  open,
  onClose,
  businessName,
  businessType,
  role,
  isSuperAdmin = false,
}: {
  open: boolean;
  onClose: () => void;
  businessName: string;
  businessType?: string | null;
  role?: string | null;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useT();

  const items = navItems.filter(
    (item) =>
      (!item.ownerOnly || role === "OWNER") &&
      (!item.superAdminOnly || isSuperAdmin),
  );

  // Close whenever the route changes (onClose is stable from the parent).
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock background scroll + allow Escape to close while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="absolute inset-y-0 left-0 flex w-[270px] max-w-[84%] flex-col bg-ink shadow-2xl">
        <div className="flex items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <BookText className="h-[18px] w-[18px]" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              ShopLedger
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-1">
          <span className="block truncate text-sm font-medium text-white">
            {businessName}
          </span>
          {businessType ? (
            <span className="block truncate text-[11px] text-white/40">
              {businessType}
            </span>
          ) : null}
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition ${
                  active
                    ? "bg-white/10 font-semibold text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] ${active ? "text-brand" : ""}`}
                />
                {t(item.tKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
