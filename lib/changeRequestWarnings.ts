import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";
import {
  BOTH_CHANGE_DEPT_AND_COST_BLOCKED_MESSAGE,
  USER_CHANGE_DEPARTMENT_BLOCKED_MESSAGE,
  type ChangeRequestKind,
} from "@/lib/changeRequestConstants";

export type ChangeRequestUserSnapshot = {
  userEmployeeNumber: string;
  userDepartmentName: string;
  userDepartmentCode: string;
  userCostDeptName: string;
  userCostDeptCode: string;
};

function normalizedDeptCode(code: string): string {
  return normalizeDepartmentCode(code)?.trim() ?? code.trim();
}

export function departmentDiffers(a: ChangeRequestUserSnapshot, b: ChangeRequestUserSnapshot): boolean {
  const codeA = normalizedDeptCode(a.userDepartmentCode);
  const codeB = normalizedDeptCode(b.userDepartmentCode);
  if (codeA && codeB) {
    return codeA !== codeB;
  }
  const nameA = a.userDepartmentName.trim();
  const nameB = b.userDepartmentName.trim();
  if (nameA && nameB) return nameA !== nameB;
  return false;
}

function costDeptDiffers(a: ChangeRequestUserSnapshot, b: ChangeRequestUserSnapshot): boolean {
  const codeA = normalizedDeptCode(a.userCostDeptCode);
  const codeB = normalizedDeptCode(b.userCostDeptCode);
  if (codeA && codeB) {
    return codeA !== codeB;
  }
  const nameA = a.userCostDeptName.trim();
  const nameB = b.userCostDeptName.trim();
  if (nameA && nameB) return nameA !== nameB;
  return false;
}

/** 所属部署・経費負担部門の両方が変わる警告を表示するか（申請不可ではない注意喚起） */
export function shouldShowDeptAndCostDeptWarning(
  current: ChangeRequestUserSnapshot,
  next: ChangeRequestUserSnapshot,
  changeKind: ChangeRequestKind,
): boolean {
  if (changeKind === "cost_dept_change" || changeKind === "period_extension") return false;
  const blockReason = getChangeRequestDetailsBlockReason(current, next, changeKind);
  if (blockReason) return false;
  const currentEmp = current.userEmployeeNumber.trim();
  const nextEmp = next.userEmployeeNumber.trim();
  if (!currentEmp || !nextEmp || currentEmp === nextEmp) return false;
  return departmentDiffers(current, next) && costDeptDiffers(current, next);
}

/** 詳細ステップで申請をブロックする理由（null なら進行可） */
export function getChangeRequestDetailsBlockReason(
  current: ChangeRequestUserSnapshot,
  next: ChangeRequestUserSnapshot,
  changeKind: ChangeRequestKind,
): string | null {
  if (changeKind === "cost_dept_change" || changeKind === "period_extension") return null;

  const currentEmp = current.userEmployeeNumber.trim();
  const nextEmp = next.userEmployeeNumber.trim();
  if (!currentEmp || !nextEmp || currentEmp === nextEmp) return null;

  if (changeKind === "user_change" && departmentDiffers(current, next)) {
    return USER_CHANGE_DEPARTMENT_BLOCKED_MESSAGE;
  }

  if (
    changeKind === "both" &&
    departmentDiffers(current, next) &&
    costDeptDiffers(current, next)
  ) {
    return BOTH_CHANGE_DEPT_AND_COST_BLOCKED_MESSAGE;
  }

  return null;
}
