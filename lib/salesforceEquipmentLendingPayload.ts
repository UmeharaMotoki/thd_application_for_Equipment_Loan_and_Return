import type { z } from "zod";
import {
  EQUIPMENT_CATEGORY_MAP,
  type EquipmentCategory,
  type LendingEquipmentTypeOption,
} from "@/lib/lendingEquipmentOptions";
import { createLendingRequestSchema } from "@/lib/validators";

export type CreateLendingBody = z.infer<typeof createLendingRequestSchema>;

/** 機器行ごとのセールスフォース連携出し分け用フラグ（仮・仕様確定後に差し替え） */
export type SalesforceEquipmentLineFlags = {
  equipmentCategory: EquipmentCategory;
  /** フォーム／オブジェクト種別（プレースホルダ） */
  salesforceFormVariant:
    | "EQUIPMENT_LENDING_PC"
    | "EQUIPMENT_LENDING_COMMUNICATION"
    | "EQUIPMENT_LENDING_PERIPHERAL";
  /** 想定エンドポイント区分（プレースホルダ） */
  salesforceApiPlaceholder:
    | "POST_TBD_SF_EQUIPMENT_LENDING_PC"
    | "POST_TBD_SF_EQUIPMENT_LENDING_COMMUNICATION"
    | "POST_TBD_SF_EQUIPMENT_LENDING_PERIPHERAL";
  /** 当行のカテゴリに応じて同梱するコンテキスト */
  includePcPayloadSlice: boolean;
  includeCommunicationPayloadSlice: boolean;
  includePeripheralPayloadSlice: boolean;
};

function flagsForCategory(category: EquipmentCategory): SalesforceEquipmentLineFlags {
  switch (category) {
    case "pc":
      return {
        equipmentCategory: "pc",
        salesforceFormVariant: "EQUIPMENT_LENDING_PC",
        salesforceApiPlaceholder: "POST_TBD_SF_EQUIPMENT_LENDING_PC",
        includePcPayloadSlice: true,
        includeCommunicationPayloadSlice: false,
        includePeripheralPayloadSlice: false,
      };
    case "communication":
      return {
        equipmentCategory: "communication",
        salesforceFormVariant: "EQUIPMENT_LENDING_COMMUNICATION",
        salesforceApiPlaceholder: "POST_TBD_SF_EQUIPMENT_LENDING_COMMUNICATION",
        includePcPayloadSlice: false,
        includeCommunicationPayloadSlice: true,
        includePeripheralPayloadSlice: false,
      };
    case "peripheral":
      return {
        equipmentCategory: "peripheral",
        salesforceFormVariant: "EQUIPMENT_LENDING_PERIPHERAL",
        salesforceApiPlaceholder: "POST_TBD_SF_EQUIPMENT_LENDING_PERIPHERAL",
        includePcPayloadSlice: false,
        includeCommunicationPayloadSlice: false,
        includePeripheralPayloadSlice: true,
      };
  }
}

function categoryForEquipmentType(equipmentType: string): EquipmentCategory {
  const t = equipmentType.trim();
  if (t in EQUIPMENT_CATEGORY_MAP) {
    return EQUIPMENT_CATEGORY_MAP[t as LendingEquipmentTypeOption];
  }
  return "peripheral";
}

export type SalesforcePerLinePayload = {
  schemaVersion: 1;
  applicationCorrelationId: string;
  equipmentRequestId: string;
  equipmentLendingLineId: string;
  lineSortOrder: number;
  equipmentType: string;
  flags: SalesforceEquipmentLineFlags;
  applicant: {
    applicantName: string;
    employeeNumber: string;
    companyName: string;
    departmentName: string;
    address: string;
    applicantJobTitle: string;
    applicantEmail: string;
    applicantPhone: string;
  };
  user: {
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
    userStaffCategory: string;
  };
  delivery: {
    deliveryName: string;
    deliveryCompanyName: string;
    deliveryDepartment: string;
    deliveryArea: string;
    deliveryPostalCode: string;
    deliveryAddress: string;
    deliveryBuilding: string;
    deliveryEmail: string;
    deliveryPhone: string;
  };
  schedule: {
    lendingStartDate: string;
    expectedReturnDate: string;
    requestReason: string;
    requestDetail: string;
  };
  /** 当申請にPCが含まれる場合のみ意味を持つスライス（行がPCのとき flags.includePcPayloadSlice が true） */
  pcContext: null | {
    decisionContractType: string;
    decisionWorkContent: string;
    decisionClientEnv: string;
    msOfficeEdition: string;
    licenseTechnoProApply: string;
    licenseUserSoftwareInstall: string;
    licenseTechnoProNetwork: string;
    licenseSpecCode: string;
  };
  /** 通信機器行向け */
  communicationContext: null | {
    smartphoneCameraPresence: string;
    smartphoneUserIdentification: string;
    smartphoneWorkplaceUse: string;
  };
  /** 周辺機器行向け */
  peripheralContext: null | {
    peripheralMonitorSize: string;
    peripheralMonitorSizeCustom: string;
    peripheralLanCableLength: string;
    peripheralLanCableLengthCustom: string;
  };
};

