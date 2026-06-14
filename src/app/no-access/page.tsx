import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function NoAccessPage() {
  return (
    <div className="ledger-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-[0_1px_2px_rgba(12,20,17,0.04)] sm:p-7">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Account not activated yet
          </h1>
          <p className="mt-2 text-sm text-muted">
            This app is invite-only. Your sign-in worked, but your account
            hasn&apos;t been activated. Please contact the provider to get access.
          </p>
          <div className="mt-6">
            <SignOutButton>
              <button className="rounded-xl bg-ink px-5 py-2.5 font-medium text-white hover:bg-ink-soft">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
