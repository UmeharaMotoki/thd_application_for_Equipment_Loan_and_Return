import type { EquipmentReturnLine, EquipmentReturnRequest } from "@prisma/client";
import { RETURN_OTHER_EQUIPMENT_CODE } from "@/lib/returnEquipmentFormConstants";
import type { ReturnEquipmentSelectionState } from "@/lib/returnEquipmentSelectionTypes";
import {
  emptyReturnEquipmentSelection,
  newReturnEquipmentLine,
  newReturnEquipmentLineId,
} from "@/lib/returnEquipmentSelectionTypes";

export type ReturnPrefillApplicant = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
};

export type ReturnPrefillUser = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
};

export type ReturnPrefillReason = {
  requestReason: string;
  requestDetail: string;
};

export type EquipmentReturnPrefillPayload = {
  applicant: ReturnPrefillApplicant;
  user: ReturnPrefillUser;
  returnEquipment: ReturnEquipmentSelectionState;
  returnReason: ReturnPrefillReason;
};

function parseAccessoriesJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function formatDateOnly(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function lineOtherDetail(
  line: EquipmentReturnLine,
  requestOtherItemsDetail: string,
): string {
  const code = (line.equipmentCode || line.equipmentName).trim();
  if (code !== RETURN_OTHER_EQUIPMENT_CODE) return "";
  return line.otherDetail.trim() || requestOtherItemsDetail.trim();
}

export function equipmentReturnRequestToPrefillPayload(
  record: EquipmentReturnRequest & { lines: EquipmentReturnLine[] },
): EquipmentReturnPrefillPayload {
  const sorted = [...record.lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const lines = sorted
    .filter((l) => (l.equipmentCode || l.equipmentName).trim())
    .map((l) => {
      const code = (l.equipmentCode || l.equipmentName).trim();
      const label = (l.equipmentLabel || l.equipmentName).trim();
      return {
        id: newReturnEquipmentLineId(),
        equipmentCode: code,
        equipmentLabel: label,
        assetManagementNumber: l.assetManagementNumber,
        shippingBoxChoice: l.shippingBoxChoice,
        selectedAccessories: parseAccessoriesJson(l.accessoriesJson),
        otherDetail: lineOtherDetail(l, record.otherItemsDetail),
        lendingDueDate: formatDateOnly(l.lendingDueDate),
        expectedReturnDate: formatDateOnly(l.expectedReturnDate),
      };
    });

  return {
    applicant: {
      applicantName: record.applicantName,
      employeeNumber: record.employeeNumber,
      companyName: record.companyName,
      departmentName: record.departmentName,
      address: record.address,
    },
    user: {
      userName: record.userName,
      userEmployeeNumber: record.userEmployeeNumber,
      userCompanyName: record.userCompanyName,
      userDepartmentName: record.userDepartmentName,
      userAddress: record.userAddress,
      userContractType: record.userContractType,
    },
    returnEquipment: {
      lines: lines.length > 0 ? lines : [newReturnEquipmentLine()],
    },
    returnReason: {
      requestReason: record.requestReason,
      requestDetail: record.requestDetail,
    },
  };
}

export { emptyReturnEquipmentSelection, newReturnEquipmentLineId as newPrefillLineId };
