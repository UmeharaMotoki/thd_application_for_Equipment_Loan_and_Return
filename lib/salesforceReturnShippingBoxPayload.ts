import { randomUuid } from "@/lib/randomUuid";
import { RETURN_SHIPPING_BOX_REQUEST_KIND } from "@/lib/returnShippingBoxConstants";

export type SalesforceReturnShippingBoxFlags = {
  salesforceFormVariant: "RETURN_SHIPPING_BOX_REQUEST";
  salesforceApiPlaceholder: "POST_TBD_SF_RETURN_SHIPPING_BOX_REQUEST";
};

export type ReturnShippingBoxApplicantBlock = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
};

export type ReturnShippingBoxUserBlock = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
};

export type ReturnShippingBoxLineInput = {
  id: string;
  sortOrder: number;
  equipmentCode: string;
  equipmentLabel: string;
  assetManagementNumber: string;
  accessories: string[];
  lendingDueDate: string;
  expectedReturnDate: string;
};

export type SalesforceReturnShippingBoxPayload = {
  schemaVersion: 1;
  kind: typeof RETURN_SHIPPING_BOX_REQUEST_KIND;
  applicationCorrelationId: string;
  equipmentReturnRequestId: string;
  shippingBoxRequestId: string;
  shippingBoxRequestLineId: string;
  lineSortOrder: number;
  flags: SalesforceReturnShippingBoxFlags;
  source: {
    triggeredBy: "equipment-return-shipping-box-none";
    parentEquipmentReturnRequestId: string;
    parentEquipmentReturnLineId: string;
  };
  applicant: ReturnShippingBoxApplicantBlock;
  user: ReturnShippingBoxUserBlock;
  /** 梱包箱の送付先（利用者住所） */
  delivery: {
    recipientName: string;
    recipientEmployeeNumber: string;
    companyName: string;
    departmentName: string;
    address: string;
  };
  returnEquipment: {
    equipmentCode: string;
    equipmentLabel: string;
    assetManagementNumber: string;
    lendingDueDate: string;
    expectedReturnDate: string;
    accessories: string[];
  };
  returnContext: {
    requestReason: string;
    requestDetail: string;
  };
};

const SF_FLAGS: SalesforceReturnShippingBoxFlags = {
  salesforceFormVariant: "RETURN_SHIPPING_BOX_REQUEST",
  salesforceApiPlaceholder: "POST_TBD_SF_RETURN_SHIPPING_BOX_REQUEST",
};

export function buildSalesforceReturnShippingBoxPayloads(params: {
  applicationCorrelationId: string;
  equipmentReturnRequestId: string;
  shippingBoxRequestId: string;
  applicant: ReturnShippingBoxApplicantBlock;
  user: ReturnShippingBoxUserBlock;
  requestReason: string;
  requestDetail: string;
  lines: ReturnShippingBoxLineInput[];
}): SalesforceReturnShippingBoxPayload[] {
  const {
    applicationCorrelationId,
    equipmentReturnRequestId,
    shippingBoxRequestId,
    applicant,
    user,
    requestReason,
    requestDetail,
    lines,
  } = params;

  const delivery = {
    recipientName: user.userName.trim(),
    recipientEmployeeNumber: user.userEmployeeNumber.trim(),
    companyName: user.userCompanyName.trim(),
    departmentName: user.userDepartmentName.trim(),
    address: user.userAddress.trim(),
  };

  const sorted = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);

  return sorted.map((line) => ({
    schemaVersion: 1,
    kind: RETURN_SHIPPING_BOX_REQUEST_KIND,
    applicationCorrelationId,
    equipmentReturnRequestId,
    shippingBoxRequestId,
    shippingBoxRequestLineId: line.id,
    lineSortOrder: line.sortOrder,
    flags: SF_FLAGS,
    source: {
      triggeredBy: "equipment-return-shipping-box-none",
      parentEquipmentReturnRequestId: equipmentReturnRequestId,
      parentEquipmentReturnLineId: line.id,
    },
    applicant: {
      applicantName: applicant.applicantName.trim(),
      employeeNumber: applicant.employeeNumber.trim(),
      companyName: applicant.companyName.trim(),
      departmentName: applicant.departmentName.trim(),
      address: applicant.address.trim(),
    },
    user: {
      userName: user.userName.trim(),
      userEmployeeNumber: user.userEmployeeNumber.trim(),
      userCompanyName: user.userCompanyName.trim(),
      userDepartmentName: user.userDepartmentName.trim(),
      userAddress: user.userAddress.trim(),
      userContractType: user.userContractType.trim(),
    },
    delivery,
    returnEquipment: {
      equipmentCode: line.equipmentCode.trim(),
      equipmentLabel: line.equipmentLabel.trim(),
      assetManagementNumber: line.assetManagementNumber.trim(),
      lendingDueDate: line.lendingDueDate.trim(),
      expectedReturnDate: line.expectedReturnDate.trim(),
      accessories: line.accessories.map((a) => a.trim()).filter(Boolean),
    },
    returnContext: {
      requestReason: requestReason.trim(),
      requestDetail: requestDetail.trim(),
    },
  }));
}

export function newShippingBoxRequestLineId(): string {
  return randomUuid();
}

export function newShippingBoxRequestId(): string {
  return randomUuid();
}
