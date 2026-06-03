import dayjs, { type Dayjs } from "dayjs";
import { compareIsoDateOnly, parseIsoDateOnly } from "@/lib/dateOnly";
import {
  EQUIPMENT_CATEGORY_MAP,
  lendingLinesIncludeCommunication,
  lendingLinesIncludeEquipment,
  lendingLinesIncludePc,
  lendingLinesIncludePeripheral,
  lendingLinesIncludeSmartphone,
  lendingLinesIncludeWifiRouter,
  type LendingEquipmentTypeOption,
} from "@/lib/lendingEquipmentOptions";
import { lineAssigneeKey } from "@/lib/lendingEquipmentUserBlocks";
import type { LendingEquipmentUserBlockInfo } from "@/lib/lendingEquipmentUserBlocks";
import {
  decisionResolutionToLicenseFields,
  isMsOfficeEditionAllowedForPcDecision,
  resolvePcSpecDecision,
  STAFF_MANAGEMENT,
  STAFF_TECHNICAL,
} from "@/lib/resolvePcSpecDecision";

export type UserReasonFormState = {
  userStaffCategory: string;
  decisionContractType: string;
  decisionWorkContent: string;
  decisionClientEnv: string;
  msOfficeEdition: string;
  lendingStartDate: string;
  expectedReturnDate: string;
  smartphoneCameraPresence: string;
  smartphoneUserIdentification: string;
  smartphoneWorkplaceUse: string;
  peripheralMonitorSize: string;
  peripheralMonitorSizeCustom: string;
  peripheralLanCableLength: string;
  peripheralLanCableLengthCustom: string;
};

export type LendingUserReasonBlock = LendingEquipmentUserBlockInfo & {
  equipmentTypes: string[];
};

export function emptyUserReasonFormState(): UserReasonFormState {
  return {
    userStaffCategory: "",
    decisionContractType: "",
    decisionWorkContent: "",
    decisionClientEnv: "",
    msOfficeEdition: "",
    lendingStartDate: "",
    expectedReturnDate: "",
    smartphoneCameraPresence: "",
    smartphoneUserIdentification: "",
    smartphoneWorkplaceUse: "",
    peripheralMonitorSize: "",
    peripheralMonitorSizeCustom: "",
    peripheralLanCableLength: "",
    peripheralLanCableLengthCustom: "",
  };
}

export function linesForEmployee(
  lines: Array<{ equipmentType: string; assignedUserEmployeeNumber: string }>,
  employeeNumber: string,
  representativeEmployeeNumber: string,
): Array<{ equipmentType: string }> {
  const key = employeeNumber.trim();
  return lines.filter(
    (l) => lineAssigneeKey(l, representativeEmployeeNumber) === key && l.equipmentType.trim(),
  );
}

export function buildLendingUserReasonBlocks(
  userBlocks: LendingEquipmentUserBlockInfo[],
  lines: Array<{ equipmentType: string; assignedUserEmployeeNumber: string }>,
  representativeEmployeeNumber: string,
): LendingUserReasonBlock[] {
  return userBlocks
    .map((block) => ({
      ...block,
      equipmentTypes: linesForEmployee(lines, block.employeeNumber, representativeEmployeeNumber).map(
        (l) => l.equipmentType.trim(),
      ),
    }))
    .filter((b) => b.equipmentTypes.length > 0);
}

export function assignedEmployeeNumbersFromLines(
  lines: Array<{ assignedUserEmployeeNumber: string }>,
  representativeEmployeeNumber: string,
): string[] {
  const set = new Set<string>();
  for (const line of lines) {
    const emp = lineAssigneeKey(line, representativeEmployeeNumber);
    if (emp) set.add(emp);
  }
  return [...set];
}

export function userLinesIncludePc(
  lines: Array<{ equipmentType: string }>,
): boolean {
  return lendingLinesIncludePc(lines);
}

export function userLinesIncludeSmartphone(lines: Array<{ equipmentType: string }>): boolean {
  return lendingLinesIncludeSmartphone(lines);
}

export function userLinesIncludeWifiRouter(lines: Array<{ equipmentType: string }>): boolean {
  return lendingLinesIncludeWifiRouter(lines);
}

