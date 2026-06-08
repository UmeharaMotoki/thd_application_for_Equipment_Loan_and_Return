-- 期間延長・経理資料添付
ALTER TABLE "change_request" ADD COLUMN "periodExtensionCurrentEndDate" DATE;
ALTER TABLE "change_request" ADD COLUMN "periodExtensionNewEndDate" DATE;
ALTER TABLE "change_request" ADD COLUMN "accountingAttachmentsJson" TEXT NOT NULL DEFAULT '[]';
