import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/** PoC: リポジトリ内 要件定義/テスト（SF 添付は未実装） */
export function resolveLendingExportDirectory(): string {
  const fromEnv = process.env.THD_LENDING_EXPORT_DIR?.trim();
  if (fromEnv) {
    mkdirSync(fromEnv, { recursive: true });
    return fromEnv;
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "..", "要件定義", "テスト"),
    path.join(cwd, "要件定義", "テスト"),
  ];
  for (const dir of candidates) {
    const parent = path.join(dir, "..");
    if (existsSync(parent)) {
      mkdirSync(dir, { recursive: true });
      return path.resolve(dir);
    }
  }
  const fallback = path.join(cwd, "exports", "lending");
  mkdirSync(fallback, { recursive: true });
  return path.resolve(fallback);
}

export function buildLendingExportFileName(applicationCorrelationId: string, at = new Date()): string {
  const stamp = [
    at.getFullYear(),
    String(at.getMonth() + 1).padStart(2, "0"),
    String(at.getDate()).padStart(2, "0"),
    String(at.getHours()).padStart(2, "0"),
    String(at.getMinutes()).padStart(2, "0"),
    String(at.getSeconds()).padStart(2, "0"),
  ].join("");
  const safeId = applicationCorrelationId.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40);
  return `lending_${safeId}_${stamp}.xlsx`;
}
