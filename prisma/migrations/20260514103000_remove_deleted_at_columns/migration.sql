-- Prisma スキーマから deletedAt を外したため、DB 上の列を削除（未作成環境では何もしない）
ALTER TABLE "EquipmentRequest" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "EquipmentReturnRequest" DROP COLUMN IF EXISTS "deletedAt";
