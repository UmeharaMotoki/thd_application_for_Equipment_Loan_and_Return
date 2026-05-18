/**
 * 過去申請 GET の認可（プラン案C）
 *
 * 認証セッションが無い前提で、クエリ `applicantEmployeeNumber` を必須とし、
 * DB 上の申請の `employeeNumber`（申請者社員番号）と一致する行のみ返す。
 * なりすましを完全には防げないため、本番では VPN / IdP / JWT 等との併用を推奨。
 */

export function normalizeApplicantEmployeeNumber(value: string): string {
  return value.trim();
}

export function applicantOwnsEquipmentRequest(
  recordEmployeeNumber: string,
  queryApplicantEmployeeNumber: string,
): boolean {
  return (
    normalizeApplicantEmployeeNumber(recordEmployeeNumber) ===
    normalizeApplicantEmployeeNumber(queryApplicantEmployeeNumber)
  );
}
