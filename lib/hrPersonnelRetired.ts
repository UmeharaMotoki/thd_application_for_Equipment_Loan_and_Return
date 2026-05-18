/**
 * 機器貸与フォーム用。人事マスタの退職年月日・退職区分から「退職済み」とみなすか。
 * - 退職年月日が本日以前（日付のみ比較）→ 退職済み
 * - 退職年月日が未来のみ → 在籍扱い（予定退職）
 * - 日付が空で退職区分に「退職」等が含まれる → 退職済み（「未退職」「在籍」は除外）
 */

export const EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE =
  "人事マスタ上、この方は退職扱いです。退職者のため、本フォームからは機器貸与をお申し込みいただけません。窓口までお問い合わせください。";

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 日付のみを解釈できる形式のみ対応（Excel 取込の文字列想定） */
export function parseHrRetirementDateString(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, mo, da] = t.split("-").map(Number);
    const dt = new Date(y, mo - 1, da);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const norm = t.replace(/\./g, "/");
  const m2 = norm.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m2) {
    const dt = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const m3 = t.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
  if (m3) {
    const dt = new Date(Number(m3[1]), Number(m3[2]) - 1, Number(m3[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const digits = t.replace(/\D/g, "");
  if (digits.length === 8) {
    const y = Number(digits.slice(0, 4));
    const mo = Number(digits.slice(4, 6));
    const da = Number(digits.slice(6, 8));
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const dt = new Date(y, mo - 1, da);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
  }

  return null;
}

export function isHrPersonnelRetired(input: {
  retirementDate?: string | null;
  retirementCategory?: string | null;
  retirementCategoryCode?: string | null;
}): boolean {
  const dateStr = String(input.retirementDate ?? "").trim();
  const catRaw = `${String(input.retirementCategory ?? "").trim()} ${String(input.retirementCategoryCode ?? "").trim()}`;

  if (/未退職|在籍|現職|勤務中/.test(catRaw)) {
    return false;
  }

  if (dateStr) {
    const parsed = parseHrRetirementDateString(dateStr);
    if (parsed) {
      const today = startOfTodayLocal();
      return parsed.getTime() <= today.getTime();
    }
    return true;
  }

  if (/退職|離職|解雇|退任/.test(catRaw)) {
    return true;
  }

  return false;
}