export function userLinesIncludeCommunication(lines: Array<{ equipmentType: string }>): boolean {
  return lendingLinesIncludeCommunication(lines);
}

export function userLinesIncludePeripheral(lines: Array<{ equipmentType: string }>): boolean {
  return lendingLinesIncludePeripheral(lines);
}

export function userLinesIncludeEquipment(lines: Array<{ equipmentType: string }>, name: string): boolean {
  return lendingLinesIncludeEquipment(lines, name);
}

export function categoryForEquipmentType(equipmentType: string): string | null {
  const t = equipmentType.trim();
  if (t in EQUIPMENT_CATEGORY_MAP) {
    return EQUIPMENT_CATEGORY_MAP[t as LendingEquipmentTypeOption];
  }
  return null;
}

function isWeekday(date: Dayjs): boolean {
  const day = date.day();
  return day >= 1 && day <= 5;
}

export function validateUserLendingDates(
  lendingStartDate: string,
  expectedReturnDate: string,
  minSelectableDate: Dayjs,
  isSelectableBusinessDate: (value: Dayjs | null | undefined) => boolean,
): boolean {
  const s = lendingStartDate.trim();
  const e = expectedReturnDate.trim();
  if (!s || !e) return false;
  const lendingStart = parseIsoDateOnly(s);
  const expectedReturn = parseIsoDateOnly(e);
  if (!lendingStart || !expectedReturn) return false;
  const lendingStartDayjs = dayjs(lendingStart).startOf("day");
  const expectedReturnDayjs = dayjs(expectedReturn).startOf("day");
  if (!isSelectableBusinessDate(lendingStartDayjs)) return false;
  if (!isSelectableBusinessDate(expectedReturnDayjs)) return false;
  if (compareIsoDateOnly(e, s) < 0) return false;
  if (lendingStartDayjs.isBefore(minSelectableDate) || expectedReturnDayjs.isBefore(minSelectableDate)) {
    return false;
  }
  if (!isWeekday(lendingStartDayjs) || !isWeekday(expectedReturnDayjs)) return false;
  return true;
}

export function validateUserReasonForBlock(
  block: LendingUserReasonBlock,
  reason: UserReasonFormState,
  minSelectableDate: Dayjs,
  isSelectableBusinessDate: (value: Dayjs | null | undefined) => boolean,
): boolean {
  if (
    !validateUserLendingDates(
      reason.lendingStartDate,
      reason.expectedReturnDate,
      minSelectableDate,
      isSelectableBusinessDate,
    )
  ) {
    return false;
  }

  const userLines = block.equipmentTypes.map((equipmentType) => ({ equipmentType }));

  if (userLinesIncludePc(userLines)) {
    const staff = reason.userStaffCategory.trim();
    if (staff !== STAFF_MANAGEMENT && staff !== STAFF_TECHNICAL) return false;
    const ms = reason.msOfficeEdition.trim();
    if (
      !ms ||
      !isMsOfficeEditionAllowedForPcDecision(
        staff,
        reason.decisionContractType,
        reason.decisionWorkContent,
        reason.decisionClientEnv,
        ms,
      )
    ) {
      return false;
    }
    const resolution = resolvePcSpecDecision(
      staff,
      reason.decisionContractType,
      reason.decisionWorkContent,
      reason.decisionClientEnv,
      ms,
    );
    if (!decisionResolutionToLicenseFields(resolution) || resolution.kind === "lending_denied") {
      return false;
    }
  }

  if (userLinesIncludeSmartphone(userLines)) {
    if (
      !reason.smartphoneCameraPresence.trim() ||
      !reason.smartphoneUserIdentification.trim() ||
      !reason.smartphoneWorkplaceUse.trim()
    ) {
      return false;
    }
  }

  if (userLinesIncludeEquipment(userLines, "モニター")) {
    if (!reason.peripheralMonitorSize.trim()) return false;
    if (reason.peripheralMonitorSize === "その他" && !reason.peripheralMonitorSizeCustom.trim()) {
      return false;
    }
  }

  if (userLinesIncludeEquipment(userLines, "LANケーブル")) {
    if (!reason.peripheralLanCableLength.trim()) return false;
    if (reason.peripheralLanCableLength === "その他" && !reason.peripheralLanCableLengthCustom.trim()) {
      return false;
    }
  }

  return true;
}
