import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { isSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/panel";
import { GrantForm } from "@/features/admin/grant-form";
import { AccessStatusButton } from "@/features/admin/access-row-actions";

export default async function AdminPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/sign-in");
  // Only the developer (SUPER_ADMIN_EMAILS) can see this page.
  if (!isSuperAdmin(ctx.user.email)) redirect("/dashboard");

  const grants = await prisma.accessGrant.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Which approved emails have actually signed up yet?
  const emails = grants.map((g) => g.email);
  const users = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails, mode: "insensitive" } },
        select: { email: true },
      })
    : [];
  const signedUp = new Set(users.map((u) => u.email.toLowerCase()));

  const activeCount = grants.filter((g) => g.status === "ACTIVE").length;

  return (
    <div className="ledger-bg min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold tracking-tight">
                Client access
              </p>
              <p className="text-sm text-muted">
                {activeCount} active client{activeCount === 1 ? "" : "s"} · only
                you can see this page
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-black/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <Panel
          title="Approve a client"
          subtitle="Add the email you sold to. They sign up with that exact email and become the owner of their own shop."
        >
          <GrantForm />
        </Panel>

        <Panel title="Clients">
          {grants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No clients yet. Approve an email above to give someone access.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {grants.map((g) => {
                const suspended = g.status === "SUSPENDED";
                return (
                  <li key={g.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.email}</p>
                      <p className="truncate text-xs text-muted">
                        {g.note ? `${g.note} · ` : ""}
                        {signedUp.has(g.email)
                          ? "Signed up"
                          : "Not signed up yet"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        suspended
                          ? "bg-loss/10 text-loss"
                          : "bg-brand-soft text-brand-deep"
                      }`}
                    >
                      {suspended ? "Suspended" : "Active"}
                    </span>
                    <AccessStatusButton email={g.email} status={g.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <p className="px-1 text-xs text-muted">
          Tip: anyone who isn&apos;t approved here (and isn&apos;t a super admin)
          is stopped at sign-up and can&apos;t create a shop. Suspending a client
          instantly locks out their whole shop, staff included.
        </p>
      </div>
    </div>
  );
}
