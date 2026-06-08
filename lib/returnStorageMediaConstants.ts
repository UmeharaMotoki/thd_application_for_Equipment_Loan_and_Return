/** 返却物マスタ return_main_item.code — 携帯型記録媒体 */
export const RETURN_STORAGE_MEDIA_EQUIPMENT_CODES = new Set([
  "usb_memory",
  "external_hdd",
  "external_ssd",
  "sd_card",
  "optical_media",
]);

export const RETURN_STORAGE_MEDIA_DISPOSAL_NOTICE =
  "携帯型記録媒体（USBメモリ・外付けHDD/SSD 等）の返却は、情報漏洩防止のためデータ消去のうえ廃棄処理となります。";

export function isReturnStorageMediaEquipmentCode(code: string): boolean {
  return RETURN_STORAGE_MEDIA_EQUIPMENT_CODES.has(code.trim());
}
