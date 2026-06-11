"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { navItems } from "@/lib/nav";

const ranges = ["Today", "This week", "This month"] as const;

export function Topbar() {
  const pathname = usePathname();
  const [range, setRange] = useState<(typeof ranges)[number]>("This week");

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
        <div className="hidden items-center rounded-xl border border-line bg-surface p-0.5 sm:flex">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                range === r ? "bg-ink text-white" : "text-muted hover:text-text"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

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
