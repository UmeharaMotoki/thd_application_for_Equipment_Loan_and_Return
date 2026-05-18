import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";
import {
  fetchActiveOptionsByCategories,
  optionsRowsToLabelSet,
} from "@/lib/applicationSelectOptionsQueries";
import { getEmploymentTypeLabelSetForValidation } from "@/lib/employmentTypeOptions";
import { STATIC_LENDING_REQUEST_REASON_OPTIONS } from "@/lib/formOptionsStaticFallback";
import {
  LAN_CABLE_LENGTH_OPTIONS,
  LENDING_EQUIPMENT_TYPE_OPTIONS,
  LENDING_NON_PC_STAFF_CATEGORY,
  lendingLinesIncludeEquipment,
  lendingLinesIncludePc,
  lendingLinesIncludeSmartphone,
  MONITOR_SIZE_OPTIONS,
} from "@/lib/lendingEquipmentOptions";
import {
  DECISION_CLIENT_NO,
  DECISION_CLIENT_YES,
  DECISION_CONTRACT_DISPATCH,
  DECISION_CONTRACT_QUASI,
  DECISION_WORK_DEVELOPMENT,
  DECISION_WORK_INTERNAL,
  MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED,
  MS_OFFICE_EDITION_STANDARD_OPTIONS,
  STAFF_MANAGEMENT,
  STAFF_TECHNICAL,
  isMsOfficeEditionAllowedForPcDecision,
} from "@/lib/resolvePcSpecDecision";
import { createLendingRequestSchema } from "@/lib/validators";

type LendingBody = z.infer<typeof createLendingRequestSchema>;

const LENDING_FETCH_CATEGORIES = [
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
] as const;

function mergeSet(db: Set<string>, fallback: readonly string[]): Set<string> {
  return db.size > 0 ? db : new Set(fallback);
}

function linesFromTypes(types: string[]): { equipmentType: string }[] {
  return types.map((equipmentType) => ({ equipmentType }));
}

/** 機器貸与 POST のマスタ照合。問題なければ null。 */
export async function validateLendingPostAgainstMasters(
  prisma: PrismaClient,
  body: LendingBody,
  normalizedEquipmentTypes: string[],
): Promise<string | null> {
  const [rows, employmentSet] = await Promise.all([
    fetchActiveOptionsByCategories(prisma, [...LENDING_FETCH_CATEGORIES]),
    getEmploymentTypeLabelSetForValidation(prisma),
  ]);

  const requestReasonSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.lendingRequestReason),
    STATIC_LENDING_REQUEST_REASON_OPTIONS,
  );
  const equipmentSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.lendingEquipmentType),
    LENDING_EQUIPMENT_TYPE_OPTIONS,
  );
  const userStaffSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.userStaffCategory),
    [STAFF_MANAGEMENT, STAFF_TECHNICAL],
  );
  const decisionContractSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.decisionContractType),
    [DECISION_CONTRACT_QUASI, DECISION_CONTRACT_DISPATCH],
  );
  const decisionWorkSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.decisionWorkContent),
    [DECISION_WORK_DEVELOPMENT, DECISION_WORK_INTERNAL],
  );
  const decisionClientSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.decisionClientEnv),
    [DECISION_CLIENT_YES, DECISION_CLIENT_NO],
  );
  const msOfficeSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.msOfficeEdition),
    [...MS_OFFICE_EDITION_STANDARD_OPTIONS, MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED],
  );
  const smartphoneCameraSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.smartphoneCamera),
    ["カメラあり", "カメラなし"],
  );
  const smartphoneIdSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.smartphoneUserIdentification),
    ["特定する", "特定しない"],
  );
  const smartphoneWorkplaceSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.smartphoneWorkplace),
    ["事業場で利用する", "事業場で利用しない"],
  );
  const monitorSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.peripheralMonitorSize),
    MONITOR_SIZE_OPTIONS,
  );
  const lanSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength),
    LAN_CABLE_LENGTH_OPTIONS,
  );

  const ct = body.userContractType.trim();
  if (!employmentSet.has(ct)) {
    return "契約形態（雇用形態）の値が不正です。一覧を更新してやり直してください。";
  }

  const rr = body.requestReason.trim();
  if (!requestReasonSet.has(rr)) {
    return "申請理由の値が不正です。";
  }

  for (let i = 0; i < normalizedEquipmentTypes.length; i += 1) {
    const t = normalizedEquipmentTypes[i];
    if (!equipmentSet.has(t)) {
      return `機器 ${i + 1} 行目：種類の値がマスタと一致しません。`;
    }
  }

  const lineObjs = linesFromTypes(normalizedEquipmentTypes);
  const includesPc = lendingLinesIncludePc(lineObjs);

  if (includesPc) {
    const staff = body.userStaffCategory.trim();
    if (!userStaffSet.has(staff)) {
      return "利用者区分の値が不正です。";
    }
    if (staff === STAFF_TECHNICAL) {
      const dct = (body.decisionContractType ?? "").trim();
      const dwc = (body.decisionWorkContent ?? "").trim();
      const dce = (body.decisionClientEnv ?? "").trim();
      if (!decisionContractSet.has(dct)) {
        return "契約形態（判定）の値が不正です。";
      }
      if (!decisionWorkSet.has(dwc)) {
        return "業務内容の値が不正です。";
      }
      if (!decisionClientSet.has(dce)) {
        return "客先ネットワーク接続の有無の値が不正です。";
      }
    }
    const ms = (body.msOfficeEdition ?? "").trim();
    if (!msOfficeSet.has(ms)) {
      return "MicrosoftOfficeのエディションの値が不正です。";
    }
    if (
      !isMsOfficeEditionAllowedForPcDecision(
        body.userStaffCategory.trim(),
        (body.decisionContractType ?? "").trim(),
        (body.decisionWorkContent ?? "").trim(),
        (body.decisionClientEnv ?? "").trim(),
        ms,
      )
    ) {
      return "MicrosoftOfficeのエディションが、利用者区分・判定プロセスと一致しません。";
    }
  } else {
    if (body.userStaffCategory.trim() !== LENDING_NON_PC_STAFF_CATEGORY) {
      return "貸与機器のデータが不正です。画面を再読み込みしてやり直してください。";
    }
  }

  if (lendingLinesIncludeSmartphone(lineObjs)) {
    const a = (body.smartphoneCameraPresence ?? "").trim();
    const b = (body.smartphoneUserIdentification ?? "").trim();
    const c = (body.smartphoneWorkplaceUse ?? "").trim();
    if (!smartphoneCameraSet.has(a) || !smartphoneIdSet.has(b) || !smartphoneWorkplaceSet.has(c)) {
      return "スマホ関連の選択値が不正です。";
    }
  }

  if (lendingLinesIncludeEquipment(lineObjs, "モニター")) {
    const sz = (body.peripheralMonitorSize ?? "").trim();
    if (!monitorSet.has(sz)) {
      return "モニターサイズの値が不正です。";
    }
    if (sz === "その他" && !(body.peripheralMonitorSizeCustom ?? "").trim()) {
      return "モニターサイズ（その他）の詳細を入力してください。";
    }
  }

  if (lendingLinesIncludeEquipment(lineObjs, "LANケーブル")) {
    const len = (body.peripheralLanCableLength ?? "").trim();
    if (!lanSet.has(len)) {
      return "LANケーブル長さの値が不正です。";
    }
    if (len === "その他" && !(body.peripheralLanCableLengthCustom ?? "").trim()) {
      return "LANケーブル（その他）の詳細を入力してください。";
    }
  }

  return null;
}
