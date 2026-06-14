"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { syncUser } from "@/lib/auth-context";
import { hasAccess } from "@/lib/access";

// Default operating-expense categories every new business starts with (plan §9.6).
const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salary / wages",
  "Transport",
  "Repairs",
  "Packaging",
  "Marketing",
  "Internet / phone",
  "Bank / payment fees",
  "Miscellaneous",
];

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your business name").max(60),
  businessType: z
    .string()
    .trim()
    .min(1, "Please choose what kind of business this is")
    .max(40),
});

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

export type CreateBusinessState = { error: string | null };

export async function createBusiness(
  _prev: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const user = await syncUser();
  if (!user) return { error: "You must be signed in." };

  // Developer gate (re-checked server-side so the UI can't be bypassed).
  if (!(await hasAccess(user.email))) {
    return {
      error: "Your account isn't activated yet. Please contact the provider.",
    };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  // If they somehow already own a business, don't create a second one.
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (existing) redirect("/dashboard");

  const { name, businessType } = parsed.data;
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;

  await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name,
        businessType,
        slug,
        currencyCode: "LKR",
        countryCode: "LK",
        timezone: "Asia/Colombo",
        weekStartsOn: 1,
        createdByUserId: user.id,
      },
    });

    await tx.membership.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    await tx.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((categoryName) => ({
        businessId: business.id,
        name: categoryName,
        isSystemDefault: true,
      })),
    });
  });

  redirect("/dashboard");
}
