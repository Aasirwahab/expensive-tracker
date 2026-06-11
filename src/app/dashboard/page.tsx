import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();
  const name =
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    "there";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-black/60">
        Welcome, {name}. Your shop data will appear here.
      </p>
    </div>
  );
}
