"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(100_000),
        unitPrice: z.coerce.number().int().min(0).max(2_000_000_000),
      }),
    )
    .min(1, "Add at least one product."),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"]),
  // Whole-sale discount in rupees, knocked off the subtotal.
  discount: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  // Credit ("udhaar") sale: put on a customer's tab. customerId is required
  // when paymentMethod is CREDIT; amountPaid is whatever was paid up front.
  customerId: z.string().min(1).optional().nullable(),
  amountPaid: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  idempotencyKey: z.string().min(8).max(64),
});

export type SaleResult =
  | {
      ok: true;
      saleId: string;
      saleNumber: string;
      total: number;
      profit: number;
      owed: number; // unpaid remainder for a credit sale (0 for paid-in-full)
    }
  | { ok: false; error: string };

export async function createSale(input: unknown): Promise<SaleResult> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { ok: false, error: "No active business." };
  // Owner and staff can both record sales.

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sale.",
    };
  }

  const { items, paymentMethod, idempotencyKey } = parsed.data;
  const businessId = ctx.business.id;
  const userId = ctx.user.id;
  const isCredit = paymentMethod === "CREDIT";

  if (isCredit && !parsed.data.customerId) {
    return { ok: false, error: "Pick a customer for a credit sale." };
  }
  if (isCredit) {
    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId!, businessId, archivedAt: null },
      select: { id: true },
    });
    if (!customer) return { ok: false, error: "Customer not found." };
  }

  // Idempotency: if this exact submission already created a sale, return it.
  const existing = await prisma.sale.findFirst({
    where: { businessId, idempotencyKey },
  });
  if (existing) {
    return {
      ok: true,
      saleId: existing.id,
      saleNumber: existing.saleNumber,
      total: existing.total,
      profit: existing.grossProfit,
      owed: existing.total - existing.amountPaid,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ids = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: ids }, businessId },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let totalCogs = 0;
      const lines = items.map((i) => {
        const product = byId.get(i.productId);
        if (!product) throw new Error("A product was not found. Please refresh.");
        const lineRevenue = i.quantity * i.unitPrice;
        const lineCogs = i.quantity * product.currentCost; // cost snapshot
        subtotal += lineRevenue;
        totalCogs += lineCogs;
        return {
          product,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unitCost: product.currentCost,
          lineRevenue,
          lineCogs,
          lineProfit: lineRevenue - lineCogs,
        };
      });
      // Discount is capped at the subtotal so the total can never go negative.
      const discount = Math.min(parsed.data.discount ?? 0, subtotal);
      const total = subtotal - discount;
      const grossProfit = total - totalCogs;

      // Conditional stock decrement — can never oversell the last unit.
      for (const line of lines) {
        if (line.product.allowNegativeStock) {
          await tx.product.update({
            where: { id: line.product.id },
            data: { stockQuantity: { decrement: line.quantity } },
          });
        } else {
          const updated = await tx.product.updateMany({
            where: {
              id: line.product.id,
              businessId,
              stockQuantity: { gte: line.quantity },
            },
            data: { stockQuantity: { decrement: line.quantity } },
          });
          if (updated.count !== 1) {
            throw new Error(`Not enough stock for ${line.product.name}.`);
          }
        }
      }

      // Atomic, race-free sale numbering: the row-level lock on the Business
      // row serializes concurrent sales so two staff can never get the same
      // number (which would violate the unique [businessId, saleNumber]).
      const biz = await tx.business.update({
        where: { id: businessId },
        data: { lastSaleNumber: { increment: 1 } },
        select: { lastSaleNumber: true },
      });
      const saleNumber = String(biz.lastSaleNumber);

      // Non-credit sales are paid in full. Credit sales record the up-front
      // amount (0..total); the remainder is owed on the customer's tab.
      const amountPaid = isCredit
        ? Math.min(parsed.data.amountPaid ?? 0, total)
        : total;

      const sale = await tx.sale.create({
        data: {
          businessId,
          saleNumber,
          status: "COMPLETED",
          subtotal,
          discount,
          total,
          totalCogs,
          grossProfit,
          paymentMethod,
          customerId: isCredit ? parsed.data.customerId : null,
          amountPaid,
          idempotencyKey,
          createdByUserId: userId,
          items: {
            create: lines.map((line) => ({
              businessId,
              productId: line.product.id,
              productNameSnapshot: line.product.name,
              skuSnapshot: line.product.sku,
              quantity: line.quantity,
              unitCost: line.unitCost,
              unitPrice: line.unitPrice,
              discount: 0,
              lineRevenue: line.lineRevenue,
              lineCogs: line.lineCogs,
              lineProfit: line.lineProfit,
            })),
          },
        },
      });

      for (const line of lines) {
        await tx.stockMovement.create({
          data: {
            businessId,
            productId: line.product.id,
            type: "SALE",
            quantityDelta: -line.quantity,
            unitCost: line.unitCost,
            referenceType: "sale",
            referenceId: sale.id,
            note: `Sale ${saleNumber}`,
            createdByUserId: userId,
          },
        });
      }

      return { saleId: sale.id, saleNumber, total, grossProfit, amountPaid };
    });

    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/sales");
    if (isCredit) revalidatePath("/customers");

    return {
      ok: true,
      saleId: result.saleId,
      saleNumber: result.saleNumber,
      total: result.total,
      profit: result.grossProfit,
      owed: result.total - result.amountPaid,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not complete the sale.",
    };
  }
}

const returnSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100_000),
});

export type ReturnResult =
  | { ok: true; refund: number }
  | { ok: false; error: string };

/**
 * Return some quantity of a single line from a completed sale (without voiding
 * the whole sale): put that stock back (RETURN movement), shrink the line, and
 * lower the sale's totals/profit so every COMPLETED-only aggregate self-corrects
 * — the same approach as voidSale. For a credit sale the customer's tab drops
 * automatically. Owner-only (affects revenue, profit, receivables).
 */
export async function returnSaleItem(input: unknown): Promise<ReturnResult> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { ok: false, error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { ok: false, error: "Only the owner can take a return." };
  }

  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid return.",
    };
  }

  const { saleItemId, quantity: r } = parsed.data;
  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  try {
    const refund = await prisma.$transaction(async (tx) => {
      const item = await tx.saleItem.findFirst({
        where: { id: saleItemId, businessId },
        include: { sale: true },
      });
      if (!item) throw new Error("Sale line not found.");

      const sale = item.sale;
      if (sale.status !== "COMPLETED") {
        throw new Error("This sale is voided — nothing to return.");
      }
      if (r > item.quantity) {
        throw new Error(`Only ${item.quantity} left to return on this line.`);
      }

      // Recompute the line and the sale totals after taking r units back.
      const newItemQty = item.quantity - r;
      const newSubtotal = sale.subtotal - r * item.unitPrice;
      const newTotal = Math.max(newSubtotal - sale.discount, 0);
      const newTotalCogs = sale.totalCogs - r * item.unitCost;
      const newGrossProfit = newTotal - newTotalCogs;
      // Never record more paid than the new total; any excess is cash refunded.
      const newAmountPaid = Math.min(sale.amountPaid, newTotal);
      const refundValue = sale.total - newTotal;

      // Stock returns to the shelf.
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: r } },
      });
      await tx.stockMovement.create({
        data: {
          businessId,
          productId: item.productId,
          type: "RETURN",
          quantityDelta: r, // positive: stock comes back
          unitCost: item.unitCost,
          referenceType: "sale",
          referenceId: sale.id,
          note: `Return from sale ${sale.saleNumber}`,
          createdByUserId: userId,
        },
      });

      await tx.saleItem.update({
        where: { id: item.id },
        data: {
          quantity: newItemQty,
          lineRevenue: newItemQty * item.unitPrice,
          lineCogs: newItemQty * item.unitCost,
          lineProfit: newItemQty * (item.unitPrice - item.unitCost),
        },
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          subtotal: newSubtotal,
          total: newTotal,
          totalCogs: newTotalCogs,
          grossProfit: newGrossProfit,
          amountPaid: newAmountPaid,
        },
      });

      return refundValue;
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/customers");
    return { ok: true, refund };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not take the return.",
    };
  }
}

/**
 * Void a completed sale: put the stock back, record REVERSAL movements, and
 * mark the sale VOIDED. If it was a credit sale, the customer's outstanding
 * balance corrects itself automatically (balances only count COMPLETED sales).
 * Owner-only — voiding affects revenue, profit, and receivables.
 */
export async function voidSale(
  saleId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { ok: false, error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { ok: false, error: "Only the owner can void a sale." };
  }

  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, businessId },
        include: { items: true },
      });
      if (!sale) throw new Error("Sale not found.");
      if (sale.status === "VOIDED") throw new Error("This sale is already voided.");

      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            type: "REVERSAL",
            quantityDelta: item.quantity, // positive: stock returns
            unitCost: item.unitCost,
            referenceType: "sale",
            referenceId: sale.id,
            note: `Void of sale ${sale.saleNumber}`,
            createdByUserId: userId,
          },
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "VOIDED" },
      });
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/customers");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not void the sale.",
    };
  }
}
