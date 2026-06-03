import type { Prisma } from "@prisma/client";
import {
  buildLendingUserPool,
  lineAssigneeEmployeeNumber,
  resolveUserFromPool,
  type CreateLendingBody,
} from "@/lib/lendingUserPool";
import type { ResolvedUserLicense } from "@/lib/lendingResolveUserLicenses";

export function validateLendingLineAssignees(body: CreateLendingBody): string | null {
  const pool = buildLendingUserPool(body);
  const rep = body.userEmployeeNumber.trim();

  for (let i = 0; i < body.lines.length; i++) {
    const row = body.lines[i];
    const t = row.equipmentType.trim();
    if (!t) {
      return `機器 ${i + 1} 行目：種類を選択してください。`;
    }
    const assign = lineAssigneeEmployeeNumber(row, rep);
    if (!assign) {
      return `機器 ${i + 1} 行目：利用者を選択してください。`;
    }
    if (!resolveUserFromPool(pool, assign)) {
      return `機器 ${i + 1} 行目：割当利用者が申請内の利用者と一致しません。`;
    }
  }
  return null;
}

export function buildLendingPrismaCreateData(params: {
  body: CreateLendingBody;
  applicationCorrelationId: string;
  lendingStart: Date;
  expectedReturn: Date;
  requestDetail: string;
  representative: ResolvedUserLicense;
  userLicenses: ResolvedUserLicense[];
  normalizedLines: Array<{ equipmentType: string; assignedUserEmployeeNumber: string }>;
}): Prisma.EquipmentRequestCreateInput {
  const { body, applicationCorrelationId, lendingStart, expectedReturn, requestDetail, representative, userLicenses, normalizedLines } =
    params;

  const userMode = (body.userMode ?? "single").trim() === "multiple" ? "multiple" : "single";

  return {
    applicationCorrelationId,
    userMode,
    applicantName: body.applicantName.trim(),
    employeeNumber: body.employeeNumber.trim(),
    companyName: body.companyName.trim(),
    departmentName: body.departmentName.trim(),
    address: body.address.trim(),
    applicantJobTitle: (body.applicantJobTitle ?? "").trim(),
    applicantEmail: (body.applicantEmail ?? "").trim(),
    applicantPhone: (body.applicantPhone ?? "").trim(),
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
    deliverySameAsUser: body.deliverySameAsUser ?? false,
    deliveryEmployeeNumber: (body.deliveryEmployeeNumber ?? "").trim(),
    deliveryName: (body.deliveryName ?? "").trim(),
    deliveryCompanyName: (body.deliveryCompanyName ?? "").trim(),
    deliveryDepartment: (body.deliveryDepartment ?? "").trim(),
    deliveryArea: (body.deliveryArea ?? "").trim(),
    deliveryPostalCode: (body.deliveryPostalCode ?? "").trim(),
    deliveryAddress: (body.deliveryAddress ?? "").trim(),
    deliveryBuilding: (body.deliveryBuilding ?? "").trim(),
    deliveryEmail: (body.deliveryEmail ?? "").trim(),
    deliveryPhone: (body.deliveryPhone ?? "").trim(),
    userStaffCategory: representative.userStaffCategory,
    decisionContractType: representative.decisionContractType,
    decisionWorkContent: representative.decisionWorkContent,
    decisionClientEnv: representative.decisionClientEnv,
    licenseTechnoProApply: representative.licenseTechnoProApply,
    licenseUserSoftwareInstall: representative.licenseUserSoftwareInstall,
    licenseTechnoProNetwork: representative.licenseTechnoProNetwork,
    licenseSpecCode: representative.licenseSpecCode,
    smartphoneCameraPresence: (representative.smartphoneCameraPresence ?? body.smartphoneCameraPresence ?? "").trim(),
    smartphoneUserIdentification: (representative.smartphoneUserIdentification ?? body.smartphoneUserIdentification ?? "").trim(),
    smartphoneWorkplaceUse: (representative.smartphoneWorkplaceUse ?? body.smartphoneWorkplaceUse ?? "").trim(),
    peripheralMonitorSize: (representative.peripheralMonitorSize ?? body.peripheralMonitorSize ?? "").trim(),
    peripheralMonitorSizeCustom: (representative.peripheralMonitorSizeCustom ?? body.peripheralMonitorSizeCustom ?? "").trim(),
    peripheralLanCableLength: (representative.peripheralLanCableLength ?? body.peripheralLanCableLength ?? "").trim(),
    peripheralLanCableLengthCustom: (representative.peripheralLanCableLengthCustom ?? body.peripheralLanCableLengthCustom ?? "").trim(),
    lendingStartDate: lendingStart,
    expectedReturnDate: expectedReturn,
    requestReason: body.requestReason.trim(),
    requestDetail,
    lines: {
      create: normalizedLines.map((line, sortOrder) => ({
        equipmentType: line.equipmentType,
        sortOrder,
        assignedUserEmployeeNumber: line.assignedUserEmployeeNumber,
      })),
    },
    ...(userMode === "multiple" && (body.additionalUsers?.length ?? 0) > 0
      ? {
          additionalUsers: {
            create: body.additionalUsers!.map((u, sortOrder) => ({
              sortOrder,
              userName: u.userName.trim(),
              userEmployeeNumber: u.userEmployeeNumber.trim(),
              userCompanyName: (u.userCompanyName ?? "").trim(),
              userDepartmentName: (u.userDepartmentName ?? "").trim(),
              userAddress: (u.userAddress ?? "").trim(),
              userContractType: (u.userContractType ?? "").trim(),
              userCostDeptName: (u.userCostDeptName ?? "").trim(),
              userCostDeptCode: (u.userCostDeptCode ?? "").trim(),
              userEmail: (u.userEmail ?? "").trim(),
              userPhone: (u.userPhone ?? "").trim(),
            })),
          },
        }
      : {}),
    ...(userLicenses.length > 0
      ? {
          userLicenses: {
            create: userLicenses.map((lic) => ({
              userEmployeeNumber: lic.userEmployeeNumber,
              userStaffCategory: lic.userStaffCategory,
              decisionContractType: lic.decisionContractType,
              decisionWorkContent: lic.decisionWorkContent,
              decisionClientEnv: lic.decisionClientEnv,
              msOfficeEdition: lic.msOfficeEdition,
              licenseTechnoProApply: lic.licenseTechnoProApply,
              licenseUserSoftwareInstall: lic.licenseUserSoftwareInstall,
              licenseTechnoProNetwork: lic.licenseTechnoProNetwork,
              licenseSpecCode: lic.licenseSpecCode,
              lendingStartDate: lic.lendingStartDate
                ? new Date(lic.lendingStartDate + "T00:00:00.000Z")
                : undefined,
              expectedReturnDate: lic.expectedReturnDate
                ? new Date(lic.expectedReturnDate + "T00:00:00.000Z")
                : undefined,
              smartphoneCameraPresence: lic.smartphoneCameraPresence,
              smartphoneUserIdentification: lic.smartphoneUserIdentification,
              smartphoneWorkplaceUse: lic.smartphoneWorkplaceUse,
              peripheralMonitorSize: lic.peripheralMonitorSize,
              peripheralMonitorSizeCustom: lic.peripheralMonitorSizeCustom,
              peripheralLanCableLength: lic.peripheralLanCableLength,
              peripheralLanCableLengthCustom: lic.peripheralLanCableLengthCustom,
            })),
          },
        }
      : {}),
  };
}

export function licenseMapFromResolved(licenses: ResolvedUserLicense[]): Map<string, ResolvedUserLicense> {
  return new Map(licenses.map((l) => [l.userEmployeeNumber, l]));
}

export function normalizedLinesFromBody(body: CreateLendingBody): Array<{
  equipmentType: string;
  assignedUserEmployeeNumber: string;
}> {
  const rep = body.userEmployeeNumber.trim();
  return body.lines.map((line) => ({
    equipmentType: line.equipmentType.trim(),
    assignedUserEmployeeNumber: lineAssigneeEmployeeNumber(line, rep),
  }));
}
