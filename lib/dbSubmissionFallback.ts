import { Prisma } from "@prisma/client";

/**
 * 申請 POST で Prisma が「DB 未準備・未接続・スキーマ不一致」等に失敗したとき、
 * JSON ファイル保存へフォールバックしてよいか。
 */
export function shouldFallbackToJsonSave(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const code = e.code;
    if (code === "P2021" || code === "P2022" || code === "P2010") return true;
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  return /EquipmentLendingLine|EquipmentReturn|does not exist|relation|Foreign key|Unknown column|no such table|ECONNREFUSED|Can't reach database|server has closed the connection|password authentication failed|database .* does not exist/i.test(
    msg,
  );
}
