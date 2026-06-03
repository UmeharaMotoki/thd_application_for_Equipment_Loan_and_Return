import type { AdditionalUserRow } from "@/components/equipment-lending/LendingAdditionalUsersBlock";

export type LendingEquipmentUserBlockInfo = {
  employeeNumber: string;
  userName: string;
  roleLabel: "代表" | "追加";
  userCompanyName: string;
  userDepartmentName: string;
};

export type LendingEquipmentLineLike = {
  id: string;
  equipmentType: string;
  assignedUserEmployeeNumber: string;
};

export function newLendingEquipmentLineId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `lend-line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newLendingEquipmentLineForUser(employeeNumber: string): LendingEquipmentLineLike {
  return {
    id: newLendingEquipmentLineId(),
    equipmentType: "",
    assignedUserEmployeeNumber: employeeNumber.trim(),
  };
}

export function buildLendingEquipmentUserBlocks(
  representative: {
    userName: string;
    userEmployeeNumber: string;
    userCompanyName: string;
    userDepartmentName: string;
  },
  userMode: "single" | "multiple",
  additionalUsers: AdditionalUserRow[],
): LendingEquipmentUserBlockInfo[] {
  const repEmp = representative.userEmployeeNumber.trim();
  if (!repEmp) return [];

  const blocks: LendingEquipmentUserBlockInfo[] = [
    {
      employeeNumber: repEmp,
      userName: representative.userName.trim() || "代表利用者",
      roleLabel: "代表",
      userCompanyName: representative.userCompanyName,
      userDepartmentName: representative.userDepartmentName,
    },
  ];

  if (userMode === "multiple") {
    for (const u of additionalUsers) {
      const emp = u.userEmployeeNumber.trim();
      if (!emp) continue;
      blocks.push({
        employeeNumber: emp,
        userName: u.userName.trim() || "追加利用者",
        roleLabel: "追加",
        userCompanyName: u.userCompanyName,
        userDepartmentName: u.userDepartmentName,
      });
    }
  }

  return blocks;
}

export function lineAssigneeKey(
  line: Pick<LendingEquipmentLineLike, "assignedUserEmployeeNumber">,
  representativeEmployeeNumber: string,
): string {
  return line.assignedUserEmployeeNumber.trim() || representativeEmployeeNumber.trim();
}

export function linesForUser(
  lines: LendingEquipmentLineLike[],
  employeeNumber: string,
  representativeEmployeeNumber: string,
): LendingEquipmentLineLike[] {
  const key = employeeNumber.trim();
  return lines.filter((l) => lineAssigneeKey(l, representativeEmployeeNumber) === key);
}

/** 利用者プールに合わせて機器行を整える（各利用者に最低1行、プール外の行は削除） */
export function syncLendingLinesForUserPool<T extends LendingEquipmentLineLike>(
  lines: T[],
  pool: LendingEquipmentUserBlockInfo[],
): T[] {
  if (pool.length === 0) return lines;

  const repEmp = pool[0]!.employeeNumber;
  const poolSet = new Set(pool.map((p) => p.employeeNumber));

  let next = lines
    .map((line) => {
      const assignee = lineAssigneeKey(line, repEmp);
      if (!poolSet.has(assignee)) return null;
      return {
        ...line,
        assignedUserEmployeeNumber: assignee,
      } as T;
    })
    .filter((line): line is T => line !== null);

  for (const block of pool) {
    const hasLine = next.some((l) => lineAssigneeKey(l, repEmp) === block.employeeNumber);
    if (!hasLine) {
      next = [...next, newLendingEquipmentLineForUser(block.employeeNumber) as T];
    }
  }

  if (next.length === 0) {
    next = [newLendingEquipmentLineForUser(repEmp) as T];
  }

  return next;
}

export function validateEquipmentStep(
  lines: LendingEquipmentLineLike[],
  pool: LendingEquipmentUserBlockInfo[],
): { ok: true } | { ok: false; message: string } {
  if (pool.length === 0) {
    return { ok: false, message: "利用者の社員番号を入力してください。" };
  }

  const repEmp = pool[0]!.employeeNumber;

  if (lines.length === 0) {
    return { ok: false, message: "各利用者に貸与する機器を1件以上選択してください。" };
  }

  for (const line of lines) {
    const assignee = lineAssigneeKey(line, repEmp);
    if (!pool.some((p) => p.employeeNumber === assignee)) {
      return { ok: false, message: "登録されていない利用者に割り当てられた機器行があります。" };
    }
    if (!line.equipmentType.trim()) {
      return { ok: false, message: "すべての機器行で種類を選択してください。" };
    }
  }

  for (const block of pool) {
    const userLines = linesForUser(lines, block.employeeNumber, repEmp);
    if (userLines.length === 0) {
      return {
        ok: false,
        message: `「${block.userName}」に貸与する機器を1件以上追加してください。`,
      };
    }
  }

  return { ok: true };
}
