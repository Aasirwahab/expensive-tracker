import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth-context";
import { isSuperAdmin } from "@/lib/access";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

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
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
