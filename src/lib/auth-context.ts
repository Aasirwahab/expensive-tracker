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

  let membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });

  // Staff onboarding: if this user has no business but was invited by email,
  // accept the invitation and join as the invited role.
  if (!membership && user.email) {
    const invite = await prisma.invitation.findFirst({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
    });
    if (invite) {
      await prisma.$transaction(async (tx) => {
        await tx.membership.upsert({
          where: {
            businessId_userId: { businessId: invite.businessId, userId: user.id },
          },
          create: {
            businessId: invite.businessId,
            userId: user.id,
            role: invite.role,
            status: "ACTIVE",
            joinedAt: new Date(),
            invitedByUserId: invite.invitedByUserId,
          },
          update: { status: "ACTIVE", role: invite.role, joinedAt: new Date() },
        });
        await tx.invitation.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
      });
      membership = await prisma.membership.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        include: { business: true },
        orderBy: { createdAt: "asc" },
      });
    }
  }

  return {
    user,
    membership,
    business: membership?.business ?? null,
    role: membership?.role ?? null,
  };
}
