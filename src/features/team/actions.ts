"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

export type InviteState = { error: string | null; ok?: boolean };

const schema = z.object({
  email: z.string().trim().min(3, "Enter an email").max(120),
});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function inviteStaff(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can invite staff." };
  }

  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }
  const email = parsed.data.email.toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const businessId = ctx.business.id;

  // Already on the team?
  const member = await prisma.membership.findFirst({
    where: {
      businessId,
      status: "ACTIVE",
      user: { email: { equals: email, mode: "insensitive" } },
    },
  });
  if (member) return { error: "That person is already on your team." };

  await prisma.invitation.upsert({
    where: { businessId_email: { businessId, email } },
    create: {
      businessId,
      email,
      role: "STAFF",
      invitedByUserId: ctx.user.id,
      status: "PENDING",
    },
    update: {
      status: "PENDING",
      role: "STAFF",
      invitedByUserId: ctx.user.id,
      acceptedAt: null,
    },
  });

  revalidatePath("/team");
  return { error: null, ok: true };
}

export async function revokeInvitation(
  invitationId: string,
): Promise<{ error: string | null }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can do that." };

  await prisma.invitation.updateMany({
    where: { id: invitationId, businessId: ctx.business.id, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  revalidatePath("/team");
  return { error: null };
}

export async function removeMember(
  membershipId: string,
): Promise<{ error: string | null }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can do that." };

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, businessId: ctx.business.id },
  });
  if (!membership) return { error: "Member not found." };
  if (membership.role === "OWNER") return { error: "You can't remove an owner." };

  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: "DISABLED" },
  });
  revalidatePath("/team");
  return { error: null };
}
