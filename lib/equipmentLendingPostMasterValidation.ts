import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";
import {
  fetchActiveOptionsByCategories,
  optionsRowsToLabelSet,
} from "@/lib/applicationSelectOptionsQueries";
import { getEmploymentTypeLabelSetForValidation } from "@/lib/employmentTypeOptions";
import { STATIC_LENDING_REQUEST_REASON_OPTIONS } from "@/lib/formOptionsStaticFallback";
import {
  LAN_CABLE_LENGTH_OPTIONS,
  LENDING_EQUIPMENT_TYPE_OPTIONS,
  LENDING_NON_PC_STAFF_CATEGORY,
  lendingLinesIncludeEquipment,
  lendingLinesIncludePc,
  lendingLinesIncludeSmartphone,
  MONITOR_SIZE_OPTIONS,
} from "@/lib/lendingEquipmentOptions";
import {
  displayNameForLendingEmployee,
  licenseInputForEmployee,
  type UserLicenseInput,
} from "@/lib/lendingPostLicenseInput";
import {
  assignedEmployeeNumbersFromLines,
  isPcEquipmentType,
  linesForAssignee,
  type CreateLendingBody,
} from "@/lib/lendingUserPool";
import {
  DECISION_CLIENT_NO,
  DECISION_CLIENT_YES,
  DECISION_CONTRACT_DISPATCH,
  DECISION_CONTRACT_QUASI,
  DECISION_WORK_DEVELOPMENT,
  DECISION_WORK_INTERNAL,
  MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED,
  MS_OFFICE_EDITION_STANDARD_OPTIONS,
  STAFF_MANAGEMENT,
  STAFF_TECHNICAL,
  isMsOfficeEditionAllowedForPcDecision,
} from "@/lib/resolvePcSpecDecision";
import { createLendingRequestSchema } from "@/lib/validators";

type LendingBody = z.infer<typeof createLendingRequestSchema>;

const LENDING_FETCH_CATEGORIES = [
  APPLICATION_SELECT_CATEGORIES.lendingRequestReason,
  APPLICATION_SELECT_CATEGORIES.decisionContractType,
  APPLICATION_SELECT_CATEGORIES.decisionWorkContent,
  APPLICATION_SELECT_CATEGORIES.decisionClientEnv,
  APPLICATION_SELECT_CATEGORIES.msOfficeEdition,
  APPLICATION_SELECT_CATEGORIES.smartphoneCamera,
  APPLICATION_SELECT_CATEGORIES.smartphoneUserIdentification,
  APPLICATION_SELECT_CATEGORIES.smartphoneWorkplace,
  APPLICATION_SELECT_CATEGORIES.peripheralMonitorSize,
  APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength,
  APPLICATION_SELECT_CATEGORIES.lendingEquipmentType,
  APPLICATION_SELECT_CATEGORIES.userStaffCategory,
] as const;

type MasterSets = {
  userStaffSet: Set<string>;
  decisionContractSet: Set<string>;
  decisionWorkSet: Set<string>;
  decisionClientSet: Set<string>;
  msOfficeSet: Set<string>;
  smartphoneCameraSet: Set<string>;
  smartphoneIdSet: Set<string>;
  smartphoneWorkplaceSet: Set<string>;
  monitorSet: Set<string>;
  lanSet: Set<string>;
};

function mergeSet(db: Set<string>, fallback: readonly string[]): Set<string> {
  return db.size > 0 ? db : new Set(fallback);
}

function linesFromTypes(types: string[]): { equipmentType: string }[] {
  return types.map((equipmentType) => ({ equipmentType }));
}

function userLinesNeedLicenseInput(userLines: { equipmentType: string }[]): boolean {
  return (
    userLines.some((l) => isPcEquipmentType(l.equipmentType)) ||
    lendingLinesIncludeSmartphone(userLines) ||
    lendingLinesIncludeEquipment(userLines, "モニター") ||
    lendingLinesIncludeEquipment(userLines, "LANケーブル")
  );
}

function validatePcFieldsForUser(
  row: UserLicenseInput,
  displayName: string,
  sets: MasterSets,
): string | null {
  const staff = (row.userStaffCategory ?? "").trim();
  if (!sets.userStaffSet.has(staff)) {
    return `${displayName}：利用者区分の値が不正です。`;
  }
  if (staff === STAFF_TECHNICAL) {
    const dct = (row.decisionContractType ?? "").trim();
    const dwc = (row.decisionWorkContent ?? "").trim();
    const dce = (row.decisionClientEnv ?? "").trim();
    if (!sets.decisionContractSet.has(dct)) {
      return `${displayName}：客先契約形態の値が不正です。`;
    }
    if (!sets.decisionWorkSet.has(dwc)) {
      return `${displayName}：業務内容の値が不正です。`;
    }
    if (!sets.decisionClientSet.has(dce)) {
      return `${displayName}：客先ネットワーク接続の有無の値が不正です。`;
    }
  }
  const ms = (row.msOfficeEdition ?? "").trim();
  if (!sets.msOfficeSet.has(ms)) {
    return `${displayName}：MicrosoftOfficeのエディションの値が不正です。`;
  }
  if (
    !isMsOfficeEditionAllowedForPcDecision(
      staff,
      (row.decisionContractType ?? "").trim(),
      (row.decisionWorkContent ?? "").trim(),
      (row.decisionClientEnv ?? "").trim(),
      ms,
    )
  ) {
    return `${displayName}：MicrosoftOfficeのエディションが、利用者区分・判定プロセスと一致しません。`;
  }
  return null;
}