export function buildSalesforcePerLinePayloads(params: {
  applicationCorrelationId: string;
  equipmentRequestId: string;
  lines: Array<{ id: string; equipmentType: string; sortOrder: number }>;
  body: CreateLendingBody;
  includesPc: boolean;
  userStaffCategoryOut: string;
  decisionContractTypeOut: string;
  decisionWorkContentOut: string;
  decisionClientEnvOut: string;
  licenseTechnoProApply: string;
  licenseUserSoftwareInstall: string;
  licenseTechnoProNetwork: string;
  licenseSpecCode: string;
}): SalesforcePerLinePayload[] {
  const {
    applicationCorrelationId,
    equipmentRequestId,
    lines,
    body,
    includesPc,
    userStaffCategoryOut,
    decisionContractTypeOut,
    decisionWorkContentOut,
    decisionClientEnvOut,
    licenseTechnoProApply,
    licenseUserSoftwareInstall,
    licenseTechnoProNetwork,
    licenseSpecCode,
  } = params;

  const pcContextForRequest =
    includesPc && userStaffCategoryOut.trim() !== ""
      ? {
          decisionContractType: decisionContractTypeOut,
          decisionWorkContent: decisionWorkContentOut,
          decisionClientEnv: decisionClientEnvOut,
          msOfficeEdition: (body.msOfficeEdition ?? "").trim(),
          licenseTechnoProApply,
          licenseUserSoftwareInstall,
          licenseTechnoProNetwork,
          licenseSpecCode,
        }
      : null;

  const communicationContextForRequest = {
    smartphoneCameraPresence: (body.smartphoneCameraPresence ?? "").trim(),
    smartphoneUserIdentification: (body.smartphoneUserIdentification ?? "").trim(),
    smartphoneWorkplaceUse: (body.smartphoneWorkplaceUse ?? "").trim(),
  };

  const peripheralContextForRequest = {
    peripheralMonitorSize: (body.peripheralMonitorSize ?? "").trim(),
    peripheralMonitorSizeCustom: (body.peripheralMonitorSizeCustom ?? "").trim(),
    peripheralLanCableLength: (body.peripheralLanCableLength ?? "").trim(),
    peripheralLanCableLengthCustom: (body.peripheralLanCableLengthCustom ?? "").trim(),
  };

  const sorted = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);

  return sorted.map((line) => {
    const category = categoryForEquipmentType(line.equipmentType);
    const flags = flagsForCategory(category);

    return {
      schemaVersion: 1,
      applicationCorrelationId,
      equipmentRequestId,
      equipmentLendingLineId: line.id,
      lineSortOrder: line.sortOrder,
      equipmentType: line.equipmentType.trim(),
      flags,
      applicant: {
        applicantName: body.applicantName.trim(),
        employeeNumber: body.employeeNumber.trim(),
        companyName: body.companyName.trim(),
        departmentName: body.departmentName.trim(),
        address: body.address.trim(),
        applicantJobTitle: (body.applicantJobTitle ?? "").trim(),
        applicantEmail: (body.applicantEmail ?? "").trim(),
        applicantPhone: (body.applicantPhone ?? "").trim(),
      },
      user: {
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
        userStaffCategory: userStaffCategoryOut,
      },
      delivery: {
        deliveryName: (body.deliveryName ?? "").trim(),
        deliveryCompanyName: (body.deliveryCompanyName ?? "").trim(),
        deliveryDepartment: (body.deliveryDepartment ?? "").trim(),
        deliveryArea: (body.deliveryArea ?? "").trim(),
        deliveryPostalCode: (body.deliveryPostalCode ?? "").trim(),
        deliveryAddress: (body.deliveryAddress ?? "").trim(),
        deliveryBuilding: (body.deliveryBuilding ?? "").trim(),
        deliveryEmail: (body.deliveryEmail ?? "").trim(),
        deliveryPhone: (body.deliveryPhone ?? "").trim(),
      },
      schedule: {
        lendingStartDate: body.lendingStartDate.trim(),
        expectedReturnDate: body.expectedReturnDate.trim(),
        requestReason: body.requestReason.trim(),
        requestDetail: (body.requestDetail ?? "").trim(),
      },
      pcContext: flags.includePcPayloadSlice ? pcContextForRequest : null,
      communicationContext: flags.includeCommunicationPayloadSlice
        ? communicationContextForRequest
        : null,
      peripheralContext: flags.includePeripheralPayloadSlice
        ? peripheralContextForRequest
        : null,
    };
  });
}
