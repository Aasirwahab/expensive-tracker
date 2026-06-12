-- CreateTable
CREATE TABLE "CustomerCharge" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "chargedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerCharge_businessId_customerId_idx" ON "CustomerCharge"("businessId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerCharge_businessId_chargedAt_idx" ON "CustomerCharge"("businessId", "chargedAt");

-- AddForeignKey
ALTER TABLE "CustomerCharge" ADD CONSTRAINT "CustomerCharge_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCharge" ADD CONSTRAINT "CustomerCharge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCharge" ADD CONSTRAINT "CustomerCharge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
