-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "lastSaleNumber" INTEGER NOT NULL DEFAULT 0;

-- Backfill: start each business's counter at its current highest sale number so
-- newly numbered sales continue the sequence instead of colliding from 1.
UPDATE "Business" b
SET "lastSaleNumber" = COALESCE(
  (SELECT MAX(CAST(s."saleNumber" AS INTEGER))
   FROM "Sale" s
   WHERE s."businessId" = b."id"),
  0
);
