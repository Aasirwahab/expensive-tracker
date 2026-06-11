import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">ShopLedger</h1>
      <p className="max-w-md text-black/60">
        The digital notebook for your shop — record sales, expenses, stock, and
        profit in seconds.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
