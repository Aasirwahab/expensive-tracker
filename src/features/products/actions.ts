"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

export type ProductFormState = { error: string | null; ok?: boolean };

// Photo arrives as a small resized data URL from the browser.
function readImage(formData: FormData): string | null {
  const raw = formData.get("imageUrl");
  return typeof raw === "string" &&
    raw.startsWith("data:image/") &&
    raw.length <= 300_000
    ? raw
    : null;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(80),
  sku: z.string().trim().max(40).optional(),
  currentCost: z.coerce.number().int().min(0).max(2_000_000_000),
  openingStock: z.coerce.number().int().min(0).max(1_000_000),
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { name, sku, currentCost, openingStock } = parsed.data;
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { productId, name, sku, currentCost, stockQuantity } = parsed.data;
  const businessId = ctx.business.id;
  const userId = ctx.user.id;

  // Scope to the active business (tenant safety).
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) return { error: "Product not found." };

  const stockDelta = stockQuantity - existing.stockQuantity;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { name, sku: sku ? sku : null, currentCost, stockQuantity, imageUrl },
    });

    // A manual stock change is recorded as an adjustment in the ledger.
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
