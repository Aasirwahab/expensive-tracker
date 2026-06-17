"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

export type ProductFormState = { error: string | null; ok?: boolean };

// Photo arrives as an ImageKit CDN URL (new uploads). Older products may still
// carry a small inline data URL until they're migrated — accept both.
function readImage(formData: FormData): string | null {
  const raw = formData.get("imageUrl");
  if (typeof raw !== "string" || !raw) return null;
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (endpoint && raw.startsWith(endpoint) && raw.length <= 2_000) return raw;
  if (raw.startsWith("data:image/") && raw.length <= 300_000) return raw;
  return null;
}

const optionalThreshold = z.coerce.number().int().min(0).max(1_000_000).optional();
const optionalPrice = z.coerce.number().int().min(0).max(2_000_000_000).optional();

// Selling-price guide must read low-to-high when both ends are given.
function checkPriceRange(min?: number, max?: number): string | null {
  if (min != null && max != null && min > max) {
    return "Selling price 'from' can't be more than 'to'.";
  }
  return null;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(80),
  sku: z.string().trim().max(40).optional(),
  currentCost: z.coerce.number().int().min(0).max(2_000_000_000),
  openingStock: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: optionalThreshold,
  priceMin: optionalPrice,
  priceMax: optionalPrice,
});

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can add products." };
  }

  const imageUrl = readImage(formData);
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    currentCost: formData.get("currentCost"),
    openingStock: formData.get("openingStock") || 0,
    lowStockThreshold: formData.get("lowStockThreshold") || undefined,
    priceMin: formData.get("priceMin") || undefined,
    priceMax: formData.get("priceMax") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const rangeError = checkPriceRange(parsed.data.priceMin, parsed.data.priceMax);
  if (rangeError) return { error: rangeError };

  const { name, sku, currentCost, openingStock, lowStockThreshold } =
    parsed.data;
  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        businessId,
        name,
        imageUrl,
        sku: sku ? sku : null,
        currentCost,
        stockQuantity: openingStock,
        lowStockThreshold: lowStockThreshold ?? null,
        priceMin: parsed.data.priceMin ?? null,
        priceMax: parsed.data.priceMax ?? null,
      },
    });

    if (openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          businessId,
          productId: product.id,
          type: "OPENING",
          quantityDelta: openingStock,
          unitCost: currentCost,
          referenceType: "opening",
          note: "Opening stock",
          createdByUserId: userId,
        },
      });
    }
  });

  revalidatePath("/products");
  return { error: null, ok: true };
}

const updateSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1, "Product name is required").max(80),
  sku: z.string().trim().max(40).optional(),
  currentCost: z.coerce.number().int().min(0).max(2_000_000_000),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: optionalThreshold,
  priceMin: optionalPrice,
  priceMax: optionalPrice,
});

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can edit products." };
  }

  const imageUrl = readImage(formData);
  const parsed = updateSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    currentCost: formData.get("currentCost"),
    stockQuantity: formData.get("stockQuantity") || 0,
    lowStockThreshold: formData.get("lowStockThreshold") || undefined,
    priceMin: formData.get("priceMin") || undefined,
    priceMax: formData.get("priceMax") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const rangeError = checkPriceRange(parsed.data.priceMin, parsed.data.priceMax);
  if (rangeError) return { error: rangeError };

  const { productId, name, sku, currentCost, stockQuantity, lowStockThreshold } =
    parsed.data;
  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) return { error: "Product not found." };

  const stockDelta = stockQuantity - existing.stockQuantity;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        name,
        sku: sku ? sku : null,
        currentCost,
        stockQuantity,
        imageUrl,
        lowStockThreshold: lowStockThreshold ?? null,
        priceMin: parsed.data.priceMin ?? null,
        priceMax: parsed.data.priceMax ?? null,
      },
    });

    if (stockDelta !== 0) {
      await tx.stockMovement.create({
        data: {
          businessId,
          productId,
          type: "ADJUSTMENT",
          quantityDelta: stockDelta,
          unitCost: currentCost,
          referenceType: "adjustment",
          note: "Edited from products page",
          createdByUserId: userId,
        },
      });
    }
  });

  revalidatePath("/products");
  return { error: null, ok: true };
}

const restockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Enter how many you added").max(1_000_000),
  unitCost: z.coerce.number().int().min(0).max(2_000_000_000),
  supplierId: z.string().optional(),
  payment: z.enum(["PAID", "CREDIT"]).optional(),
});

