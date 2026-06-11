"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

export type FormState = { error: string | null; ok?: boolean };

async function requireOwner() {
  const ctx = await getActiveContext();
  if (!ctx?.business)
    return { ok: false as const, error: "No active business." };
  if (ctx.role !== "OWNER")
    return { ok: false as const, error: "Only the owner can change settings." };
  return { ok: true as const, business: ctx.business, user: ctx.user };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(60),
  businessType: z.string().trim().min(1, "Choose a business type").max(40),
});

export async function updateBusinessProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await prisma.business.update({
    where: { id: auth.business.id },
    data: { name: parsed.data.name, businessType: parsed.data.businessType },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard"); // sidebar shows the business name
  return { error: null, ok: true };
}

const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(40),
});

export async function addExpenseCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const exists = await prisma.expenseCategory.findFirst({
    where: {
      businessId: auth.business.id,
      isActive: true,
      name: { equals: parsed.data.name, mode: "insensitive" },
    },
  });
  if (exists) return { error: "That category already exists." };

  await prisma.expenseCategory.create({
    data: { businessId: auth.business.id, name: parsed.data.name, isActive: true },
  });

  revalidatePath("/settings");
  revalidatePath("/expenses");
  return { error: null, ok: true };
}

export async function removeExpenseCategory(
  categoryId: string,
): Promise<{ error: string | null }> {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };

  // Soft-remove so existing expenses keep their category label.
  await prisma.expenseCategory.updateMany({
    where: { id: categoryId, businessId: auth.business.id },
    data: { isActive: false },
  });

  revalidatePath("/settings");
  revalidatePath("/expenses");
  return { error: null };
}
