import { z } from "zod";

const requiredString = z.string().trim().min(1);
const optionalString = z.string().trim().optional().default("");

export const lendingLineSchema = z.object({
  equipmentType: requiredString,
  assignedUserEmployeeNumber: optionalString,
});

export const additionalUserSchema = z.object({
  userName: requiredString,
  userEmployeeNumber: requiredString,
  userCompanyName: optionalString,
  userDepartmentName: optionalString,
  userAddress: optionalString,
  userContractType: optionalString,
  userStaffCategory: optionalString,
  userCostDeptName: optionalString,
  userCostDeptCode: optionalString,
  userEmail: optionalString,
  userPhone: optionalString,
  userHrEmployeeCategory: optionalString,
  userHrOccupationName: optionalString,
});

export const userLicenseSchema = z.object({
  userEmployeeNumber: requiredString,
  userStaffCategory: optionalString,
  decisionContractType: optionalString,
  decisionWorkContent: optionalString,
  decisionClientEnv: optionalString,
  msOfficeEdition: optionalString,
  lendingStartDate: requiredString,
  expectedReturnDate: requiredString,
  smartphoneCameraPresence: optionalString,
  smartphoneUserIdentification: optionalString,
  smartphoneWorkplaceUse: optionalString,
  peripheralMonitorSize: optionalString,
  peripheralMonitorSizeCustom: optionalString,
  peripheralLanCableLength: optionalString,
  peripheralLanCableLengthCustom: optionalString,
});

export const createLendingRequestSchema = z.object({
  applicantName: requiredString,
  employeeNumber: requiredString,
  companyName: requiredString,
  departmentName: requiredString,
  address: requiredString,
  applicantJobTitle: optionalString,
  applicantEmail: optionalString,
  applicantPhone: optionalString,
  userName: requiredString,
  userEmployeeNumber: requiredString,
  userCompanyName: requiredString,
  userDepartmentName: requiredString,
  userAddress: requiredString,
  userContractType: requiredString,
  userCostDeptName: optionalString,
  userCostDeptCode: optionalString,
  userEmail: optionalString,
  userPhone: optionalString,
  deliverySameAsUser: z.boolean().optional().default(false),
  deliveryEmployeeNumber: optionalString,
  deliveryName: optionalString,
  deliveryCompanyName: optionalString,
  deliveryDepartment: optionalString,
  deliveryArea: optionalString,
  deliveryPostalCode: optionalString,
  deliveryAddress: optionalString,
  deliveryBuilding: optionalString,
  deliveryEmail: optionalString,
  deliveryPhone: optionalString,
  userStaffCategory: requiredString,
  decisionContractType: optionalString,
  decisionWorkContent: optionalString,
  decisionClientEnv: optionalString,
  msOfficeEdition: optionalString,
  smartphoneCameraPresence: optionalString,
  smartphoneUserIdentification: optionalString,
  smartphoneWorkplaceUse: optionalString,
  peripheralMonitorSize: optionalString,
  peripheralMonitorSizeCustom: optionalString,
  peripheralLanCableLength: optionalString,
  peripheralLanCableLengthCustom: optionalString,
  lendingStartDate: requiredString,
  expectedReturnDate: requiredString,
  requestReason: requiredString,
  requestDetail: optionalString,
  /** 申請単位の連携ID（UUID）。省略時はサーバーが採番 */
  applicationCorrelationId: z.string().uuid().optional(),
  userMode: z.enum(["single", "multiple"]).optional().default("single"),
  additionalUsers: z.array(additionalUserSchema).optional().default([]),
  userLicenses: z.array(userLicenseSchema).optional().default([]),
  lines: z.array(lendingLineSchema).min(1),
});

export const returnLineSchema = z.object({
  equipmentCode: requiredString,
  equipmentLabel: requiredString,
  assetManagementNumber: z.string().trim(),
  shippingBoxChoice: optionalString,
  accessories: z.array(z.string().trim().min(1)).default([]),
  otherDetail: optionalString,
  lendingDueDate: requiredString,
  expectedReturnDate: requiredString,
});

export const createEquipmentReturnRequestSchema = z.object({
  applicantName: requiredString,
  employeeNumber: requiredString,
  companyName: requiredString,
  departmentName: requiredString,
  address: requiredString,
  userName: requiredString,
  userEmployeeNumber: requiredString,
  userCompanyName: requiredString,
  userDepartmentName: requiredString,
  userAddress: requiredString,
  userContractType: requiredString,
  requestReason: requiredString,
  requestDetail: optionalString,
  otherItemsDetail: optionalString,
  lines: z.array(returnLineSchema).min(1),
});

export const employeeSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
});

function queryBool(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** 機器貸与・過去申請一覧 GET のクエリ */
export const lendingRequestListQuerySchema = z.object({
  applicantEmployeeNumber: z.string().trim().min(1, "申請者社員番号が必要です。"),
  /** 申請者氏名の部分一致（大文字小文字を区別しない） */
  filterApplicantName: z.string().nullable().optional().transform((s) => {
    const t = (s ?? "").trim();
    return t.length > 0 ? t.slice(0, 80) : undefined;
  }),
  /** 利用者社員番号の部分一致 */
  filterUserEmployeeNumber: z.string().nullable().optional().transform((s) => {
    const t = (s ?? "").trim();
    return t.length > 0 ? t.slice(0, 40) : undefined;
  }),
  includeArchived: z.string().nullable().optional().transform(queryBool),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/** 過去申請1件 GET・認可用 */
export const lendingRequestDetailQuerySchema = z.object({
  applicantEmployeeNumber: z.string().trim().min(1, "申請者社員番号が必要です。"),
});

/** 機器返却・過去申請一覧 GET */
export const equipmentReturnListQuerySchema = z.object({
  applicantEmployeeNumber: z.string().trim().min(1, "申請者社員番号が必要です。"),
  filterApplicantName: z.string().nullable().optional().transform((s) => {
    const t = (s ?? "").trim();
    return t.length > 0 ? t.slice(0, 80) : undefined;
  }),
  filterUserEmployeeNumber: z.string().nullable().optional().transform((s) => {
    const t = (s ?? "").trim();
    return t.length > 0 ? t.slice(0, 40) : undefined;
  }),
  includeArchived: z.string().nullable().optional().transform(queryBool),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const equipmentReturnDetailQuerySchema = z.object({
  applicantEmployeeNumber: z.string().trim().min(1, "申請者社員番号が必要です。"),
});
