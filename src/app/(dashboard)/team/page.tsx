import { Users } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/panel";
import { InviteForm } from "@/features/team/invite-form";
import { RevokeButton, RemoveButton } from "@/features/team/member-actions";

export default async function TeamPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">Team</h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can manage the team.
          </p>
        </div>
      </div>
    );
  }

  const businessId = ctx.business.id;
  const [members, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { businessId, status: "ACTIVE" },
      include: { user: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { businessId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-bold tracking-tight">Team</p>
        <p className="text-sm text-muted">
          {members.length} member{members.length === 1 ? "" : "s"}
          {invites.length > 0 && ` · ${invites.length} pending`}
        </p>
      </div>

      <Panel
        title="Invite a staff member"
        subtitle="They can record sales and view products — but never see cost or profit"
      >
        <InviteForm />
      </Panel>

      <Panel title="Members">
        <ul className="divide-y divide-line/60">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-xs font-bold text-ink">
                {(m.user.displayName || m.user.email).slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.user.displayName}
                </p>
                <p className="truncate text-xs text-muted">{m.user.email}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.role === "OWNER"
                    ? "bg-brand-soft text-brand-deep"
                    : "bg-ink/5 text-text"
                }`}
              >
                {m.role === "OWNER" ? "Owner" : "Staff"}
              </span>
              {m.role !== "OWNER" && <RemoveButton id={m.id} />}
            </li>
          ))}
        </ul>
      </Panel>

      {invites.length > 0 && (
        <Panel title="Pending invites">
          <ul className="divide-y divide-line/60">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warn/10 text-warn">
                  <Users className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted">
                    Waiting to join — they sign up with this email
                  </p>
                </div>
                <RevokeButton id={inv.id} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="px-1 text-xs text-muted">
        Tip: tell your staff to sign up at this site using the exact email you
        invited — they&apos;ll be added to your shop automatically, with the
        staff view (no profit or cost).
      </p>
    </div>
  );
}
