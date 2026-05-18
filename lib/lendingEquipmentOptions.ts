/** 機器貸与で選択可能な機器種別（1行につき1種類。行追加で複数選択可） */
export const LENDING_EQUIPMENT_TYPE_OPTIONS = [
  "ノートPC",
  "デスクトップPC",
  "モニター",
  "マウス",
  "ヘッドセット",
  "LANケーブル",
  "スマホ",
  "Wifiルーター",
] as const;

export type LendingEquipmentTypeOption = (typeof LENDING_EQUIPMENT_TYPE_OPTIONS)[number];

export type EquipmentCategory = "pc" | "peripheral" | "communication";

export const EQUIPMENT_CATEGORY_MAP: Record<LendingEquipmentTypeOption, EquipmentCategory> = {
  "ノートPC": "pc",
  "デスクトップPC": "pc",
  "モニター": "peripheral",
  "マウス": "peripheral",
  "ヘッドセット": "peripheral",
  "LANケーブル": "peripheral",
  "スマホ": "communication",
  "Wifiルーター": "communication",
};

export const EQUIPMENT_CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  pc: "PC",
  peripheral: "周辺機器",
  communication: "通信機器",
};

/** 選択中の機器行から、含まれるカテゴリの Set を返す */
export function getSelectedCategories(lines: { equipmentType: string }[]): Set<EquipmentCategory> {
  const cats = new Set<EquipmentCategory>();
  for (const l of lines) {
    const t = l.equipmentType.trim();
    if (t in EQUIPMENT_CATEGORY_MAP) {
      cats.add(EQUIPMENT_CATEGORY_MAP[t as LendingEquipmentTypeOption]);
    }
  }
  return cats;
}

export function lendingLinesIncludePc(lines: { equipmentType: string }[]): boolean {
  return getSelectedCategories(lines).has("pc");
}

export function lendingLinesIncludeCommunication(lines: { equipmentType: string }[]): boolean {
  return getSelectedCategories(lines).has("communication");
}

export function lendingLinesIncludeSmartphone(lines: { equipmentType: string }[]): boolean {
  return lines.some((l) => l.equipmentType.trim() === "スマホ");
}

export function lendingLinesIncludeWifiRouter(lines: { equipmentType: string }[]): boolean {
  return lines.some((l) => l.equipmentType.trim() === "Wifiルーター");
}

export function lendingLinesIncludePeripheral(lines: { equipmentType: string }[]): boolean {
  return getSelectedCategories(lines).has("peripheral");
}

export function lendingLinesIncludeEquipment(
  lines: { equipmentType: string }[],
  name: string,
): boolean {
  return lines.some((l) => l.equipmentType.trim() === name);
}

export function isAllowedLendingEquipmentType(value: string, allowedFromDb?: ReadonlySet<string>): boolean {
  const t = value.trim();
  if (!t) return false;
  if (allowedFromDb && allowedFromDb.size > 0) {
    if (!allowedFromDb.has(t)) return false;
    return t in EQUIPMENT_CATEGORY_MAP;
  }
  return (LENDING_EQUIPMENT_TYPE_OPTIONS as readonly string[]).includes(t);
}

/** PC 非選択時に API／DB に渡す利用者区分プレースホルダー */
export const LENDING_NON_PC_STAFF_CATEGORY = "非PC機器のみ";

export const MONITOR_SIZE_OPTIONS = [
  "21.5インチ",
  "23.8インチ",
  "27インチ",
  "その他",
] as const;

export const LAN_CABLE_LENGTH_OPTIONS = [
  "1m",
  "2m",
  "3m",
  "5m",
  "10m",
  "その他",
] as const;
