import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth-context";
import { isSuperAdmin } from "@/lib/access";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { BottomNav } from "@/components/shell/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.business) redirect("/onboarding");
  // Suspended shop (client cut off by the developer) → lock out owner + staff.
  if (ctx.business.status !== "ACTIVE") redirect("/no-access");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        businessName={ctx.business.name}
        businessType={ctx.business.businessType}
        role={ctx.role}
        isSuperAdmin={isSuperAdmin(ctx.user.email)}
      />
      <div className="ledger-bg flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pt-5 pb-24 sm:px-6 sm:pt-6 lg:pb-6">
          {children}
        </main>
        <BottomNav
          businessName={ctx.business.name}
          businessType={ctx.business.businessType}
          role={ctx.role}
          isSuperAdmin={isSuperAdmin(ctx.user.email)}
        />
      </div>
    </div>
  );
}
