import type { z } from "zod";
import {
  buildSalesforceReturnShippingBoxPayloads,
  type ReturnShippingBoxApplicantBlock,
  type ReturnShippingBoxLineInput,
  type ReturnShippingBoxUserBlock,
  type SalesforceReturnShippingBoxPayload,
} from "@/lib/salesforceReturnShippingBoxPayload";
import { RETURN_SHIPPING_BOX_REQUEST_KIND } from "@/lib/returnShippingBoxConstants";
import { lineNeedsShippingBoxRequest } from "@/lib/returnShippingBoxConstants";
import type { createEquipmentReturnRequestSchema } from "@/lib/validators";

export const RETURN_SHIPPING_BOX_JSON_SCHEMA_VERSION = 1;

export type ReturnShippingBoxSubmissionPayload = {
  schemaVersion: typeof RETURN_SHIPPING_BOX_JSON_SCHEMA_VERSION;
  kind: typeof RETURN_SHIPPING_BOX_REQUEST_KIND;
  savedAt: string;
  applicationCorrelationId: string;
  shippingBoxRequestId: string;
  equipmentReturnRequestId: string;
  persistReason?: "json-mode" | "db-fallback" | "db-with-json-audit";
  storageNote?: string;
  applicant: ReturnShippingBoxApplicantBlock;
  user: ReturnShippingBoxUserBlock;
  returnContext: {
    requestReason: string;
    requestDetail: string;
  };
  lines: Array<
    ReturnShippingBoxLineInput & {
      equipmentReturnLineId: string;
    }
  >;
  /** Salesforce ITサービス依頼連携用（梱包箱依頼行ごとに 1 件） */
  salesforcePayloadsByLine: SalesforceReturnShippingBoxPayload[];
};

type CreateReturnBody = z.infer<typeof createEquipmentReturnRequestSchema>;

export type EquipmentReturnLineWithId = {
  id: string;
  equipmentCode: string;
  equipmentLabel: string;
  assetManagementNumber: string;
  shippingBoxChoice: string;
  accessories: string[];
  otherDetail: string;
  equipmentName: string;
  lendingDueDate: string;
  expectedReturnDate: string;
  sortOrder: number;
};

export function filterLinesNeedingShippingBoxRequest(
  lines: EquipmentReturnLineWithId[],
): EquipmentReturnLineWithId[] {
  return lines.filter((line) =>
    lineNeedsShippingBoxRequest({
      equipmentCode: line.equipmentCode,
      shippingBoxChoice: line.shippingBoxChoice,
    }),
  );
}

export function buildReturnShippingBoxSubmissionPayload(args: {
  body: CreateReturnBody;
  equipmentReturnRequestId: string;
  applicationCorrelationId: string;
  shippingBoxRequestId: string;
  lines: EquipmentReturnLineWithId[];
  persistReason?: ReturnShippingBoxSubmissionPayload["persistReason"];
  storageNote?: string;
}): ReturnShippingBoxSubmissionPayload | null {
  const boxLines = filterLinesNeedingShippingBoxRequest(args.lines);
  if (boxLines.length === 0) return null;

  const applicant: ReturnShippingBoxApplicantBlock = {
    applicantName: args.body.applicantName.trim(),
    employeeNumber: args.body.employeeNumber.trim(),
    companyName: args.body.companyName.trim(),
    departmentName: args.body.departmentName.trim(),
    address: args.body.address.trim(),
  };

  const user: ReturnShippingBoxUserBlock = {
    userName: args.body.userName.trim(),
    userEmployeeNumber: args.body.userEmployeeNumber.trim(),
    userCompanyName: args.body.userCompanyName.trim(),
    userDepartmentName: args.body.userDepartmentName.trim(),
    userAddress: args.body.userAddress.trim(),
    userContractType: args.body.userContractType.trim(),
  };

  const lineInputs: ReturnShippingBoxSubmissionPayload["lines"] = boxLines.map((line) => ({
    id: line.id,
    equipmentReturnLineId: line.id,
    sortOrder: line.sortOrder,
    equipmentCode: line.equipmentCode,
    equipmentLabel: line.equipmentLabel,
    assetManagementNumber: line.assetManagementNumber,
    accessories: line.accessories,
    lendingDueDate: line.lendingDueDate,
    expectedReturnDate: line.expectedReturnDate,
  }));

  const salesforcePayloadsByLine = buildSalesforceReturnShippingBoxPayloads({
    applicationCorrelationId: args.applicationCorrelationId,
    equipmentReturnRequestId: args.equipmentReturnRequestId,
    shippingBoxRequestId: args.shippingBoxRequestId,
    applicant,
    user,
    requestReason: args.body.requestReason,
    requestDetail: args.body.requestDetail ?? "",
    lines: lineInputs,
  });

  return {
    schemaVersion: RETURN_SHIPPING_BOX_JSON_SCHEMA_VERSION,
    kind: RETURN_SHIPPING_BOX_REQUEST_KIND,
    savedAt: new Date().toISOString(),
    applicationCorrelationId: args.applicationCorrelationId,
    shippingBoxRequestId: args.shippingBoxRequestId,
    equipmentReturnRequestId: args.equipmentReturnRequestId,
    persistReason: args.persistReason,
    storageNote: args.storageNote,
    applicant,
    user,
    returnContext: {
      requestReason: args.body.requestReason.trim(),
      requestDetail: (args.body.requestDetail ?? "").trim(),
    },
    lines: lineInputs,
    salesforcePayloadsByLine,
  };
}
