/** DB 未投入時の POST 検証・UI フォールバック用（従来の固定配列と同一文言） */
export const STATIC_LENDING_REQUEST_REASON_OPTIONS = [
  "新規入社のため",
  "案件アサインのため",
  "貸与期間終了に伴う、借り換え",
  "その他",
] as const;

export const FALLBACK_EMPLOYMENT_TYPE_LABELS: readonly string[] = [
  "正社員",
  "契約社員（期間の定めあり）",
  "派遣社員",
  "業務委託",
  "その他",
] as const;
