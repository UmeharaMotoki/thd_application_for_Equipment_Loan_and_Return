import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";
import {
  fetchActiveOptionsByCategories,
  optionsRowsToLabelSet,
} from "@/lib/applicationSelectOptionsQueries";
import { getEmploymentTypeLabelSetForValidation } from "@/lib/employmentTypeOptions";
import {
  RETURN_OTHER_EQUIPMENT_CODE,
  RETURN_SHIPPING_BOX_EQUIPMENT_CODES,
} from "@/lib/returnEquipmentFormConstants";
import { createEquipmentReturnRequestSchema } from "@/lib/validators";

type ReturnBody = z.infer<typeof createEquipmentReturnRequestSchema>;

const RETURN_FETCH_CATEGORIES = [
  APPLICATION_SELECT_CATEGORIES.returnReason,
  APPLICATION_SELECT_CATEGORIES.returnMainItem,
  APPLICATION_SELECT_CATEGORIES.returnItemAccessory,
  APPLICATION_SELECT_CATEGORIES.returnShippingBox,
] as const;

function optionsRowsToCodeSet(
  rows: Awaited<ReturnType<typeof fetchActiveOptionsByCategories>>,
  category: string,
): Set<string> {
  return new Set(
    rows
      .filter((r) => r.category === category && r.code)
      .map((r) => (r.code as string).trim()),
  );
}

export async function validateEquipmentReturnPostAgainstMasters(
  prisma: PrismaClient,
  body: ReturnBody,
): Promise<string | null> {
  const [rows, employmentSet] = await Promise.all([
    fetchActiveOptionsByCategories(prisma, [...RETURN_FETCH_CATEGORIES]),
    getEmploymentTypeLabelSetForValidation(prisma),
  ]);

  const reasonSet = optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.returnReason);
  const mainCodeSet = optionsRowsToCodeSet(rows, APPLICATION_SELECT_CATEGORIES.returnMainItem);
  const mainLabelByCode = new Map(
    rows
      .filter((r) => r.category === APPLICATION_SELECT_CATEGORIES.returnMainItem && r.code)
      .map((r) => [r.code as string, r.label]),
  );
  const accessoryLabelsByCode = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.category !== APPLICATION_SELECT_CATEGORIES.returnItemAccessory || !r.code) continue;
    const parent = r.code.trim();
    if (!accessoryLabelsByCode.has(parent)) accessoryLabelsByCode.set(parent, new Set());
    accessoryLabelsByCode.get(parent)!.add(r.label);
  }
  const shippingBoxSet = optionsRowsToLabelSet(
    rows,
    APPLICATION_SELECT_CATEGORIES.returnShippingBox,
  );

  if (reasonSet.size === 0) {
    return "返却理由のマスタが未設定です。application_select_option を投入してください。";
  }
  if (mainCodeSet.size === 0) {
    return "返却物のマスタが未設定です。application_select_option を投入してください。";
  }

  if (!employmentSet.has(body.userContractType.trim())) {
    return "雇用形態の値が不正です。";
  }
  if (!reasonSet.has(body.requestReason.trim())) {
    return "返却理由の値がマスタと一致しません。";
  }

  let hasOther = false;
  for (let i = 0; i < body.lines.length; i += 1) {
    const row = body.lines[i];
    const code = row.equipmentCode.trim();
    const label = row.equipmentLabel.trim();

    if (!mainCodeSet.has(code)) {
      return `機器 ${i + 1} 行目：返却物の値がマスタと一致しません。`;
    }
    if (mainLabelByCode.get(code) !== label) {
      return `機器 ${i + 1} 行目：表示名がマスタと一致しません。`;
    }

    if (code === RETURN_OTHER_EQUIPMENT_CODE) {
      hasOther = true;
      continue;
    }

    if (!row.assetManagementNumber.trim()) {
      return `機器 ${i + 1} 行目：資産管理番号を入力してください。`;
    }

    if (RETURN_SHIPPING_BOX_EQUIPMENT_CODES.has(code)) {
      if (!shippingBoxSet.has(row.shippingBoxChoice.trim())) {
        return `機器 ${i + 1} 行目：返却用梱包箱の値が不正です。`;
      }
    }

    const allowedAcc = accessoryLabelsByCode.get(code);
    for (const acc of row.accessories) {
      if (!allowedAcc?.has(acc.trim())) {
        return `機器 ${i + 1} 行目：付属品「${acc}」がマスタと一致しません。`;
      }
    }
  }

  if (hasOther && !body.otherItemsDetail.trim()) {
    return "「その他」を選択した場合は、返却物の詳細を入力してください。";
  }

  return null;
}
