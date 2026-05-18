/**
 * サーバー・クライアントで同一の検索正規化。
 * - NFKC: 半角カナ・互換文字などを統一（半角／全角の幅差を吸収）
 * - 空白類を単一半角スペースに畳み、前後トリム
 */
export function normalizeEmployeeSearchInput(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function employeeNameSearchTokens(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 0);
}

/**
 * 氏名の「スペース無し一致」用。NFKC 後に Unicode 空白（全角スペース含む）をすべて除去。
 * 例: DB「山田 太郎」⇔ 入力「山田　太郎」「山田太郎」は同一の "山田太郎" になる。
 */
export function compactMatchForm(raw: string): string {
  return normalizeEmployeeSearchInput(raw).replace(/\s/gu, "");
}

/** PostgreSQL ILIKE 用（%, _, \ のエスケープ） */
export function escapeSqlLikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
