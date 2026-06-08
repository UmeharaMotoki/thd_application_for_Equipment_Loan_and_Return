/** 変更依頼の種別 */
export const CHANGE_REQUEST_KINDS = [
  "user_change",
  "cost_dept_change",
  "both",
  "period_extension",
] as const;
export type ChangeRequestKind = (typeof CHANGE_REQUEST_KINDS)[number];

export const CHANGE_KIND_LABELS: Record<ChangeRequestKind, string> = {
  user_change: "使用者変更",
  cost_dept_change: "経費負担部門の変更",
  both: "使用者変更と経費負担部門の変更（両方）",
  period_extension: "期間延長",
};

/** 経理部承認・資料添付が必要となる資産金額の閾値（円・以上） */
export const ACCOUNTING_APPROVAL_THRESHOLD_YEN = 100_000;

export function requiresAccountingAttachment(assetAmountYen: number | null | undefined): boolean {
  return assetAmountYen != null && assetAmountYen >= ACCOUNTING_APPROVAL_THRESHOLD_YEN;
}

/** 変更依頼・注意事項（たたき） */
export const CHANGE_REQUEST_NOTICES = [
  "変更依頼は、貸与中の機器について使用者変更・経費負担部門の変更・期間延長を行う際に申請してください。",
  "使用者変更の場合、引き継ぎ条件（用途・契約期間・OS 更新状況等）を満たしているか事前にご確認ください。条件を満たさない場合は差し戻しまたは返却指示となることがあります。",
  "経費負担部門の変更を行う場合、資産金額が10万円以上の場合は経理部の承認および経理部発行の資産登録変更資料の添付が必要です。",
  "期間延長の場合、現在の返却予定日と延長後の返却予定日を入力してください。",
  "現利用者と変更後利用者が異なり、所属部署および経費負担部門の両方が変更される場合は、会社規定に適合しているか十分にご確認ください。",
  "申請内容は担当部門にて確認のうえ、BS・アセット作業等の対応となります。",
] as const;

export const ACCOUNTING_APPROVAL_NOTICE =
  "資産金額が10万円以上の場合、経理部の承認が必要です。経理部から発行された資産登録変更の資料を添付してください。";

export const ACCOUNTING_ATTACHMENT_LABEL =
  "経理部発行の資産登録変更資料（10万円以上の資産）";

export const DEPT_AND_COST_DEPT_WARNING =
  "現利用者と変更後利用者が異なり、所属部署および経費負担部門の両方が変更されています。変更内容が会社規定に適合しているかご確認ください。";

/** 使用者変更で所属部署が異なる場合（本フォームから申請不可） */
export const USER_CHANGE_DEPARTMENT_BLOCKED_MESSAGE =
  "使用者変更では、現利用者と変更後利用者の所属部署が異なる場合は本フォームから申請できません。プルダウンから「使用者変更と経費負担部門の変更（両方）」を選択して進んでください。";

/** 使用者変更＋経費負担部門変更（両方）で部署・経費部門がともに変わる場合（本フォームから申請不可） */
export const BOTH_CHANGE_DEPT_AND_COST_BLOCKED_MESSAGE =
  "使用者変更と経費負担部門の変更（両方）では、所属部署および経費負担部門の双方が変わる場合は本フォームから申請できません。変更内容が会社規定に適合しているか担当部門にご相談ください。";

/** PC（ノート／デスクトップ）選択時に申請者へ表示する引き継ぎ確認項目（BR-D7-06） */
export const CHANGE_REQUEST_PC_CONFIRMATION_ITEMS = [
  "旧利用者と新利用者が異なる人物であること",
  "用途の変更方向：開発業務用 → 派遣リーダー／非開発業務用への格下げでないこと",
  "契約満了日：残存期間が1年以上あること",
  "OS 更新：最終更新から3ヶ月以内であること",
  "Office バージョンが新利用者の用途・カンパニーに適合すること",
  "ユーザーライセンスソフト（Visual Studio・AutoCAD・Adobe・Oracle 等）の有無と、アンインストール作業が必要であること",
] as const;

export const CHANGE_REQUEST_PC_CONFIRMATION_INTRO =
  "対象機器に PC が含まれます。送信前に、以下の引き継ぎ条件をご確認ください。条件を満たさない場合、差し戻し・却下・返却指示となることがあります。";
