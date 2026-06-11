import { Receipt, Wallet, Boxes } from "lucide-react";
import { recentActivity, type Activity } from "@/features/dashboard/placeholder";
import { formatRs } from "@/lib/money";

const iconFor: Record<Activity["kind"], typeof Receipt> = {
  sale: Receipt,
  expense: Wallet,
  stock: Boxes,
};

const tintFor: Record<Activity["kind"], string> = {
  sale: "bg-brand-soft text-brand-deep",
  expense: "bg-loss/10 text-loss",
  stock: "bg-ink/5 text-ink",
};

export function RecentActivity() {
  return (
    <ul className="grid gap-0.5 sm:grid-cols-2">
      {recentActivity.map((a, i) => {
        const Icon = iconFor[a.kind];
        return (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-paper"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tintFor[a.kind]}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="truncate text-xs text-muted">{a.detail}</p>
            </div>
            <div className="text-right">
              {a.amount > 0 && (
                <p
                  className={`font-mono text-sm font-semibold tnum ${
                    a.positive ? "text-brand-deep" : "text-loss"
                  }`}
                >
                  {a.positive ? "+" : "−"}
                  {formatRs(a.amount)}
                </p>
              )}
              <p className="text-[11px] text-muted">{a.time}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
