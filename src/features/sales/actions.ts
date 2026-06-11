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
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  idempotencyKey: z.string().min(8).max(64),
});

export type SaleResult =
  | {
      ok: true;
      saleId: string;
      saleNumber: string;
      total: number;
      profit: number;
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
      const total = subtotal;
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

      const count = await tx.sale.count({ where: { businessId } });
      const saleNumber = String(count + 1);

      const sale = await tx.sale.create({
        data: {
          businessId,
          saleNumber,
          status: "COMPLETED",
          subtotal,
          discount: 0,
          total,
          totalCogs,
          grossProfit,
          paymentMethod,
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

      return { saleId: sale.id, saleNumber, total, grossProfit };
    });

    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/sales");

    return {
      ok: true,
      saleId: result.saleId,
      saleNumber: result.saleNumber,
      total: result.total,
      profit: result.grossProfit,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not complete the sale.",
    };
  }
}
