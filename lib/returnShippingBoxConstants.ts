import { RETURN_SHIPPING_BOX_EQUIPMENT_CODES } from "@/lib/returnEquipmentFormConstants";

/** 返却用梱包箱マスタ（return_shipping_box）の label */
export const RETURN_SHIPPING_BOX_HAS = "有";
export const RETURN_SHIPPING_BOX_NONE = "無";

export const RETURN_SHIPPING_BOX_REQUEST_KIND = "return-shipping-box-request" as const;

export const RETURN_SHIPPING_BOX_AUTO_REQUEST_NOTICE =
  "「無」を選択した場合、返却用梱包箱の送付依頼が本申請と同時に自動作成されます。";

export function isReturnShippingBoxNoneChoice(choice: string): boolean {
  return choice.trim() === RETURN_SHIPPING_BOX_NONE;
}

export function lineNeedsShippingBoxRequest(args: {
  equipmentCode: string;
  shippingBoxChoice: string;
}): boolean {
  const code = args.equipmentCode.trim();
  const choice = args.shippingBoxChoice.trim();
  if (!code || !choice) return false;
  return RETURN_SHIPPING_BOX_EQUIPMENT_CODES.has(code) && isReturnShippingBoxNoneChoice(choice);
}
