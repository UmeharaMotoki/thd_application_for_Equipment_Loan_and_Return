export type ReturnEquipmentLineForm = {
  id: string;
  equipmentCode: string;
  equipmentLabel: string;
  assetManagementNumber: string;
  shippingBoxChoice: string;
  selectedAccessories: string[];
  /** equipmentCode が other のときの詳細 */
  otherDetail: string;
  lendingDueDate: string;
  expectedReturnDate: string;
};

export type ReturnEquipmentSelectionState = {
  lines: ReturnEquipmentLineForm[];
};

export function newReturnEquipmentLineId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newReturnEquipmentLine(): ReturnEquipmentLineForm {
  return {
    id: newReturnEquipmentLineId(),
    equipmentCode: "",
    equipmentLabel: "",
    assetManagementNumber: "",
    shippingBoxChoice: "",
    selectedAccessories: [],
    otherDetail: "",
    lendingDueDate: "",
    expectedReturnDate: "",
  };
}

export const emptyReturnEquipmentSelection = (): ReturnEquipmentSelectionState => ({
  lines: [newReturnEquipmentLine()],
});

/** localStorage 旧形式（チェックボックス版） */
export type LegacyReturnEquipmentSelectionState = {
  selectedItems?: Array<{
    equipmentCode: string;
    equipmentLabel: string;
    assetManagementNumber: string;
    shippingBoxChoice: string;
    selectedAccessories: string[];
  }>;
  otherDetail?: string;
};

function isLineBasedState(raw: unknown): raw is ReturnEquipmentSelectionState {
  return (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as ReturnEquipmentSelectionState).lines)
  );
}

export function migrateReturnEquipmentState(
  raw: ReturnEquipmentSelectionState | LegacyReturnEquipmentSelectionState | undefined,
): ReturnEquipmentSelectionState {
  if (!raw) return emptyReturnEquipmentSelection();
  if (isLineBasedState(raw) && raw.lines.length > 0) {
    return {
      lines: raw.lines.map((l) => ({
        ...newReturnEquipmentLine(),
        ...l,
        id: l.id || newReturnEquipmentLineId(),
      })),
    };
  }
  const legacy = raw as LegacyReturnEquipmentSelectionState;
  if (Array.isArray(legacy.selectedItems) && legacy.selectedItems.length > 0) {
    return {
      lines: legacy.selectedItems.map((item) => ({
        id: newReturnEquipmentLineId(),
        equipmentCode: item.equipmentCode,
        equipmentLabel: item.equipmentLabel,
        assetManagementNumber: item.assetManagementNumber ?? "",
        shippingBoxChoice: item.shippingBoxChoice ?? "",
        selectedAccessories: item.selectedAccessories ?? [],
        otherDetail:
          item.equipmentCode === "other" ? (legacy.otherDetail ?? "") : "",
        lendingDueDate: "",
        expectedReturnDate: "",
      })),
    };
  }
  return emptyReturnEquipmentSelection();
}
