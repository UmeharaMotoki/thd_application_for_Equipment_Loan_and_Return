import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";
import {
  fetchActiveOptionsByCategories,
  optionsRowsToLabelSet,
} from "@/lib/applicationSelectOptionsQueries";
import { getEmploymentTypeLabelSetForValidation } from "@/lib/employmentTypeOptions";
import { LENDING_EQUIPMENT_TYPE_OPTIONS } from "@/lib/lendingEquipmentOptions";
import { RETURN_REQUEST_REASON_OPTIONS } from "@/lib/equipmentReturnReasonOptions";
import { createEquipmentReturnRequestSchema } from "@/lib/validators";

type ReturnBody = z.infer<typeof createEquipmentReturnRequestSchema>;

const RETURN_FETCH_CATEGORIES = [
  APPLICATION_SELECT_CATEGORIES.returnRequestReason,
  APPLICATION_SELECT_CATEGORIES.lendingEquipmentType,
] as const;

function mergeSet(db: Set<string>, fallback: readonly string[]): Set<string> {
  return db.size > 0 ? db : new Set(fallback);
}

export async function validateEquipmentReturnPostAgainstMasters(
  prisma: PrismaClient,
  body: ReturnBody,
): Promise<string | null> {
  const [rows, employmentSet] = await Promise.all([
    fetchActiveOptionsByCategories(prisma, [...RETURN_FETCH_CATEGORIES]),
    getEmploymentTypeLabelSetForValidation(prisma),
  ]);

  const reasonSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.returnRequestReason),
    RETURN_REQUEST_REASON_OPTIONS,
  );
  const equipmentSet = mergeSet(
    optionsRowsToLabelSet(rows, APPLICATION_SELECT_CATEGORIES.lendingEquipmentType),
    LENDING_EQUIPMENT_TYPE_OPTIONS,
  );

  if (!employmentSet.has(body.userContractType.trim())) {
    return "契約形態（雇用形態）の値が不正です。";
  }
  if (!reasonSet.has(body.requestReason.trim())) {
    return "申請理由の値が不正です。";
  }

  for (let i = 0; i < body.lines.length; i += 1) {
    const name = body.lines[i].equipmentName.trim();
    if (!equipmentSet.has(name)) {
      return `機器 ${i + 1} 行目：名称の値がマスタと一致しません。`;
    }
  }

  return null;
}