function validateEquipmentFieldsForUser(
  body: CreateLendingBody,
  emp: string,
  row: UserLicenseInput,
  displayName: string,
  sets: MasterSets,
): string | null {
  const userLines = linesForAssignee(body, emp);

  if (lendingLinesIncludeSmartphone(userLines)) {
    const a = (row.smartphoneCameraPresence ?? "").trim();
    const b = (row.smartphoneUserIdentification ?? "").trim();
    const c = (row.smartphoneWorkplaceUse ?? "").trim();
    if (
      !sets.smartphoneCameraSet.has(a) ||
      !sets.smartphoneIdSet.has(b) ||
      !sets.smartphoneWorkplaceSet.has(c)
    ) {
      return `${displayName}：スマホ関連の選択値が不正です。一覧を更新してやり直してください。`;
    }
  }

  if (lendingLinesIncludeEquipment(userLines, "モニター")) {
    const sz = (row.peripheralMonitorSize ?? "").trim();
    if (!sets.monitorSet.has(sz)) {
      return `${displayName}：モニターサイズの値が不正です。`;
    }
    if (sz === "その他" && !(row.peripheralMonitorSizeCustom ?? "").trim()) {
      return `${displayName}：モニターサイズ（その他）の詳細を入力してください。`;
    }
  }

  if (lendingLinesIncludeEquipment(userLines, "LANケーブル")) {
    const len = (row.peripheralLanCableLength ?? "").trim();
    if (!sets.lanSet.has(len)) {
      return `${displayName}：LANケーブル長さの値が不正です。`;
    }
    if (len === "その他" && !(row.peripheralLanCableLengthCustom ?? "").trim()) {
      return `${displayName}：LANケーブル（その他）の詳細を入力してください。`;
    }
  }

  return null;
}

function validatePerAssigneeMasters(body: CreateLendingBody, sets: MasterSets): string | null {
  const assigned = assignedEmployeeNumbersFromLines(body);
  if (assigned.length === 0) {
    return "貸与機器の割当利用者を特定できません。";
  }

  for (const emp of assigned) {
    const userLines = linesForAssignee(body, emp);
    const userHasPc = userLines.some((l) => isPcEquipmentType(l.equipmentType));
    const displayName = displayNameForLendingEmployee(body, emp);
    const row = licenseInputForEmployee(body, emp);

    if (userLinesNeedLicenseInput(userLines) && !row) {
      return `${displayName}：申請内容が未入力です。申請理由画面で各利用者の設定を入力してください。`;
    }
    if (!row) continue;

    if (userHasPc) {
      const pcErr = validatePcFieldsForUser(row, displayName, sets);
      if (pcErr) return pcErr;
    }

    const equipErr = validateEquipmentFieldsForUser(body, emp, row, displayName, sets);
    if (equipErr) return equipErr;
  }

  return null;
}

/** 機器貸与 POST のマスタ照合。問題なければ null。 */
export async function validateLendingPostAgainstMasters(
  prisma: PrismaClient,
  body: LendingBody,
  normalizedEquipmentTypes: string[],
): Promise<string | null> {
  const [rows, employmentSet] = await Promise.all([
    fetchActiveOptionsByCategories(prisma, [...LENDING_FETCH_CATEGORIES]),
    getEmploymentTypeLabelSetForValidation(prisma),
  ]);

  const requestReasonSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.lendingRequestReason),
    STATIC_LENDING_REQUEST_REASON_OPTIONS,
  );
  const equipmentSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.lendingEquipmentType),
    LENDING_EQUIPMENT_TYPE_OPTIONS,
  );
  const sets: MasterSets = {
    userStaffSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.userStaffCategory),
      [STAFF_MANAGEMENT, STAFF_TECHNICAL],
    ),
    decisionContractSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.decisionContractType),
      [DECISION_CONTRACT_QUASI, DECISION_CONTRACT_DISPATCH],
    ),
    decisionWorkSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.decisionWorkContent),
      [DECISION_WORK_DEVELOPMENT, DECISION_WORK_INTERNAL],
    ),
    decisionClientSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.decisionClientEnv),
      [DECISION_CLIENT_YES, DECISION_CLIENT_NO],
    ),
    msOfficeSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.msOfficeEdition),
      [...MS_OFFICE_EDITION_STANDARD_OPTIONS, MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED],
    ),
    smartphoneCameraSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.smartphoneCamera),
      ["カメラあり", "カメラなし"],
    ),
    smartphoneIdSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.smartphoneUserIdentification),
      ["特定する", "特定しない"],
    ),
    smartphoneWorkplaceSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.smartphoneWorkplace),
      ["事業場で利用する", "事業場で利用しない"],
    ),
    monitorSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.peripheralMonitorSize),
      MONITOR_SIZE_OPTIONS,
    ),
    lanSet: mergeSet(
      optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength),
      LAN_CABLE_LENGTH_OPTIONS,
    ),
  };

  const ct = body.userContractType.trim();
  if (!employmentSet.has(ct)) {
    return "雇用形態の値が不正です。一覧を更新してやり直してください。";
  }

  const rr = body.requestReason.trim();
  if (!requestReasonSet.has(rr)) {
    return "申請理由の値が不正です。";
  }

  for (let i = 0; i < normalizedEquipmentTypes.length; i += 1) {
    const t = normalizedEquipmentTypes[i];
    if (!equipmentSet.has(t)) {
      return `機器 ${i + 1} 行目：種類の値がマスタと一致しません。`;
    }
  }

  const lineObjs = linesFromTypes(normalizedEquipmentTypes);
  const includesPc = lendingLinesIncludePc(lineObjs);

  if (!includesPc) {
    if (body.userStaffCategory.trim() !== LENDING_NON_PC_STAFF_CATEGORY) {
      return "貸与機器のデータが不正です。画面を再読み込みしてやり直してください。";
    }
  }

  return validatePerAssigneeMasters(body, sets);
}
