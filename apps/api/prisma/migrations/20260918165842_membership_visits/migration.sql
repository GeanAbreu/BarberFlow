/*
  Warnings:

  - Added the required column `visitsPerMonth` to the `ClientSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "ClientSubscription" ADD COLUMN     "visitsPerMonth" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "visitsPerMonth" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "_SubscriptionServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubscriptionServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PlanServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlanServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SubscriptionServices_B_index" ON "_SubscriptionServices"("B");

-- CreateIndex
CREATE INDEX "_PlanServices_B_index" ON "_PlanServices"("B");

-- CreateIndex
CREATE INDEX "Appointment_subscriptionId_date_idx" ON "Appointment"("subscriptionId", "date");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ClientSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubscriptionServices" ADD CONSTRAINT "_SubscriptionServices_A_fkey" FOREIGN KEY ("A") REFERENCES "ClientSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubscriptionServices" ADD CONSTRAINT "_SubscriptionServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlanServices" ADD CONSTRAINT "_PlanServices_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlanServices" ADD CONSTRAINT "_PlanServices_B_fkey" FOREIGN KEY ("B") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
