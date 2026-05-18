/**
 * 人事 Excel / THD CSV で部署コードの表記がずれる問題を吸収する。
 * - 前後のダブルクォート（Excel）
 * - 先頭ゼロ（数値セルで 060000713 ↔ 60000713）
 */
export function normalizeDepartmentCode(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  if (/^\d+$/.test(s)) {
    s = s.replace(/^0+/, "") || "0";
  }

  return s || null;
}

/** PostgreSQL: 部署コード突合用（列参照は呼び出し側で固定すること） */
export const SQL_NORMALIZE_DEPARTMENT_CODE = (qualifiedColumn: string): string =>
  `NULLIF(regexp_replace(trim(both '"' from trim(${qualifiedColumn})), '^0+', ''), '')`;
