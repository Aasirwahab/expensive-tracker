"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { navItems } from "@/lib/nav";

export function Topbar() {
  const pathname = usePathname();
  const title =
    navItems.find(
      (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
    )?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-paper/85 px-4 py-3 backdrop-blur sm:px-6">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-muted">Here&apos;s how your shop is doing.</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/quick-sale"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New sale</span>
        </Link>
        <UserButton />
      </div>
    </header>
  );
}
