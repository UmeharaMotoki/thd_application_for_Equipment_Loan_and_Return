-- 返却機器行: フォームの otherDetail と DB を一致させる
ALTER TABLE "EquipmentReturnLine" ADD COLUMN "otherDetail" TEXT NOT NULL DEFAULT '';

UPDATE "EquipmentReturnLine" AS erl
SET "otherDetail" = r."otherItemsDetail"
FROM "EquipmentReturnRequest" AS r
WHERE erl."requestId" = r.id
  AND erl."equipmentCode" = 'other'
  AND TRIM(r."otherItemsDetail") <> '';
