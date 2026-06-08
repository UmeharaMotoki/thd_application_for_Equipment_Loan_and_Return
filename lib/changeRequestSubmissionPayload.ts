import { randomUuid } from "@/lib/randomUuid";
import {
  CHANGE_KIND_LABELS,
  requiresAccountingAttachment,
  type ChangeRequestKind,
} from "@/lib/changeRequestConstants";
import type { ChangeRequestApplicantData, ChangeRequestUserProfile } from "@/lib/changeRequestFormTypes";
import {
  buildSalesforceChangeRequestPayloads,
  type SalesforceChangeRequestAttachmentRef,
  type SalesforcePerEquipmentChangePayload,
} from "@/lib/salesforceChangeRequestPayload";

export const CHANGE_REQUEST_JSON_SCHEMA_VERSION = 2;

export type ChangeRequestUserSnapshot = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userDepartmentCode: string;
  userCostDeptName: string;
  userCostDeptCode: string;
};

export type ChangeRequestAttachmentPreview = {
  originalFileName: string;
  sizeBytes: number;
};

export type ChangeRequestSubmissionPayload = {
  schemaVersion: typeof CHANGE_REQUEST_JSON_SCHEMA_VERSION;
  kind: "change-request";
  savedAt: string;
  applicationCorrelationId: string;
  changeRequestId: string;
  persistReason?: "json-mode" | "db-fallback" | "db-with-json-audit";
  storageNote?: string;

  changeKind: ChangeRequestKind;
  changeKindLabel: string;

  applicant: ChangeRequestApplicantData;

  currentUser: ChangeRequestUserSnapshot;
  newUser: ChangeRequestUserSnapshot;

  equipmentTypes: string[];

  periodExtension: {
    currentEndDate: string;
    newEndDate: string;
  } | null;

  costDeptChange: {
    assetAmountYen: number;
    requiresAccountingApproval: boolean;
    accountingAttachments: ChangeRequestAttachmentPreview[];
  } | null;

  flags: {
    deptAndCostDeptWarning: boolean;
  };

  /** Salesforce ITサービス依頼連携用（対象機器種別ごとに 1 件） */
  salesforcePayloadsByEquipmentType: SalesforcePerEquipmentChangePayload[];

  /** 下流連携・監査用（POST ボディ相当） */
  clientRequest: Record<string, unknown>;
};

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

export type BuildChangeRequestSubmissionInput = {
  applicant: ChangeRequestApplicantData;
  changeKind: ChangeRequestKind;
  currentUser: ChangeRequestUserProfile;
  newUser: ChangeRequestUserProfile;
  equipmentTypes: string[];
  assetAmountYen: number | null;
  periodExtensionCurrentEndDate: string;
  periodExtensionNewEndDate: string;
  accountingAttachmentPreviews: ChangeRequestAttachmentPreview[];
  deptAndCostDeptWarning: boolean;
  applicationCorrelationId?: string;
  changeRequestId?: string;
  savedAt?: string;
  persistReason?: ChangeRequestSubmissionPayload["persistReason"];
  storageNote?: string;
  equipmentLines?: Array<{ id: string; equipmentType: string; sortOrder: number }>;
  storedAttachments?: Array<{
    storedFileName: string;
    originalFileName: string;
    relativePath: string;
    sizeBytes: number;
  }>;
};

export function buildChangeRequestClientRequest(input: BuildChangeRequestSubmissionInput) {
  const includesCostDept =
    input.changeKind === "cost_dept_change" || input.changeKind === "both";
  const isPeriodExtension = input.changeKind === "period_extension";

  return {
    applicantName: input.applicant.applicantName.trim(),
    employeeNumber: input.applicant.employeeNumber.trim(),
    companyName: input.applicant.companyName.trim(),
    departmentName: input.applicant.departmentName.trim(),
    address: input.applicant.address.trim(),
    applicantJobTitle: input.applicant.applicantJobTitle.trim(),
    applicantEmail: input.applicant.applicantEmail.trim(),
    applicantPhone: input.applicant.applicantPhone.trim(),
    changeKind: input.changeKind,
    currentUser: toUserSnapshot(input.currentUser),
    newUser: toUserSnapshot(input.newUser),
    equipmentTypes: input.equipmentTypes,
    assetAmountYen: includesCostDept ? input.assetAmountYen : null,
    periodExtensionCurrentEndDate: isPeriodExtension ? input.periodExtensionCurrentEndDate : "",
    periodExtensionNewEndDate: isPeriodExtension ? input.periodExtensionNewEndDate : "",
    applicationCorrelationId: input.applicationCorrelationId,
    flags: {
      deptAndCostDeptWarning: input.deptAndCostDeptWarning,
    },
  };
}

