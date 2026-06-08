-- 変更依頼：対象機器マスタ（貸与の lending_equipment_type とは category を分離）
DELETE FROM "application_select_option" WHERE "category" = 'change_request_equipment_type';

INSERT INTO "application_select_option" ("id", "category", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'ノートPC', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'デスクトップPC', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'モニター', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'マウス', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'ヘッドセット', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'LANケーブル', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'スマホ', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_equipment_type', NULL, 'Wifiルーター', 80, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
