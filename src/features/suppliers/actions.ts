"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";
import { getSupplierLedger, type SupplierLedgerEntry } from "./queries";

export type SupplierFormState = { error: string | null; ok?: boolean };

const nameSchema = z.string().trim().min(1, "Supplier name is required").max(80);
const phoneSchema = z.string().trim().max(30).optional();
const noteSchema = z.string().trim().max(200).optional();

const createSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  note: noteSchema,
});

export async function createSupplier(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can add suppliers." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { name, phone, note } = parsed.data;
  await prisma.supplier.create({
    data: {
      businessId: ctx.business.id,
      name,
      phone: phone || null,
      note: note || null,
    },
  });

  revalidatePath("/suppliers");
  return { error: null, ok: true };
}

const updateSchema = createSchema.extend({
  supplierId: z.string().min(1),
});

export async function updateSupplier(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can edit suppliers." };

  const parsed = updateSchema.safeParse({
    supplierId: formData.get("supplierId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { supplierId, name, phone, note } = parsed.data;
  await prisma.supplier.updateMany({
    where: { id: supplierId, businessId: ctx.business.id },
    data: { name, phone: phone || null, note: note || null },
  });

  revalidatePath("/suppliers");
  return { error: null, ok: true };
}

export async function archiveSupplier(
  supplierId: string,
): Promise<{ error: string | null }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can remove suppliers." };

  await prisma.supplier.updateMany({
    where: { id: supplierId, businessId: ctx.business.id, archivedAt: null },
    data: { archivedAt: new Date(), isActive: false },
  });

  revalidatePath("/suppliers");
  return { error: null };
}

const billSchema = z.object({
  supplierId: z.string().min(1),
  amount: z.coerce.number().int().min(1, "Enter an amount").max(2_000_000_000),
  reason: z.string().trim().min(1, "Add a reason").max(80),
});

/** Record a bill the shop owes a supplier (a delivery, an old balance, etc.). */
export async function recordSupplierBill(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can add a bill." };

  const parsed = billSchema.safeParse({
    supplierId: formData.get("supplierId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { supplierId, amount, reason } = parsed.data;
  const businessId = ctx.business.id;

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
    select: { id: true },
  });
  if (!supplier) return { error: "Supplier not found." };

  await prisma.supplierBill.create({
    data: {
      businessId,
      supplierId,
      amount,
      reason,
      createdByUserId: ctx.user.id,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

const paymentSchema = z.object({
  supplierId: z.string().min(1),
  amount: z.coerce.number().int().min(1, "Enter an amount").max(2_000_000_000),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  note: noteSchema,
});

/** Record a payment the shop makes to a supplier against what it owes. */
export async function recordSupplierPayment(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can record payments." };

  const parsed = paymentSchema.safeParse({
    supplierId: formData.get("supplierId"),
    amount: formData.get("amount"),
    method: formData.get("method") || "CASH",
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { supplierId, amount, method, note } = parsed.data;
  const businessId = ctx.business.id;

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
    select: { id: true },
  });
  if (!supplier) return { error: "Supplier not found." };

  await prisma.supplierPayment.create({
    data: {
      businessId,
      supplierId,
      amount,
      method,
      note: note || null,
      createdByUserId: ctx.user.id,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

/** Load a supplier's bill/payment history on demand (owner-only). */
export async function loadSupplierHistory(
  supplierId: string,
): Promise<
  { ok: true; entries: SupplierLedgerEntry[] } | { ok: false; error: string }
> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { ok: false, error: "No active business." };
  if (ctx.role !== "OWNER") return { ok: false, error: "Not allowed." };

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId: ctx.business.id },
    select: { id: true },
  });
  if (!supplier) return { ok: false, error: "Supplier not found." };

  const entries = await getSupplierLedger(ctx.business.id, supplierId);
  return { ok: true, entries };
}
