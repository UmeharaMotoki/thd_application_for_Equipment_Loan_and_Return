import type { AdditionalUserRow } from "@/components/equipment-lending/LendingAdditionalUsersBlock";
import { LENDING_NON_PC_STAFF_CATEGORY } from "@/lib/lendingEquipmentOptions";
import { emptyUserReasonFormState, type UserReasonFormState } from "@/lib/lendingUserReason";
import { isPcEquipmentType } from "@/lib/lendingUserPool";
import type {
  ApplicantFormData,
  DeliveryFormData,
  LendingEquipmentLine,
  ReasonFormData,
  UserFormData,
} from "@/lib/equipment-lending-form/lendingFormTypes";

export type BuildLendingRequestBodyInput = {
  applicantData: ApplicantFormData;
  userData: UserFormData;
  deliveryData: DeliveryFormData;
  reasonData: ReasonFormData;
  lendingLines: LendingEquipmentLine[];
  userMode: "single" | "multiple";
  additionalUsers: AdditionalUserRow[];
  userReasonByEmp: Record<string, UserReasonFormState>;
  assignedEmployeeNumbers: string[];
};

/** 機器貸与 POST `/api/requests` 用 JSON ボディを組み立てる */
export function buildLendingRequestBody(input: BuildLendingRequestBodyInput): Record<string, unknown> {
  const {
    applicantData,
    userData,
    deliveryData,
    reasonData,
    lendingLines,
    userMode,
    additionalUsers,
    userReasonByEmp,
    assignedEmployeeNumbers,
  } = input;

  const delivery = deliveryData.deliverySameAsUser
    ? {
        deliverySameAsUser: true,
        deliveryName: deliveryData.deliveryName || userData.userName,
        deliveryEmployeeNumber:
          deliveryData.deliveryEmployeeNumber || userData.userEmployeeNumber,
        deliveryCompanyName: deliveryData.deliveryCompanyName || userData.userCompanyName,
        deliveryDepartment: deliveryData.deliveryDepartment || userData.userDepartmentName,
        deliveryArea: deliveryData.deliveryArea,
        deliveryPostalCode: deliveryData.deliveryPostalCode,
        deliveryAddress: deliveryData.deliveryAddress || userData.userAddress,
        deliveryBuilding: deliveryData.deliveryBuilding,
        deliveryEmail: deliveryData.deliveryEmail || userData.userEmail,
        deliveryPhone: deliveryData.deliveryPhone || userData.userPhone,
      }
    : {
        deliverySameAsUser: false,
        deliveryName: deliveryData.deliveryName,
        deliveryEmployeeNumber: deliveryData.deliveryEmployeeNumber,
        deliveryCompanyName: deliveryData.deliveryCompanyName,
        deliveryDepartment: deliveryData.deliveryDepartment,
        deliveryArea: deliveryData.deliveryArea,
        deliveryPostalCode: deliveryData.deliveryPostalCode,
        deliveryAddress: deliveryData.deliveryAddress,
        deliveryBuilding: deliveryData.deliveryBuilding,
        deliveryEmail: deliveryData.deliveryEmail,
        deliveryPhone: deliveryData.deliveryPhone,
      };

  const { applicationCorrelationId, ...reasonRest } = reasonData;
  const repEmp = userData.userEmployeeNumber.trim();
  const repReason = userReasonByEmp[repEmp] ?? emptyUserReasonFormState();
  const repHasPc = lendingLines.some(
    (line) =>
      isPcEquipmentType(line.equipmentType) &&
      (line.assignedUserEmployeeNumber.trim() || repEmp) === repEmp,
  );

  return {
    ...applicantData,
    ...userData,
    ...delivery,
    ...reasonRest,
    lendingStartDate: repReason.lendingStartDate || reasonData.lendingStartDate,
    expectedReturnDate: repReason.expectedReturnDate || reasonData.expectedReturnDate,
    decisionContractType: repHasPc ? repReason.decisionContractType : "",
    decisionWorkContent: repHasPc ? repReason.decisionWorkContent : "",
    decisionClientEnv: repHasPc ? repReason.decisionClientEnv : "",
    msOfficeEdition: repHasPc ? repReason.msOfficeEdition : "",
    smartphoneCameraPresence:
      repReason.smartphoneCameraPresence || reasonData.smartphoneCameraPresence,
    smartphoneUserIdentification:
      repReason.smartphoneUserIdentification || reasonData.smartphoneUserIdentification,
    smartphoneWorkplaceUse: repReason.smartphoneWorkplaceUse || reasonData.smartphoneWorkplaceUse,
    peripheralMonitorSize: repReason.peripheralMonitorSize || reasonData.peripheralMonitorSize,
    peripheralMonitorSizeCustom:
      repReason.peripheralMonitorSizeCustom || reasonData.peripheralMonitorSizeCustom,
    peripheralLanCableLength:
      repReason.peripheralLanCableLength || reasonData.peripheralLanCableLength,
    peripheralLanCableLengthCustom:
      repReason.peripheralLanCableLengthCustom || reasonData.peripheralLanCableLengthCustom,
    ...(applicationCorrelationId.trim()
      ? { applicationCorrelationId: applicationCorrelationId.trim() }
      : {}),
    userStaffCategory: repHasPc
      ? repReason.userStaffCategory || userData.userStaffCategory
      : LENDING_NON_PC_STAFF_CATEGORY,
    userMode,
    additionalUsers:
      userMode === "multiple"
        ? additionalUsers.map((u) => ({
            userName: u.userName,
            userEmployeeNumber: u.userEmployeeNumber,
            userCompanyName: u.userCompanyName,
            userDepartmentName: u.userDepartmentName,
            userAddress: u.userAddress,
            userContractType: u.userContractType,
            userStaffCategory: u.userStaffCategory,
            userCostDeptName: u.userCostDeptName,
            userCostDeptCode: u.userCostDeptCode,
            userEmail: u.userEmail,
            userPhone: u.userPhone,
            userHrEmployeeCategory: u.userHrEmployeeCategory,
            userHrOccupationName: u.userHrOccupationName,
          }))
        : [],
    userLicenses: assignedEmployeeNumbers.map((emp) => ({
      userEmployeeNumber: emp,
      ...(userReasonByEmp[emp] ?? emptyUserReasonFormState()),
    })),
    lines: lendingLines.map(({ equipmentType, assignedUserEmployeeNumber }) => ({
      equipmentType,
      assignedUserEmployeeNumber:
        assignedUserEmployeeNumber.trim() || userData.userEmployeeNumber.trim(),
    })),
  };
}
