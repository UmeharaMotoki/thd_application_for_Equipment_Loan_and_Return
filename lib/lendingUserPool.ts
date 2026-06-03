import type { z } from "zod";
import type { additionalUserSchema, createLendingRequestSchema } from "@/lib/validators";
import { EQUIPMENT_CATEGORY_MAP, type LendingEquipmentTypeOption } from "@/lib/lendingEquipmentOptions";

export type CreateLendingBody = z.infer<typeof createLendingRequestSchema>;
export type AdditionalUserInput = z.infer<typeof additionalUserSchema>;

export type LendingUserPoolEntry = {
  role: "representative" | "additional";
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
  userCostDeptName: string;
  userCostDeptCode: string;
  userEmail: string;
  userPhone: string;
};

export function buildLendingUserPool(body: CreateLendingBody): LendingUserPoolEntry[] {
  const rep: LendingUserPoolEntry = {
    role: "representative",
    userName: body.userName.trim(),
    userEmployeeNumber: body.userEmployeeNumber.trim(),
    userCompanyName: body.userCompanyName.trim(),
    userDepartmentName: body.userDepartmentName.trim(),
    userAddress: body.userAddress.trim(),
    userContractType: body.userContractType.trim(),
    userCostDeptName: (body.userCostDeptName ?? "").trim(),
    userCostDeptCode: (body.userCostDeptCode ?? "").trim(),
    userEmail: (body.userEmail ?? "").trim(),
    userPhone: (body.userPhone ?? "").trim(),
  };
  const pool: LendingUserPoolEntry[] = [rep];
  if ((body.userMode ?? "single") === "multiple" && body.additionalUsers?.length) {
    for (const u of body.additionalUsers) {
      pool.push({
        role: "additional",
        userName: u.userName.trim(),
        userEmployeeNumber: u.userEmployeeNumber.trim(),
        userCompanyName: (u.userCompanyName ?? "").trim(),
        userDepartmentName: (u.userDepartmentName ?? "").trim(),
        userAddress: "",
        userContractType: (u.userContractType ?? "").trim(),
        userCostDeptName: (u.userCostDeptName ?? "").trim(),
        userCostDeptCode: (u.userCostDeptCode ?? "").trim(),
        userEmail: (u.userEmail ?? "").trim(),
        userPhone: (u.userPhone ?? "").trim(),
      });
    }
  }
  return pool;
}

export function resolveUserFromPool(
  pool: LendingUserPoolEntry[],
  employeeNumber: string,
): LendingUserPoolEntry | null {
  const key = employeeNumber.trim();
  return pool.find((p) => p.userEmployeeNumber === key) ?? null;
}

export function lineAssigneeEmployeeNumber(
  line: { assignedUserEmployeeNumber?: string },
  representativeEmployeeNumber: string,
): string {
  const assigned = (line.assignedUserEmployeeNumber ?? "").trim();
  if (assigned) return assigned;
  return representativeEmployeeNumber.trim();
}

export function isPcEquipmentType(equipmentType: string): boolean {
  const t = equipmentType.trim();
  if (t in EQUIPMENT_CATEGORY_MAP) {
    return EQUIPMENT_CATEGORY_MAP[t as LendingEquipmentTypeOption] === "pc";
  }
  return false;
}

export function pcAssignedEmployeeNumbers(
  body: CreateLendingBody,
): string[] {
  const rep = body.userEmployeeNumber.trim();
  const set = new Set<string>();
  for (const line of body.lines) {
    if (!isPcEquipmentType(line.equipmentType)) continue;
    set.add(lineAssigneeEmployeeNumber(line, rep));
  }
  return [...set];
}

/** 機器行が割り当てられている利用者の社員番号（重複なし） */
export function assignedEmployeeNumbersFromLines(body: CreateLendingBody): string[] {
  const rep = body.userEmployeeNumber.trim();
  const set = new Set<string>();
  for (const line of body.lines) {
    const emp = lineAssigneeEmployeeNumber(line, rep);
    if (emp) set.add(emp);
  }
  return [...set];
}

export function linesForAssignee(
  body: CreateLendingBody,
  employeeNumber: string,
): Array<{ equipmentType: string }> {
  const rep = body.userEmployeeNumber.trim();
  const key = employeeNumber.trim();
  return body.lines.filter(
    (l) => lineAssigneeEmployeeNumber(l, rep) === key && l.equipmentType.trim(),
  );
}
