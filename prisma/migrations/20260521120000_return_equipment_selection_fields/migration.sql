-- AlterTable
ALTER TABLE "EquipmentReturnRequest" ADD COLUMN "otherItemsDetail" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "EquipmentReturnLine" ADD COLUMN "equipmentCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentReturnLine" ADD COLUMN "equipmentLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentReturnLine" ADD COLUMN "assetManagementNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentReturnLine" ADD COLUMN "shippingBoxChoice" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentReturnLine" ADD COLUMN "accessoriesJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "EquipmentReturnLine" ALTER COLUMN "lendingDueDate" DROP NOT NULL;
ALTER TABLE "EquipmentReturnLine" ALTER COLUMN "expectedReturnDate" DROP NOT NULL;
