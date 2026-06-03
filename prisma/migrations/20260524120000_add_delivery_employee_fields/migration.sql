-- 送付先: フォームの「利用者と同じ」「送付先社員番号」と DB を一致させる
ALTER TABLE "EquipmentRequest"
  ADD COLUMN "deliverySameAsUser" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deliveryEmployeeNumber" TEXT NOT NULL DEFAULT '';

ALTER TABLE "EquipmentReturnRequest"
  ADD COLUMN "deliverySameAsUser" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deliveryEmployeeNumber" TEXT NOT NULL DEFAULT '';

-- 既存データ: 送付先が利用者と同一と推定できる行を補完
UPDATE "EquipmentRequest"
SET
  "deliverySameAsUser" = (
    TRIM("deliveryName") = TRIM("userName")
    AND TRIM("deliveryCompanyName") = TRIM("userCompanyName")
    AND TRIM("deliveryDepartment") = TRIM("userDepartmentName")
    AND TRIM("deliveryAddress") = TRIM("userAddress")
    AND TRIM("deliveryEmail") = TRIM("userEmail")
    AND TRIM("deliveryPhone") = TRIM("userPhone")
    AND TRIM("deliveryArea") = ''
    AND TRIM("deliveryPostalCode") = ''
    AND TRIM("deliveryBuilding") = ''
  ),
  "deliveryEmployeeNumber" = CASE
    WHEN TRIM("deliveryName") = TRIM("userName") THEN TRIM("userEmployeeNumber")
    ELSE ''
  END;

UPDATE "EquipmentReturnRequest"
SET
  "deliverySameAsUser" = (
    TRIM("deliveryName") = TRIM("userName")
    AND TRIM("deliveryCompanyName") = TRIM("userCompanyName")
    AND TRIM("deliveryDepartment") = TRIM("userDepartmentName")
    AND TRIM("deliveryAddress") = TRIM("userAddress")
    AND TRIM("deliveryEmail") = TRIM("userEmail")
    AND TRIM("deliveryPhone") = TRIM("userPhone")
    AND TRIM("deliveryArea") = ''
    AND TRIM("deliveryPostalCode") = ''
    AND TRIM("deliveryBuilding") = ''
  ),
  "deliveryEmployeeNumber" = CASE
    WHEN TRIM("deliveryName") = TRIM("userName") THEN TRIM("userEmployeeNumber")
    ELSE ''
  END;
