-- AlterTable
ALTER TABLE "EquipmentRequest" ADD COLUMN "applicationCorrelationId" TEXT;

UPDATE "EquipmentRequest"
SET "applicationCorrelationId" = gen_random_uuid()::text
WHERE "applicationCorrelationId" IS NULL;

ALTER TABLE "EquipmentRequest" ALTER COLUMN "applicationCorrelationId" SET NOT NULL;

CREATE UNIQUE INDEX "EquipmentRequest_applicationCorrelationId_key" ON "EquipmentRequest"("applicationCorrelationId");
