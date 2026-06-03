/** 返却用梱包箱の要否を入力する機器 ID（表示名は DB マスタ参照） */
export const RETURN_SHIPPING_BOX_EQUIPMENT_CODES = new Set([
  "desktop_pc",
  "laptop_pc",
  "monitor",
]);

/** 資産番号＝電話番号（ハイフンなし）として扱う機器 ID */
export const RETURN_PHONE_ASSET_EQUIPMENT_CODES = new Set([
  "smartphone",
  "feature_phone",
  "wifi_router",
]);

export const RETURN_OTHER_EQUIPMENT_CODE = "other";
