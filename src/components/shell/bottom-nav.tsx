"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { navItems, type NavItem } from "@/lib/nav";
import { useT } from "@/lib/i18n/client";
import { MobileNavDrawer } from "./mobile-nav";

// Primary bottom-bar destinations by role. Owners lead with the dashboard;
// staff (who can't see it) lead with Quick Sale. Hrefs are looked up in
// navItems so icons + translations stay in sync with the rest of the nav.
const OWNER_TABS = ["/dashboard", "/quick-sale", "/sales", "/products"];
const STAFF_TABS = ["/quick-sale", "/sales", "/products"];

/**
 * Mobile-only bottom tab bar (hidden at `lg` where the Sidebar takes over).
 * Puts the most-used screens one thumb-tap away, with a "More" tab that opens
 * the full-menu drawer for everything else.
 */
export function BottomNav({
  businessName,
  businessType,
  role,
  isSuperAdmin = false,
}: {
  businessName: string;
  businessType?: string | null;
  role?: string | null;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const hrefs = role === "OWNER" ? OWNER_TABS : STAFF_TABS;
  const tabs = hrefs
    .map((href) => navItems.find((n) => n.href === href))
    .filter((n): n is NavItem => Boolean(n));

  const matches = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const onPrimary = tabs.some((tab) => matches(tab.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {tabs.map((tab) => {
          const active = matches(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className="max-w-full truncate px-0.5">{t(tab.tKey)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("nav.more")}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
            open || !onPrimary ? "text-brand" : "text-muted"
          }`}
        >
          <MoreHorizontal className="h-[22px] w-[22px]" />
          <span>{t("nav.more")}</span>
        </button>
      </nav>

      <MobileNavDrawer
        open={open}
        onClose={close}
        businessName={businessName}
        businessType={businessType}
        role={role}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
}
