import type { Dayjs } from "dayjs";
import type { ChangeRequestKind } from "@/lib/changeRequestConstants";
import type { ChangeRequestUserProfile } from "@/lib/changeRequestFormTypes";
import { getChangeRequestDetailsBlockReason } from "@/lib/changeRequestWarnings";

export function getChangeRequestDetailsIncompleteReason(input: {
  changeKind: ChangeRequestKind;
  currentUser: ChangeRequestUserProfile;
  newUser: ChangeRequestUserProfile;
  showNewUserSection: boolean;
  includesUserChange: boolean;
  includesCostDeptChange: boolean;
  isPeriodExtension: boolean;
  periodCurrentEnd: Dayjs | null;
  periodNewEnd: Dayjs | null;
  selectedEquipment: string[];
  parsedAssetAmount: number | null;
  requiresAttachment: boolean;
  accountingAttachmentCount: number;
}): string | null {
  const blockReason = getChangeRequestDetailsBlockReason(
    input.currentUser,
    input.newUser,
    input.changeKind,
  );
  if (blockReason) return blockReason;

  if (!input.currentUser.userEmployeeNumber.trim()) {
    return "現利用者を人事マスタから選択してください。";
  }
  if (input.showNewUserSection && !input.newUser.userEmployeeNumber.trim()) {
    return "変更後利用者を人事マスタから選択してください。";
  }
  if (
    input.includesUserChange &&
    input.currentUser.userEmployeeNumber === input.newUser.userEmployeeNumber
  ) {
    return "使用者変更の場合、現利用者と変更後利用者は異なる社員番号を指定してください。";
  }
  if (input.isPeriodExtension) {
    if (!input.periodCurrentEnd?.isValid()) return "現在の返却予定日を入力してください。";
    if (!input.periodNewEnd?.isValid()) return "延長後の返却予定日を入力してください。";
    if (!input.periodNewEnd.isAfter(input.periodCurrentEnd, "day")) {
      return "延長後の返却予定日は現在の返却予定日より後の日付にしてください。";
    }
  }
  if (input.selectedEquipment.length === 0) return "対象機器を1件以上選択してください。";
  if (input.includesCostDeptChange && input.parsedAssetAmount == null) {
    return "経費負担部門の変更には資産金額（円）を入力してください。";
  }
  if (input.requiresAttachment && input.accountingAttachmentCount === 0) {
    return "資産金額が10万円以上のため、経理部発行の資産登録変更資料を添付してください。";
  }
  return null;
}

export function getChangeRequestDetailsInputIncompleteReason(
  input: Parameters<typeof getChangeRequestDetailsIncompleteReason>[0],
): string | null {
  const blockReason = getChangeRequestDetailsBlockReason(
    input.currentUser,
    input.newUser,
    input.changeKind,
  );
  if (blockReason) return null;
  return getChangeRequestDetailsIncompleteReason(input);
}
