import { compareIsoDateOnly, parseIsoDateOnly } from "@/lib/dateOnly";
import {
  RETURN_OTHER_EQUIPMENT_CODE,
  RETURN_PHONE_ASSET_EQUIPMENT_CODES,
  RETURN_SHIPPING_BOX_EQUIPMENT_CODES,
} from "@/lib/returnEquipmentFormConstants";
import type { ReturnEquipmentSelectionState } from "@/lib/returnEquipmentSelectionTypes";

const PHONE_ASSET_PATTERN = /^[0-9]+$/;

export function validateReturnEquipmentSelection(
  state: ReturnEquipmentSelectionState,
  shippingBoxLabels: ReadonlySet<string>,
): string | null {
  const activeLines = state.lines.filter((l) => l.equipmentCode.trim());
  if (activeLines.length === 0) {
    return "返却する機器を1つ以上選択してください。";
  }

  const codes = activeLines.map((l) => l.equipmentCode.trim());
  if (new Set(codes).size !== codes.length) {
    return "同じ機器種別を複数行で選択できません。機器ごとに1行ずつ選択してください。";
  }

  for (const line of activeLines) {
    const code = line.equipmentCode.trim();
    const label = line.equipmentLabel.trim();

    const due = line.lendingDueDate.trim();
    const ret = line.expectedReturnDate.trim();
    if (!due || !ret) {
      return `${label || "選択した機器"}の貸与期限・返却予定日を入力してください。`;
    }
    if (!parseIsoDateOnly(due) || !parseIsoDateOnly(ret)) {
      return `${label}の貸与期限・返却予定日を正しい日付で入力してください。`;
    }
    if (compareIsoDateOnly(ret, due) > 0) {
      return `${label}の返却予定日は貸与期限以前の日付にしてください。`;
    }

    if (code === RETURN_OTHER_EQUIPMENT_CODE) {
      if (!line.otherDetail.trim()) {
        return "「その他」を選択した場合は、返却物の詳細を入力してください。";
      }
      continue;
    }

    if (!line.assetManagementNumber.trim()) {
      return `${label || "選択した機器"}の資産管理番号を入力してください。`;
    }

    if (RETURN_PHONE_ASSET_EQUIPMENT_CODES.has(code)) {
      const num = line.assetManagementNumber.trim();
      if (!PHONE_ASSET_PATTERN.test(num)) {
        return `${label}の資産管理番号は、ハイフンなしの数字のみで入力してください。`;
      }
    }

    if (RETURN_SHIPPING_BOX_EQUIPMENT_CODES.has(code)) {
      const box = line.shippingBoxChoice.trim();
      if (!box || !shippingBoxLabels.has(box)) {
        return `${label}の返却用梱包箱（有/無）を選択してください。`;
      }
    }
  }

  return null;
}

export function isReturnEquipmentSelectionComplete(
  state: ReturnEquipmentSelectionState,
  shippingBoxLabels: ReadonlySet<string>,
): boolean {
  return validateReturnEquipmentSelection(state, shippingBoxLabels) === null;
}
