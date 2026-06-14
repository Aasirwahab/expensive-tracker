import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { hasAccess } from "@/lib/access";
import { OnboardingForm } from "@/features/businesses/onboarding-form";

export default async function OnboardingPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/sign-in");
  if (ctx.business) redirect("/dashboard");

  // Developer gate: only approved emails (or super admins) may create a shop.
  if (!(await hasAccess(ctx.user.email))) redirect("/no-access");

  return (
    <div className="ledger-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
            <BookText className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            ShopLedger
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(12,20,17,0.04)] sm:p-7">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Set up your shop
          </h1>
          <p className="mt-1 text-sm text-muted">
            One quick step, {ctx.user.displayName}. Then you can start recording
            sales.
          </p>
          <div className="mt-6">
            <OnboardingForm />
          </div>
        </div>
      </div>
    </div>
  );
}
