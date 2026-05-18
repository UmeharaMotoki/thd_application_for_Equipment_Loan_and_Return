-- AlterTable
ALTER TABLE "EquipmentRequest" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EquipmentReturnRequest" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EquipmentRequest_employeeNumber_createdAt_idx" ON "EquipmentRequest"("employeeNumber", "createdAt");

-- CreateIndex
CREATE INDEX "EquipmentReturnRequest_employeeNumber_createdAt_idx" ON "EquipmentReturnRequest"("employeeNumber", "createdAt");
