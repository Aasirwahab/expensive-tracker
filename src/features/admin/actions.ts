"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";
import { isSuperAdmin, normalizeEmail } from "@/lib/access";

export type GrantState = { error: string | null; ok?: boolean };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const schema = z.object({
  email: z.string().trim().min(3, "Enter an email").max(120),
  note: z.string().trim().max(200).optional(),
});

/** Only the developer (SUPER_ADMIN_EMAILS) may manage client access. */
async function requireSuperAdmin() {
  const ctx = await getActiveContext();
  if (!ctx || !isSuperAdmin(ctx.user.email)) return null;
  return ctx;
}

/** Approve an email so that person can sign up and create a shop. */
export async function grantAccess(
  _prev: GrantState,
  formData: FormData,
): Promise<GrantState> {
  if (!(await requireSuperAdmin())) return { error: "Not allowed." };

  const parsed = schema.safeParse({
    email: formData.get("email"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = normalizeEmail(parsed.data.email);
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const note = parsed.data.note?.trim() || null;

  await prisma.accessGrant.upsert({
    where: { email },
    create: { email, note, status: "ACTIVE" },
    update: { status: "ACTIVE", note },
  });

  // Reactivating? Bring their shop back online too.
  await syncOwnedBusinessStatus(email, "ACTIVE");

  revalidatePath("/admin");
  return { error: null, ok: true };
}

/** Suspend (cut off) or re-activate a client. */
export async function setAccessStatus(
  email: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<{ error: string | null }> {
  if (!(await requireSuperAdmin())) return { error: "Not allowed." };

  const e = normalizeEmail(email);
  await prisma.accessGrant.updateMany({ where: { email: e }, data: { status } });

  // Suspending also takes their shop offline (cuts off the owner AND their
  // staff); re-activating brings it back.
  await syncOwnedBusinessStatus(e, status);

  revalidatePath("/admin");
  return { error: null };
}

/**
 * Keep any shop this email OWNS in step with their access status, so suspending
 * a client immediately locks out their whole shop (owner + staff). No-op if the
 * client hasn't signed up or made a shop yet.
 */
async function syncOwnedBusinessStatus(
  email: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return;

  await prisma.business.updateMany({
    where: { createdByUserId: user.id },
    data: { status },
  });
}
