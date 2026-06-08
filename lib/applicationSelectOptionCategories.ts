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
  /** 機器返却：返却理由（ラジオ／select） */
  returnReason: "return_reason",
  /** 機器返却：返却物（メイン機器チェック） */
  returnMainItem: "return_main_item",
  /** 機器返却：付属品（code = 親機器の ID） */
  returnItemAccessory: "return_item_accessory",
  /** 機器返却：返却用梱包箱（有/無） */
  returnShippingBox: "return_shipping_box",
  /** 機器返却：資産管理番号フィールドの表示ラベル（code = 親機器の ID） */
  returnAssetNumberLabel: "return_asset_number_label",
  /** 変更依頼：変更種別（code = changeKind） */
  changeRequestKind: "change_request_kind",
  /** 変更依頼：対象機器（label = 保存値） */
  changeRequestEquipmentType: "change_request_equipment_type",
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
  APPLICATION_SELECT_CATEGORIES.returnReason,
  APPLICATION_SELECT_CATEGORIES.returnMainItem,
  APPLICATION_SELECT_CATEGORIES.returnItemAccessory,
  APPLICATION_SELECT_CATEGORIES.returnShippingBox,
  APPLICATION_SELECT_CATEGORIES.returnAssetNumberLabel,
];

export const CHANGE_REQUEST_PAGE_FORM_OPTION_CATEGORIES: ApplicationSelectCategory[] = [
  APPLICATION_SELECT_CATEGORIES.changeRequestKind,
  APPLICATION_SELECT_CATEGORIES.changeRequestEquipmentType,
];