export function buildChangeRequestSubmissionPayload(
  input: BuildChangeRequestSubmissionInput,
): ChangeRequestSubmissionPayload {
  const changeKind = input.changeKind;
  const includesCostDept = changeKind === "cost_dept_change" || changeKind === "both";
  const isPeriodExtension = changeKind === "period_extension";
  const assetAmountYen = includesCostDept ? input.assetAmountYen : null;
  const requiresApproval = requiresAccountingAttachment(assetAmountYen);

  const clientRequest = buildChangeRequestClientRequest(input);

  const accountingAttachmentsForSf: SalesforceChangeRequestAttachmentRef[] =
    input.storedAttachments && input.storedAttachments.length > 0
      ? input.storedAttachments.map((a) => ({
          originalFileName: a.originalFileName,
          sizeBytes: a.sizeBytes,
          storedFileName: a.storedFileName,
          relativePath: a.relativePath,
        }))
      : input.accountingAttachmentPreviews.map((a) => ({
          originalFileName: a.originalFileName,
          sizeBytes: a.sizeBytes,
        }));

  const salesforcePayloadsByEquipmentType = buildSalesforceChangeRequestPayloads({
    applicationCorrelationId: input.applicationCorrelationId?.trim() || randomUuid(),
    changeRequestId: input.changeRequestId ?? randomUuid(),
    changeKind,
    applicant: input.applicant,
    currentUser: input.currentUser,
    newUser: input.newUser,
    equipmentTypes: input.equipmentTypes,
    assetAmountYen,
    periodExtensionCurrentEndDate: input.periodExtensionCurrentEndDate,
    periodExtensionNewEndDate: input.periodExtensionNewEndDate,
    deptAndCostDeptWarning: input.deptAndCostDeptWarning,
    accountingAttachments: accountingAttachmentsForSf,
    equipmentLines: input.equipmentLines,
  });

  return {
    schemaVersion: CHANGE_REQUEST_JSON_SCHEMA_VERSION,
    kind: "change-request",
    savedAt: input.savedAt ?? new Date().toISOString(),
    applicationCorrelationId: input.applicationCorrelationId?.trim() || randomUuid(),
    changeRequestId: input.changeRequestId ?? randomUuid(),
    persistReason: input.persistReason,
    storageNote: input.storageNote,
    changeKind,
    changeKindLabel: CHANGE_KIND_LABELS[changeKind],
    applicant: {
      applicantName: input.applicant.applicantName.trim(),
      employeeNumber: input.applicant.employeeNumber.trim(),
      companyName: input.applicant.companyName.trim(),
      departmentName: input.applicant.departmentName.trim(),
      address: input.applicant.address.trim(),
      applicantJobTitle: input.applicant.applicantJobTitle.trim(),
      applicantEmail: input.applicant.applicantEmail.trim(),
      applicantPhone: input.applicant.applicantPhone.trim(),
    },
    currentUser: toUserSnapshot(input.currentUser),
    newUser: toUserSnapshot(input.newUser),
    equipmentTypes: [...input.equipmentTypes],
    periodExtension: isPeriodExtension
      ? {
          currentEndDate: input.periodExtensionCurrentEndDate,
          newEndDate: input.periodExtensionNewEndDate,
        }
      : null,
    costDeptChange: includesCostDept
      ? {
          assetAmountYen: assetAmountYen ?? 0,
          requiresAccountingApproval: requiresApproval,
          accountingAttachments: input.accountingAttachmentPreviews,
        }
      : null,
    flags: {
      deptAndCostDeptWarning: input.deptAndCostDeptWarning,
    },
    salesforcePayloadsByEquipmentType,
    clientRequest,
  };
}
