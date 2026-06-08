import { randomUuid } from "@/lib/randomUuid";
import {
  CHANGE_KIND_LABELS,
  requiresAccountingAttachment,
  type ChangeRequestKind,
} from "@/lib/changeRequestConstants";
import type { ChangeRequestUserSnapshot } from "@/lib/changeRequestSubmissionPayload";
import type { ChangeRequestApplicantData, ChangeRequestUserProfile } from "@/lib/changeRequestFormTypes";
import {
  EQUIPMENT_CATEGORY_MAP,
  type EquipmentCategory,
  type LendingEquipmentTypeOption,
} from "@/lib/lendingEquipmentOptions";

/** 変更種別×機器カテゴリごとの SF 連携出し分け用フラグ（仮・仕様確定後に差し替え） */
export type SalesforceChangeRequestFormVariant =
  | "CHANGE_REQUEST_USER_CHANGE"
  | "CHANGE_REQUEST_COST_DEPT_CHANGE"
  | "CHANGE_REQUEST_BOTH"
  | "CHANGE_REQUEST_PERIOD_EXTENSION";

export type SalesforceChangeRequestApiPlaceholder =
  | "POST_TBD_SF_CHANGE_REQUEST_USER_CHANGE"
  | "POST_TBD_SF_CHANGE_REQUEST_COST_DEPT_CHANGE"
  | "POST_TBD_SF_CHANGE_REQUEST_BOTH"
  | "POST_TBD_SF_CHANGE_REQUEST_PERIOD_EXTENSION";

export type SalesforceChangeRequestEquipmentFlags = {
  changeKind: ChangeRequestKind;
  equipmentCategory: EquipmentCategory;
  salesforceFormVariant: SalesforceChangeRequestFormVariant;
  salesforceApiPlaceholder: SalesforceChangeRequestApiPlaceholder;
  includePcPayloadSlice: boolean;
  includeCommunicationPayloadSlice: boolean;
  includePeripheralPayloadSlice: boolean;
};

export type SalesforceChangeRequestAttachmentRef = {
  originalFileName: string;
  sizeBytes: number;
  storedFileName?: string;
  relativePath?: string;
};

export type SalesforcePerEquipmentChangePayload = {
  schemaVersion: 1;
  applicationCorrelationId: string;
  changeRequestId: string;
  changeRequestEquipmentLineId: string;
  equipmentSortOrder: number;
  equipmentType: string;
  changeKind: ChangeRequestKind;
  changeKindLabel: string;
  flags: SalesforceChangeRequestEquipmentFlags;
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
  currentUser: ChangeRequestUserSnapshot;
  newUser: ChangeRequestUserSnapshot;
  /** 使用者変更または両方のときのみ */
  userChange: {
    deptAndCostDeptWarning: boolean;
  } | null;
  /** 経費負担部門変更または両方のときのみ */
  costDeptChange: {
    assetAmountYen: number;
    requiresAccountingApproval: boolean;
    accountingAttachments: SalesforceChangeRequestAttachmentRef[];
  } | null;
  /** 期間延長のときのみ */
  periodExtension: {
    currentEndDate: string;
    newEndDate: string;
  } | null;
};

function categoryForEquipmentType(equipmentType: string): EquipmentCategory {
  const t = equipmentType.trim();
  if (t in EQUIPMENT_CATEGORY_MAP) {
    return EQUIPMENT_CATEGORY_MAP[t as LendingEquipmentTypeOption];
  }
  return "peripheral";
}

function formVariantForChangeKind(changeKind: ChangeRequestKind): SalesforceChangeRequestFormVariant {
  switch (changeKind) {
    case "user_change":
      return "CHANGE_REQUEST_USER_CHANGE";
    case "cost_dept_change":
      return "CHANGE_REQUEST_COST_DEPT_CHANGE";
    case "both":
      return "CHANGE_REQUEST_BOTH";
    case "period_extension":
      return "CHANGE_REQUEST_PERIOD_EXTENSION";
  }
}

function apiPlaceholderForChangeKind(
  changeKind: ChangeRequestKind,
): SalesforceChangeRequestApiPlaceholder {
  switch (changeKind) {
    case "user_change":
      return "POST_TBD_SF_CHANGE_REQUEST_USER_CHANGE";
    case "cost_dept_change":
      return "POST_TBD_SF_CHANGE_REQUEST_COST_DEPT_CHANGE";
    case "both":
      return "POST_TBD_SF_CHANGE_REQUEST_BOTH";
    case "period_extension":
      return "POST_TBD_SF_CHANGE_REQUEST_PERIOD_EXTENSION";
  }
}

