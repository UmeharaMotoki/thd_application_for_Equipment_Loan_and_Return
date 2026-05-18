import { NextResponse } from "next/server";

export type MasterImportSecretResult =
  | { ok: true; secret: string }
  | { ok: false; message: string };

/**
 * フォーム・Server Action 用。環境変数未設定・不一致を同じ文言で返す。
 */
export function validateMasterImportSecret(
  provided: FormDataEntryValue | null | undefined,
): MasterImportSecretResult {
  const secret = process.env.MASTER_IMPORT_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      message: "サーバーに MASTER_IMPORT_SECRET が設定されていません。",
    };
  }
  const token =
    typeof provided === "string" ? provided.trim() : "";
  if (token !== secret) {
    return { ok: false, message: "認証に失敗しました。" };
  }
  return { ok: true, secret };
}

/**
 * 手動アップロード・S3 同期 API の認証。
 * ヘッダ `x-master-import-secret` または `Authorization: Bearer <secret>`
 */
export function masterImportUnauthorized(req: Request): NextResponse | null {
  const secret = process.env.MASTER_IMPORT_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "サーバーに MASTER_IMPORT_SECRET が設定されていません。" },
      { status: 503 },
    );
  }
  const headerSecret = req.headers.get("x-master-import-secret");
  const auth = req.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const token = headerSecret?.trim() || bearer;
  if (token !== secret) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }
  return null;
}
