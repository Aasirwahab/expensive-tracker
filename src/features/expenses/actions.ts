"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

export type ExpenseFormState = { error: string | null; ok?: boolean };

const schema = z.object({
  expenseCategoryId: z.string().min(1, "Choose a category"),
  amount: z.coerce.number().int().min(1, "Enter an amount").max(2_000_000_000),
  description: z.string().trim().min(1, "Add a short description").max(120),
  payee: z.string().trim().max(80).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]).optional(),
  expenseDate: z.string().min(1, "Pick a date"),
});

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  // Expenses are owner-only in the trimmed core.
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can record expenses." };
  }

  const parsed = schema.safeParse({
    expenseCategoryId: formData.get("expenseCategoryId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    payee: formData.get("payee") || undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    expenseDate: formData.get("expenseDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { expenseCategoryId, amount, description, payee, paymentMethod, expenseDate } =
    parsed.data;
  const businessId = ctx.business.id;

  // Category must belong to this business.
  const category = await prisma.expenseCategory.findFirst({
    where: { id: expenseCategoryId, businessId },
  });
  if (!category) return { error: "Category not found." };

  await prisma.expense.create({
    data: {
      businessId,
      expenseCategoryId,
      amount,
      description,
      payee: payee ? payee : null,
      paymentMethod: paymentMethod ?? null,
      expenseDate: new Date(`${expenseDate}T00:00:00`),
      createdByUserId: ctx.user.id,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function voidExpense(
  expenseId: string,
): Promise<{ error: string | null }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can void expenses." };
  }

  await prisma.expense.updateMany({
    where: { id: expenseId, businessId: ctx.business.id, status: "ACTIVE" },
    data: { status: "VOIDED" },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { error: null };
}
