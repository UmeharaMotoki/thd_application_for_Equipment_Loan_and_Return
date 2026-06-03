-- 利用者ごとの申請理由・貸与期間・機器別設定
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "lendingStartDate" DATE;
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "expectedReturnDate" DATE;
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "smartphoneCameraPresence" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "smartphoneUserIdentification" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "smartphoneWorkplaceUse" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "peripheralMonitorSize" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "peripheralMonitorSizeCustom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "peripheralLanCableLength" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EquipmentLendingUserLicense" ADD COLUMN IF NOT EXISTS "peripheralLanCableLengthCustom" TEXT NOT NULL DEFAULT '';