// Record new stock bought in (a purchase / restock). Increases stock, logs a
// PURCHASE movement, and refreshes the cost used for profit on future sales.
// Cost uses "latest purchase cost" — weighted-average is deferred (plan R1.1).
// If a supplier is chosen and it's an on-credit buy, also adds the bill to that
// supplier's tab (payables) — the buying-side mirror of a credit sale.
export async function restockProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can add stock." };
  }

  const parsed = restockSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost"),
    supplierId: formData.get("supplierId") || undefined,
    payment: formData.get("payment") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { productId, quantity, unitCost } = parsed.data;
  const supplierId = parsed.data.supplierId?.trim()
    ? parsed.data.supplierId.trim()
    : null;
  const onCredit = parsed.data.payment === "CREDIT";
  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) return { error: "Product not found." };

  let supplierName: string | null = null;
  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId, archivedAt: null },
      select: { name: true },
    });
    if (!supplier) return { error: "Supplier not found." };
    supplierName = supplier.name;
  }

  const recordBill = !!supplierId && onCredit;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: { increment: quantity }, // atomic — no read-then-write race
        currentCost: unitCost,
      },
    });

    await tx.stockMovement.create({
      data: {
        businessId,
        productId,
        type: "PURCHASE",
        quantityDelta: quantity,
        unitCost,
        referenceType: "purchase",
        note: supplierName ? `Restock — ${supplierName}` : "Restock",
        createdByUserId: userId,
      },
    });

    // On-credit buy → add what we now owe this supplier to their tab.
    if (recordBill) {
      await tx.supplierBill.create({
        data: {
          businessId,
          supplierId: supplierId!,
          amount: quantity * unitCost,
          reason: `Restock — ${existing.name}`,
          createdByUserId: userId,
        },
      });
    }
  });

  revalidatePath("/products");
  if (recordBill) {
    revalidatePath("/suppliers");
    revalidatePath("/dashboard");
  }
  return { error: null, ok: true };
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  reason: z.enum(["DAMAGE", "LOSS", "COUNT"]),
  // DAMAGE/LOSS: how many to remove. COUNT: the actual counted quantity.
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  note: z.string().trim().max(120).optional(),
});

// Record stock changing for a non-sale reason: damaged, lost/stolen, or a
// physical count correction. Logs the matching movement and adjusts the cache.
export async function adjustStock(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can adjust stock." };
  }

  const parsed = adjustSchema.safeParse({
    productId: formData.get("productId"),
    reason: formData.get("reason"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { productId, reason, quantity, note } = parsed.data;
  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) return { error: "Product not found." };

  let delta: number;
  let type: "DAMAGE" | "LOSS" | "ADJUSTMENT";
  let referenceType: string;
  let label: string;

  if (reason === "COUNT") {
    // quantity = the number physically counted; set stock to match.
    delta = quantity - existing.stockQuantity;
    if (delta === 0) {
      return { error: "That count matches current stock — nothing to change." };
    }
    type = "ADJUSTMENT";
    referenceType = "count";
    label = "Stock count correction";
  } else {
    // DAMAGE / LOSS: quantity = how many to remove.
    if (quantity < 1) return { error: "Enter how many to remove." };
    if (quantity > existing.stockQuantity && !existing.allowNegativeStock) {
      return { error: `Only ${existing.stockQuantity} in stock.` };
    }
    delta = -quantity;
    type = reason;
    referenceType = reason.toLowerCase();
    label = reason === "DAMAGE" ? "Damaged" : "Lost / stolen";
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: { increment: delta } },
    });

    await tx.stockMovement.create({
      data: {
        businessId,
        productId,
        type,
        quantityDelta: delta,
        unitCost: existing.currentCost,
        referenceType,
        note: note ? `${label} — ${note}` : label,
        createdByUserId: userId,
      },
    });
  });

  revalidatePath("/products");
  return { error: null, ok: true };
}

// Products are archived, never hard-deleted, so past sales stay intact.
export async function archiveProduct(
  productId: string,
): Promise<{ error: string | null }> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can remove products." };
  }

  await prisma.product.updateMany({
    where: { id: productId, businessId: ctx.business.id, archivedAt: null },
    data: { archivedAt: new Date(), isActive: false },
  });

  revalidatePath("/products");
  return { error: null };
}
