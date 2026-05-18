import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * DB 未接続時など、申請内容をローカル JSON へ保存する（`docker/JSON/議事送信` 既定）。
 *
 * - `THD_SUBMISSION_MODE=json` … 下流用に `../JSON/議事送信` へ必ず JSON 保存。`DATABASE_URL` がある場合は併せて Prisma（ローカル申請テーブル）へも保存し一覧可能にする。
 * - `DATABASE_URL` が空 … JSON のみ（ローカル DB は使わない）
 * - `THD_JSON_SUBMISSION_DIR` … 保存先ディレクトリ（省略時は `../JSON/議事送信` を `thd` からの相対）
 */
export function useJsonSubmissionOnly(): boolean {
  if (process.env.THD_SUBMISSION_MODE?.trim().toLowerCase() === "json") {
    return true;
  }
  return !process.env.DATABASE_URL?.trim();
}

/** `DATABASE_URL` があれば Prisma でローカル申請テーブルに書ける（JSON モード併用時の二重保存・一覧用） */
export function hasLocalSubmissionDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getJsonSubmissionDirectory(): string {
  const override = process.env.THD_JSON_SUBMISSION_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.resolve(process.cwd(), "..", "JSON", "議事送信");
}

export async function saveSubmissionJsonFile(args: {
  /** ファイル名接頭辞（例: equipment-lending） */
  prefix: string;
  /** 保存するオブジェクト（JSON 化） */
  payload: unknown;
}): Promise<{ directory: string; fileName: string; fullPath: string }> {
  const directory = getJsonSubmissionDirectory();
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safePrefix = args.prefix.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const fileName = `${safePrefix}_${stamp}.json`;
  const fullPath = path.join(directory, fileName);
  const text = `${JSON.stringify(args.payload, null, 2)}\n`;
  await writeFile(fullPath, text, "utf8");
  return { directory, fileName, fullPath };
}
