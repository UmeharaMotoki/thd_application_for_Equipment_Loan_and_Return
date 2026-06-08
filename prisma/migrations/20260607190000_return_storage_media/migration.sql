-- 機器返却：携帯型記録媒体を return_main_item に追加
INSERT INTO "application_select_option" ("id", "category", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'return_main_item', v.code, v.label, v.sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('usb_memory', 'USBメモリ', 65),
  ('external_hdd', '外付けHDD', 66),
  ('external_ssd', '外付けSSD', 67),
  ('sd_card', 'SD/microSDカード', 68),
  ('optical_media', '光学メディア（CD/DVD等）', 69)
) AS v(code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "application_select_option" o
  WHERE o."category" = 'return_main_item' AND o."code" = v.code
);

INSERT INTO "application_select_option" ("id", "category", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'return_item_accessory', v.code, v.label, v.sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('usb_memory', 'USBメモリ本体', 650),
  ('external_hdd', '外付けHDD本体', 660),
  ('external_ssd', '外付けSSD本体', 670),
  ('sd_card', 'SD/microSDカード本体', 680),
  ('optical_media', '光学メディア本体', 690)
) AS v(code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "application_select_option" o
  WHERE o."category" = 'return_item_accessory' AND o."code" = v.code AND o."label" = v.label
);

INSERT INTO "application_select_option" ("id", "category", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'return_asset_number_label', v.code, v.label, v.sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('usb_memory', '返却物-資産番号-USBメモリ', 65),
  ('external_hdd', '返却物-資産番号-外付けHDD', 66),
  ('external_ssd', '返却物-資産番号-外付けSSD', 67),
  ('sd_card', '返却物-資産番号-SD/microSDカード', 68),
  ('optical_media', '返却物-資産番号-光学メディア', 69)
) AS v(code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "application_select_option" o
  WHERE o."category" = 'return_asset_number_label' AND o."code" = v.code
);

-- 変更依頼マスタから記録媒体を削除（返却側で扱う）
DELETE FROM "application_select_option"
WHERE "category" = 'change_request_equipment_type'
  AND "label" IN (
    'USBメモリ',
    '外付けHDD',
    '外付けSSD',
    'SD/microSDカード',
    '光学メディア（CD/DVD等）'
  );