function flagsForEquipment(
  changeKind: ChangeRequestKind,
  category: EquipmentCategory,
): SalesforceChangeRequestEquipmentFlags {
  const formVariant = formVariantForChangeKind(changeKind);
  return {
    changeKind,
    equipmentCategory: category,
    salesforceFormVariant: formVariant,
    salesforceApiPlaceholder: apiPlaceholderForChangeKind(changeKind),
    includePcPayloadSlice: category === "pc",
    includeCommunicationPayloadSlice: category === "communication",
    includePeripheralPayloadSlice: category === "peripheral",
  };
}

function toUserSnapshot(user: ChangeRequestUserProfile): ChangeRequestUserSnapshot {
  return {
    userName: user.userName.trim(),
    userEmployeeNumber: user.userEmployeeNumber.trim(),
    userCompanyName: user.userCompanyName.trim(),
    userDepartmentName: user.userDepartmentName.trim(),
    userDepartmentCode: user.userDepartmentCode.trim(),
    userCostDeptName: user.userCostDeptName.trim(),
    userCostDeptCode: user.userCostDeptCode.trim(),
  };
}

export function buildSalesforceChangeRequestPayloads(params: {
  applicationCorrelationId: string;
  changeRequestId: string;
  changeKind: ChangeRequestKind;
  applicant: ChangeRequestApplicantData;
  currentUser: ChangeRequestUserProfile;
  newUser: ChangeRequestUserProfile;
  equipmentTypes: string[];
  assetAmountYen: number | null;
  periodExtensionCurrentEndDate: string;
  periodExtensionNewEndDate: string;
  deptAndCostDeptWarning: boolean;
  accountingAttachments: SalesforceChangeRequestAttachmentRef[];
  equipmentLines?: Array<{ id: string; equipmentType: string; sortOrder: number }>;
}): SalesforcePerEquipmentChangePayload[] {
  const {
    applicationCorrelationId,
    changeRequestId,
    changeKind,
    applicant,
    currentUser,
    newUser,
    equipmentTypes,
    assetAmountYen,
    periodExtensionCurrentEndDate,
    periodExtensionNewEndDate,
    deptAndCostDeptWarning,
    accountingAttachments,
  } = params;

  const includesUserChange = changeKind === "user_change" || changeKind === "both";
  const includesCostDept = changeKind === "cost_dept_change" || changeKind === "both";
  const isPeriodExtension = changeKind === "period_extension";
  const requiresApproval = requiresAccountingAttachment(assetAmountYen);

  const userChangeContext = includesUserChange
    ? { deptAndCostDeptWarning }
    : null;

  const costDeptChangeContext = includesCostDept
    ? {
        assetAmountYen: assetAmountYen ?? 0,
        requiresAccountingApproval: requiresApproval,
        accountingAttachments,
      }
    : null;

  const periodExtensionContext = isPeriodExtension
    ? {
        currentEndDate: periodExtensionCurrentEndDate.trim(),
        newEndDate: periodExtensionNewEndDate.trim(),
      }
    : null;

  const applicantBlock = {
    applicantName: applicant.applicantName.trim(),
    employeeNumber: applicant.employeeNumber.trim(),
    companyName: applicant.companyName.trim(),
    departmentName: applicant.departmentName.trim(),
    address: applicant.address.trim(),
    applicantJobTitle: applicant.applicantJobTitle.trim(),
    applicantEmail: applicant.applicantEmail.trim(),
    applicantPhone: applicant.applicantPhone.trim(),
  };

  const lines =
    params.equipmentLines ??
    equipmentTypes.map((equipmentType, sortOrder) => ({
      id: randomUuid(),
      equipmentType,
      sortOrder,
    }));

  const sorted = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);

  return sorted.map((line) => {
    const equipmentType = line.equipmentType.trim();
    const category = categoryForEquipmentType(equipmentType);
    const flags = flagsForEquipment(changeKind, category);

    return {
      schemaVersion: 1,
      applicationCorrelationId,
      changeRequestId,
      changeRequestEquipmentLineId: line.id,
      equipmentSortOrder: line.sortOrder,
      equipmentType,
      changeKind,
      changeKindLabel: CHANGE_KIND_LABELS[changeKind],
      flags,
      applicant: applicantBlock,
      currentUser: toUserSnapshot(currentUser),
      newUser: toUserSnapshot(newUser),
      userChange: userChangeContext,
      costDeptChange: costDeptChangeContext,
      periodExtension: periodExtensionContext,
    };
  });
}
