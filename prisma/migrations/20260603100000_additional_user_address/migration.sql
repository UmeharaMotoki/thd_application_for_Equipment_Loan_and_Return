-- AlterTable
ALTER TABLE "EquipmentLendingAdditionalUser" ADD COLUMN IF NOT EXISTS "userAddress" TEXT NOT NULL DEFAULT '';
