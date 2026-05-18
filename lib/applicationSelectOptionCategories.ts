/** Prisma `ApplicationSelectOption.category` と一致させる */
export const APPLICATION_SELECT_CATEGORIES = {
  lendingRequestReason: "lending_request_reason",
  returnRequestReason: "return_request_reason",
  decisionContractType: "decision_contract_type",
  decisionWorkContent: "decision_work_content",
  decisionClientEnv: "decision_client_env",
  msOfficeEdition: "ms_office_edition",
  smartphoneCamera: "smartphone_camera",
  smartphoneUserIdentification: "smartphone_user_identification",
  smartphoneWorkplace: "smartphone_workplace",
  peripheralMonitorSize: "peripheral_monitor_size",
  peripheralLanCableLength: "peripheral_lan_cable_length",
  lendingEquipmentType: "lending_equipment_type",
  userStaffCategory: "user_staff_category",
} as const;

export type ApplicationSelectCategory =
  (typeof APPLICATION_SELECT_CATEGORIES)[keyof typeof APPLICATION_SELECT_CATEGORIES];

/** 機器貸与ページでまとめて取得する category 一覧 */
export const LENDING_PAGE_FORM_OPTION_CATEGORIES: ApplicationSelectCategory[] = [
  APPLICATION_SELECT_CATEGORIES.lendingRequestReason,
  APPLICATION_SELECT_CATEGORIES.decisionContractType,
  APPLICATION_SELECT_CATEGORIES.decisionWorkContent,
  APPLICATION_SELECT_CATEGORIES.decisionClientEnv,
  APPLICATION_SELECT_CATEGORIES.msOfficeEdition,
  APPLICATION_SELECT_CATEGORIES.smartphoneCamera,
  APPLICATION_SELECT_CATEGORIES.smartphoneUserIdentification,
  APPLICATION_SELECT_CATEGORIES.smartphoneWorkplace,
  APPLICATION_SELECT_CATEGORIES.peripheralMonitorSize,
  APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength,
  APPLICATION_SELECT_CATEGORIES.lendingEquipmentType,
  APPLICATION_SELECT_CATEGORIES.userStaffCategory,
];

export const RETURN_PAGE_FORM_OPTION_CATEGORIES: ApplicationSelectCategory[] = [
  APPLICATION_SELECT_CATEGORIES.returnRequestReason,
  APPLICATION_SELECT_CATEGORIES.lendingEquipmentType,
];
