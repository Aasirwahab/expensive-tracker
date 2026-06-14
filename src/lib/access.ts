import { prisma } from "@/lib/db";

/**
 * App access gate (developer-controlled).
 *
 * Two ways an email is allowed to USE the app at all:
 *  1. It's a super admin (the developer) — listed in SUPER_ADMIN_EMAILS.
 *  2. The developer granted it ACTIVE access (an AccessGrant row).
 *
 * Everyone else is blocked at onboarding, so random people who sign up via
 * Clerk can't create a shop. Always enforced server-side.
 */

/** Comma-separated developer emails from the environment, lowercased. */
function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True if this email belongs to the app developer (SUPER_ADMIN_EMAILS). */
export function isSuperAdmin(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  return e !== "" && superAdminEmails().includes(e);
}

/**
 * True if this email may use the app — a super admin, or an email the developer
 * has granted ACTIVE access to.
 */
export async function hasAccess(email: string | null | undefined): Promise<boolean> {
  const e = normalizeEmail(email);
  if (e === "") return false;
  if (isSuperAdmin(e)) return true;

  const grant = await prisma.accessGrant.findUnique({ where: { email: e } });
  return grant?.status === "ACTIVE";
}
