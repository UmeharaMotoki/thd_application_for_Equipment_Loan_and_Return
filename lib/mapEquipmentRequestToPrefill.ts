import { randomUUID } from "node:crypto";
import type { EquipmentLendingLine, EquipmentRequest } from "@prisma/client";
import {
  LENDING_NON_PC_STAFF_CATEGORY,
  lendingLinesIncludePc,
} from "@/lib/lendingEquipmentOptions";
import {
  MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED,
  STAFF_MANAGEMENT,
} from "@/lib/resolvePcSpecDecision";

const DEFAULT_MS_OFFICE_STANDARD = "Standard（標準、Access無）" as const;

export type LendingPrefillApplicant = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
  applicantJobTitle: string;
  applicantEmail: string;
  applicantPhone: string;
};

export type LendingPrefillUser = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
  userStaffCategory: string;
  userCostDeptName: string;
  userCostDeptCode: string;
  userEmail: string;
  userPhone: string;
  userHrEmployeeCategory: string;
  userHrOccupationName: string;
};

export type LendingPrefillDelivery = {
  deliverySameAsUser: boolean;
  deliveryName: string;
  deliveryEmployeeNumber: string;
  deliveryCompanyName: string;
  deliveryDepartment: string;
  deliveryArea: string;
  deliveryPostalCode: string;
  deliveryAddress: string;
  deliveryBuilding: string;
  deliveryEmail: string;
  deliveryPhone: string;
};

export type LendingPrefillReason = {
  requestReason: string;
  applicationCorrelationId: string;
  decisionContractType: string;
  decisionWorkContent: string;
  decisionClientEnv: string;
  msOfficeEdition: string;
  lendingStartDate: string;
  expectedReturnDate: string;
  requestDetail: string;
  smartphoneCameraPresence: string;
  smartphoneUserIdentification: string;
  smartphoneWorkplaceUse: string;
  peripheralMonitorSize: string;
  peripheralMonitorSizeCustom: string;
  peripheralLanCableLength: string;
  peripheralLanCableLengthCustom: string;
};

export type LendingPrefillLine = { id: string; equipmentType: string };

/** API 応答・localStorage 下書きと互換なプリフィル形状 */
export type LendingRequestPrefillPayload = {
  applicant: LendingPrefillApplicant;
  user: LendingPrefillUser;
  delivery: LendingPrefillDelivery;
  lendingLines: LendingPrefillLine[];
  reason: LendingPrefillReason;
};

function inferMsOfficeEditionForPrefill(
  lineRows: { equipmentType: string }[],
  userStaffCategory: string,
  licenseSpecCode: string,
): string {
  if (!lendingLinesIncludePc(lineRows)) return "";
  if (userStaffCategory.trim() === STAFF_MANAGEMENT) return DEFAULT_MS_OFFICE_STANDARD;
  const code = licenseSpecCode.trim();
  if (code === "4") return MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED;
  return DEFAULT_MS_OFFICE_STANDARD;
}

function deliveryMatchesUser(r: EquipmentRequest): boolean {
  return (
    r.deliveryName.trim() === r.userName.trim() &&
    r.deliveryCompanyName.trim() === r.userCompanyName.trim() &&
    r.deliveryDepartment.trim() === r.userDepartmentName.trim() &&
    r.deliveryAddress.trim() === r.userAddress.trim() &&
    r.deliveryEmail.trim() === r.userEmail.trim() &&
    r.deliveryPhone.trim() === r.userPhone.trim() &&
    r.deliveryArea.trim() === "" &&
    r.deliveryPostalCode.trim() === "" &&
    r.deliveryBuilding.trim() === ""
  );
}

function newClientLineId(): string {
  return randomUUID();
}

export function equipmentRequestToPrefillPayload(
  record: EquipmentRequest & { lines: EquipmentLendingLine[] },
): LendingRequestPrefillPayload {
  const sortedLines = [...record.lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const lineRows = sortedLines.map((l) => ({ equipmentType: l.equipmentType }));
  const includesPc = lendingLinesIncludePc(lineRows);
  const staffForForm = includesPc
    ? record.userStaffCategory.trim()
    : LENDING_NON_PC_STAFF_CATEGORY;

  const sameAsUser = deliveryMatchesUser(record);

  return {
    applicant: {
      applicantName: record.applicantName,
      employeeNumber: record.employeeNumber,
      companyName: record.companyName,
      departmentName: record.departmentName,
      address: record.address,
      applicantJobTitle: record.applicantJobTitle,
      applicantEmail: record.applicantEmail,
      applicantPhone: record.applicantPhone,
    },
    user: {
      userName: record.userName,
      userEmployeeNumber: record.userEmployeeNumber,
      userCompanyName: record.userCompanyName,
      userDepartmentName: record.userDepartmentName,
      userAddress: record.userAddress,
      userContractType: record.userContractType,
      userStaffCategory: staffForForm,
      userCostDeptName: record.userCostDeptName,
      userCostDeptCode: record.userCostDeptCode,
      userEmail: record.userEmail,
      userPhone: record.userPhone,
      userHrEmployeeCategory: "",
      userHrOccupationName: "",
    },
    delivery: sameAsUser
      ? {
          deliverySameAsUser: true,
          deliveryName: "",
          deliveryEmployeeNumber: "",
          deliveryCompanyName: "",
          deliveryDepartment: "",
          deliveryArea: "",
          deliveryPostalCode: "",
          deliveryAddress: "",
          deliveryBuilding: "",
          deliveryEmail: "",
          deliveryPhone: "",
        }
      : {
          deliverySameAsUser: false,
          deliveryName: record.deliveryName,
          deliveryEmployeeNumber: "",
          deliveryCompanyName: record.deliveryCompanyName,
          deliveryDepartment: record.deliveryDepartment,
          deliveryArea: record.deliveryArea,
          deliveryPostalCode: record.deliveryPostalCode,
          deliveryAddress: record.deliveryAddress,
          deliveryBuilding: record.deliveryBuilding,
          deliveryEmail: record.deliveryEmail,
          deliveryPhone: record.deliveryPhone,
        },
    lendingLines: sortedLines.map((l) => ({
      id: newClientLineId(),
      equipmentType: l.equipmentType,
    })),
    reason: {
      requestReason: record.requestReason,
      applicationCorrelationId: "",
      decisionContractType: includesPc ? record.decisionContractType : "",
      decisionWorkContent: includesPc ? record.decisionWorkContent : "",
      decisionClientEnv: includesPc ? record.decisionClientEnv : "",
      msOfficeEdition: inferMsOfficeEditionForPrefill(lineRows, staffForForm, record.licenseSpecCode),
      lendingStartDate: "",
      expectedReturnDate: "",
      requestDetail: record.requestDetail,
      smartphoneCameraPresence: record.smartphoneCameraPresence,
      smartphoneUserIdentification: record.smartphoneUserIdentification,
      smartphoneWorkplaceUse: record.smartphoneWorkplaceUse,
      peripheralMonitorSize: record.peripheralMonitorSize,
      peripheralMonitorSizeCustom: record.peripheralMonitorSizeCustom,
      peripheralLanCableLength: record.peripheralLanCableLength,
      peripheralLanCableLengthCustom: record.peripheralLanCableLengthCustom,
    },
  };
}

export function formatDateOnlyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}
