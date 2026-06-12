"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";
import { getCustomerLedger, type LedgerEntry } from "./queries";

export type CustomerFormState = { error: string | null; ok?: boolean };

const nameSchema = z.string().trim().min(1, "Customer name is required").max(80);
const phoneSchema = z.string().trim().max(30).optional();
const noteSchema = z.string().trim().max(200).optional();

const createSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  note: noteSchema,
});

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can add customers." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { name, phone, note } = parsed.data;
  await prisma.customer.create({
    data: {
      businessId: ctx.business.id,
      name,
      phone: phone || null,
      note: note || null,
    },
  });

  revalidatePath("/customers");
  return { error: null, ok: true };
}

const updateSchema = createSchema.extend({
  customerId: z.string().min(1),
});

export async function updateCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can edit customers." };

  const parsed = updateSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { customerId, name, phone, note } = parsed.data;
  await prisma.customer.updateMany({
    where: { id: customerId, businessId: ctx.business.id },
    data: { name, phone: phone || null, note: note || null },
  });

  revalidatePath("/customers");
  return { error: null, ok: true };
}

export async function archiveCustomer(
  customerId: string,
): Promise<{ error: string | null }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") return { error: "Only the owner can remove customers." };

  await prisma.customer.updateMany({
    where: { id: customerId, businessId: ctx.business.id, archivedAt: null },
    data: { archivedAt: new Date(), isActive: false },
  });

  revalidatePath("/customers");
  return { error: null };
}

const paymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().int().min(1, "Enter an amount").max(2_000_000_000),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  note: noteSchema,
});

/** Record a repayment a customer makes against their outstanding credit. */
export async function recordCustomerPayment(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can record payments." };
  }

  const parsed = paymentSchema.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    method: formData.get("method") || "CASH",
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { customerId, amount, method, note } = parsed.data;
  const businessId = ctx.business.id;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found." };

  await prisma.customerPayment.create({
    data: {
      businessId,
      customerId,
      amount,
      method,
      note: note || null,
      createdByUserId: ctx.user.id,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

/** Load a customer's credit/payment history on demand (owner-only). */
export async function loadCustomerHistory(
  customerId: string,
): Promise<{ ok: true; entries: LedgerEntry[] } | { ok: false; error: string }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { ok: false, error: "No active business." };
  if (ctx.role !== "OWNER") return { ok: false, error: "Not allowed." };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const entries = await getCustomerLedger(ctx.business.id, customerId);
  return { ok: true, entries };
}

const chargeSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().int().min(1, "Enter an amount").max(2_000_000_000),
  reason: z.string().trim().min(1, "Add a reason").max(80),
});

/**
 * Manually add a debt to a customer's tab — for things that aren't a catalogue
 * sale (repair charge, old balance carried over, off-catalogue item). This is
 * NOT an expense: it is money the customer owes the shop.
 */
export async function recordCustomerCharge(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can add to a tab." };
  }

  const parsed = chargeSchema.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { customerId, amount, reason } = parsed.data;
  const businessId = ctx.business.id;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found." };

  await prisma.customerCharge.create({
    data: {
      businessId,
      customerId,
      amount,
      reason,
      createdByUserId: ctx.user.id,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export type QuickCustomerResult =
  | { ok: true; customer: { id: string; name: string; phone: string | null } }
  | { ok: false; error: string };

const quickCreateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});

/**
 * Create a customer inline while ringing up a credit sale. Staff can do this
 * (it is part of making a sale), unlike the owner-only management actions.
 */
export async function quickCreateCustomer(
  input: unknown,
): Promise<QuickCustomerResult> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { ok: false, error: "No active business." };

  const parsed = quickCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer." };
  }

  const { name, phone } = parsed.data;
  const customer = await prisma.customer.create({
    data: { businessId: ctx.business.id, name, phone: phone || null },
    select: { id: true, name: true, phone: true },
  });

  revalidatePath("/customers");
  return { ok: true, customer };
}
