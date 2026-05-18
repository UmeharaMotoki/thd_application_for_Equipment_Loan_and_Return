import { STAFF_MANAGEMENT, STAFF_TECHNICAL } from "@/lib/resolvePcSpecDecision";

/**
 * 人事マスタの「社員区分」「職種名称」から貸与判定用の利用者区分を推定する。
 * 表記は Excel 取込データに依存するため、未一致時は空を返し画面で手動選択とする。
 */
export function deriveUserStaffCategoryFromHr(
  employeeCategory: string | null | undefined,
  occupationName: string | null | undefined,
): typeof STAFF_MANAGEMENT | typeof STAFF_TECHNICAL | "" {
  const cat = (employeeCategory ?? "").trim();
  const occ = (occupationName ?? "").trim();

  if (cat === STAFF_MANAGEMENT || cat.includes("管理社員")) {
    return STAFF_MANAGEMENT;
  }
  if (cat === STAFF_TECHNICAL || cat.includes("技術社員") || cat.includes("技術職")) {
    return STAFF_TECHNICAL;
  }

  if (cat.includes("管理") && !cat.includes("技術")) {
    return STAFF_MANAGEMENT;
  }

  if (occ) {
    if (/技術|開発|エンジニア|プログラマ|システム/i.test(occ)) {
      return STAFF_TECHNICAL;
    }
  }

  return "";
}
