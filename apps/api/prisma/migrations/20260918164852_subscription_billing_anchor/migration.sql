/*
  Warnings:

  - Added the required column `billingFrom` to the `ClientSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClientSubscription" ADD COLUMN     "billingFrom" TIMESTAMP(3) NOT NULL;
