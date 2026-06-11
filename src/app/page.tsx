import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="ledger-bg flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-lg font-extrabold tracking-tight">
          Shop<span className="text-brand">Ledger</span>
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg px-3 py-2 font-medium text-text hover:bg-black/5">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft">
                Get started
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft"
            >
              Open dashboard
            </Link>
            <UserButton />
          </Show>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          The digital notebook for local shops
        </span>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Know what you sold,
          <br />
          spent &amp; <span className="text-brand">earned</span> today.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
          Record a sale in seconds, track stock and expenses, and see real
          profit — all in Rupees, without a single calculation.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-deep">
                Start free
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-deep"
            >
              Go to dashboard
            </Link>
          </Show>
        </div>
      </main>
    </div>
  );
}
