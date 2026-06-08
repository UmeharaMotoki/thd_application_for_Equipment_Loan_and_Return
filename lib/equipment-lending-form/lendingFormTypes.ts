import { emptyLendingUserProfile, type LendingUserProfile } from "@/lib/lendingUserProfile";
import type { AdditionalUserRow } from "@/components/equipment-lending/LendingAdditionalUsersBlock";

export const LENDING_BRAND_COLOR = "#007D9E";
export const LENDING_DRAFT_KEY = "equipment-request-draft";

export type LendingWizardStep =
  | "notice"
  | "applicant"
  | "user"
  | "equipment"
  | "delivery"
  | "reason"
  | "confirm";

export type ApplicantFormData = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
  applicantJobTitle: string;
  applicantEmail: string;
  applicantPhone: string;
};

export type UserFormData = LendingUserProfile;

export type DeliveryFormData = {
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

export type ReasonFormData = {
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

export type LendingEquipmentLine = {
  id: string;
  equipmentType: string;
  assignedUserEmployeeNumber: string;
};

export type DraftPayload = {
  applicant: ApplicantFormData;
  user: UserFormData;
  delivery?: DeliveryFormData;
  lendingLines?: LendingEquipmentLine[];
  reason?: ReasonFormData;
  userMode?: "single" | "multiple";
  additionalUsers?: AdditionalUserRow[];
};

export type EmployeeMasterOption = {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  departmentCode: string | null;
  address: string;
  deliveryArea: string | null;
  deliveryPostalCode: string | null;
  deliveryAddressLine: string | null;
  deliveryBuilding: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  employmentType: string | null;
  employeeCategory: string | null;
  occupationName: string | null;
  retired: boolean;
};

export type ThdLocationDept = {
  departmentCode: string;
  departmentName: string | null;
  deliverySite: string | null;
  area: string | null;
  postalCode: string | null;
  address: string | null;
  buildingName: string | null;
};

export const APPLICANT_DETAIL_FIELDS: Array<{ key: keyof ApplicantFormData; label: string }> = [
  { key: "companyName", label: "所属企業名" },
  { key: "departmentName", label: "部署名" },
  { key: "address", label: "住所" },
  { key: "applicantJobTitle", label: "役職" },
  { key: "applicantEmail", label: "Eメール" },
  { key: "applicantPhone", label: "電話番号" },
];

export const USER_DETAIL_FIELDS: Array<{ key: keyof UserFormData; label: string }> = [
  { key: "userCompanyName", label: "所属企業名" },
  { key: "userDepartmentName", label: "部署名" },
  { key: "userAddress", label: "住所" },
];

export const DELIVERY_DETAIL_FIELDS: Array<{ key: keyof DeliveryFormData; label: string }> = [
  { key: "deliveryCompanyName", label: "会社名" },
  { key: "deliveryDepartment", label: "部署名" },
  { key: "deliveryArea", label: "エリア" },
  { key: "deliveryPostalCode", label: "郵便番号" },
  { key: "deliveryAddress", label: "住所" },
  { key: "deliveryBuilding", label: "ビル名" },
  { key: "deliveryEmail", label: "Eメール" },
  { key: "deliveryPhone", label: "電話番号" },
];

export const DELIVERY_DETAIL_FIELDS_WITHOUT_LOCATION = DELIVERY_DETAIL_FIELDS.filter(
  (f) =>
    f.key !== "deliveryDepartment" &&
    f.key !== "deliveryArea" &&
    f.key !== "deliveryCompanyName" &&
    f.key !== "deliveryAddress",
);

export const initialApplicant: ApplicantFormData = {
  applicantName: "",
  employeeNumber: "",
  companyName: "",
  departmentName: "",
  address: "",
  applicantJobTitle: "",
  applicantEmail: "",
  applicantPhone: "",
};

export const initialUser: UserFormData = emptyLendingUserProfile();

export const initialDelivery: DeliveryFormData = {
  deliverySameAsUser: false,
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
};

export const initialReason: ReasonFormData = {
  requestReason: "",
  applicationCorrelationId: "",
  decisionContractType: "",
  decisionWorkContent: "",
  decisionClientEnv: "",
  msOfficeEdition: "",
  lendingStartDate: "",
  expectedReturnDate: "",
  requestDetail: "",
  smartphoneCameraPresence: "",
  smartphoneUserIdentification: "",
  smartphoneWorkplaceUse: "",
  peripheralMonitorSize: "",
  peripheralMonitorSizeCustom: "",
  peripheralLanCableLength: "",
  peripheralLanCableLengthCustom: "",
};

export const lendingTextFieldRowSx = { ".MuiInputBase-root": { height: 46 } } as const;
export const lendingFormRowLabelSx = { width: 170, flexShrink: 0, fontSize: 18 } as const;
export const lendingFormRowFieldCellSx = { flex: 1, minWidth: 0 } as const;
