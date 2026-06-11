"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveContext } from "@/lib/auth-context";

// Products store only the PURCHASE (wholesale) cost. The selling rate is entered
// per sale in Quick Sale, so the owner can negotiate / discount at the moment.
const schema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(80),
  sku: z.string().trim().max(40).optional(),
  currentCost: z.coerce.number().int().min(0).max(2_000_000_000),
  openingStock: z.coerce.number().int().min(0).max(1_000_000),
});

export type ProductFormState = { error: string | null; ok?: boolean };

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await getActiveContext();
  if (!ctx?.business) return { error: "No active business." };
  // Access model: only the owner can add products (staff can view).
  if (ctx.role !== "OWNER") {
    return { error: "Only the owner can add products." };
  }

  // Product photo arrives as a small resized data URL from the browser.
  const rawImage = formData.get("imageUrl");
  const imageUrl =
    typeof rawImage === "string" &&
    rawImage.startsWith("data:image/") &&
    rawImage.length <= 300_000
      ? rawImage
      : null;

  const parsed = schema.safeParse({
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

    // Opening stock is recorded in the ledger (the source of truth).
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
