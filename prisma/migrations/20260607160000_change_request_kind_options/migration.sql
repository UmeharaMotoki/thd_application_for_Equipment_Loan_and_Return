-- 変更依頼種別（ApplicationSelectOption）
DELETE FROM "application_select_option" WHERE "category" = 'change_request_kind';

INSERT INTO "application_select_option" ("id", "category", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'change_request_kind', 'user_change', '使用者変更', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_kind', 'cost_dept_change', '経費負担部門の変更', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_kind', 'both', '使用者変更と経費負担部門の変更（両方）', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'change_request_kind', 'period_extension', '期間延長', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
