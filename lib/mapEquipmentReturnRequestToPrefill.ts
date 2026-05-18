import { randomUUID } from "node:crypto";
import type { EquipmentReturnLine, EquipmentReturnRequest } from "@prisma/client";

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

export type ReturnPrefillLine = {
  id: string;
  equipmentName: string;
  lendingDueDate: string;
  expectedReturnDate: string;
};

export type ReturnPrefillReason = {
  requestReason: string;
  requestDetail: string;
};

export type EquipmentReturnPrefillPayload = {
  applicant: ReturnPrefillApplicant;
  user: ReturnPrefillUser;
  lines: ReturnPrefillLine[];
  returnReason: ReturnPrefillReason;
};

function newClientLineId(): string {
  return randomUUID();
}

export function equipmentReturnRequestToPrefillPayload(
  record: EquipmentReturnRequest & { lines: EquipmentReturnLine[] },
): EquipmentReturnPrefillPayload {
  const sorted = [...record.lines].sort((a, b) => a.sortOrder - b.sortOrder);
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
    lines: sorted.map((l) => ({
      id: newClientLineId(),
      equipmentName: l.equipmentName,
      lendingDueDate: "",
      expectedReturnDate: "",
    })),
    returnReason: {
      requestReason: record.requestReason,
      requestDetail: record.requestDetail,
    },
  };
}
