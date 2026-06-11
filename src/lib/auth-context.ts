import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Ensure a local `User` row exists for the signed-in Clerk user, keeping
 * cached profile fields in sync. Returns null if not signed in.
 */
export async function syncUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? "";
  const displayName =
    cu?.firstName || cu?.username || (email ? email.split("@")[0] : "") || "Owner";
  const imageUrl = cu?.imageUrl ?? null;

  return prisma.user.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId, email, displayName, imageUrl },
    update: { email, displayName, imageUrl },
  });
}

/**
 * The signed-in user's active membership + business (single business for now).
 * `business` is null when the user hasn't created one yet.
 */
export async function getActiveContext() {
  const user = await syncUser();
  if (!user) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    user,
    membership,
    business: membership?.business ?? null,
    role: membership?.role ?? null,
  };
}
