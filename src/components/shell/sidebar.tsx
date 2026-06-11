"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, ChevronsUpDown } from "lucide-react";
import { navItems } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[256px] shrink-0 flex-col bg-ink lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
          <BookText className="h-[18px] w-[18px]" />
        </span>
        <span className="font-display text-lg font-extrabold tracking-tight text-white">
          ShopLedger
        </span>
      </div>

      <div className="px-3">
        <button className="flex w-full items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2.5 text-left transition hover:bg-white/10">
          <span className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand/20 text-xs font-bold text-brand">
              MW
            </span>
            <span className="text-sm font-medium text-white">My Watch Shop</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-white/40" />
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white/10 font-semibold text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${active ? "text-brand" : ""}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4">
        <div className="rounded-xl bg-white/[0.04] p-3 text-xs text-white/50">
          <p className="font-medium text-white/80">Pilot mode</p>
          <p className="mt-0.5">Sample data shown until your first sale.</p>
        </div>
      </div>
    </aside>
  );
}
