import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";
import { cellToString } from "@/lib/xlsxCell";

/** サンプル Excel 1 行目と一致させる（列名がずれると import 時にエラー） */
const HR_JP_TO_FIELD: {
  jp: string;
  field: keyof Omit<Prisma.HrPersonnelRecordCreateManyInput, "importedAt">;
}[] = [
  { jp: "社員番号", field: "employeeNumber" },
  { jp: "社員名称", field: "employeeName" },
  { jp: "社員カナ名称", field: "employeeNameKana" },
  { jp: "所属会社コード［＊］", field: "companyCode" },
  { jp: "会社名称", field: "companyName" },
  { jp: "所属部署コード［＊］", field: "departmentCode" },
  { jp: "所属名称", field: "departmentName" },
  { jp: "役職コード［＊］", field: "jobTitleCode" },
  { jp: "役職名称", field: "jobTitleName" },
  { jp: "社員区分［＊］", field: "employeeCategoryCode" },
  { jp: "社員区分", field: "employeeCategory" },
  { jp: "職位コード［＊］", field: "positionCode" },
  { jp: "職位名称", field: "positionName" },
  { jp: "職種コード［＊］", field: "occupationCode" },
  { jp: "職種名称", field: "occupationName" },
  { jp: "雇用形態［＊］", field: "employmentTypeCode" },
  { jp: "雇用形態", field: "employmentType" },
  { jp: "グループ入社日", field: "groupJoinDate" },
  { jp: "採用発令日", field: "hireDate" },
  { jp: "出向先会社コード［＊］", field: "secondmentCompanyCode" },
  { jp: "出向先会社名称", field: "secondmentCompanyName" },
  { jp: "出向先部署コード［＊］", field: "secondmentDeptCode" },
  { jp: "出向先所属名称", field: "secondmentDeptName" },
  { jp: "退職区分［＊］", field: "retirementCategoryCode" },
  { jp: "退職区分", field: "retirementCategory" },
  { jp: "[退職]発令内容名称", field: "retirementOrderName" },
  { jp: "退職年月日", field: "retirementDate" },
  { jp: "生年月日", field: "birthDate" },
  { jp: "カンパニーコード［＊］", field: "businessCompanyCode" },
  { jp: "カンパニー略称", field: "businessCompanyShort" },
  { jp: "本名（漢字）", field: "legalNameKanji" },
  { jp: "ADアカウント", field: "adAccount" },
  { jp: "システム使用アドレス", field: "systemEmail" },
  { jp: "休職区分", field: "leaveCategory" },
  { jp: "休職日付", field: "leaveDate" },
  { jp: "復職予定日", field: "returnScheduledDate" },
  { jp: "採用区分", field: "recruitmentCategory" },
  { jp: "転入前会社", field: "previousCompany" },
  { jp: "常駐先コード［＊］", field: "residentSiteCode" },
  { jp: "常駐先名称", field: "residentSiteName" },
  { jp: "内定者区分", field: "tentativeHireCategory" },
];

export function parseHrPersonnelXlsx(buffer: Buffer): Prisma.HrPersonnelRecordCreateManyInput[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("シートがありません。");
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(unknown | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  if (matrix.length === 0) {
    throw new Error("シートが空です。");
  }

  const headerRow = matrix[0].map((h) => (h == null ? "" : String(h).trim()));
  const colByJp = new Map<string, number>();
  headerRow.forEach((h, i) => {
    if (h) colByJp.set(h, i);
  });

  if (!colByJp.has("社員番号")) {
    throw new Error("必須列「社員番号」が見つかりません。1 行目の列名を確認してください。");
  }

  const rows: Prisma.HrPersonnelRecordCreateManyInput[] = [];
  let dataLinesWithCells = 0;
  let linesMissingEmployeeNumber = 0;

  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r];
    if (!line || line.every((c) => c == null || c === "")) continue;
    dataLinesWithCells++;

    let employeeNumber: string | undefined;
    const record: Record<string, string> = {};

    for (const { jp, field } of HR_JP_TO_FIELD) {
      const idx = colByJp.get(jp);
      if (idx === undefined) continue;
      const s = cellToString(line[idx]);
      if (field === "employeeNumber") {
        employeeNumber = s;
      } else if (s !== undefined) {
        record[field] =
          field === "departmentCode" ? (normalizeDepartmentCode(s) ?? s) : s;
      }
    }

    if (!employeeNumber) {
      linesMissingEmployeeNumber++;
      continue;
    }
    rows.push({
      employeeNumber,
      ...(record as Omit<Prisma.HrPersonnelRecordCreateManyInput, "employeeNumber">),
    });
  }

  if (rows.length === 0) {
    if (dataLinesWithCells === 0) {
      throw new Error(
        "Excel にデータ行がありません（1 行目ヘッダの下に行がないか、すべて空行です。別シートにデータがある場合は先頭シートへ移してください）。",
      );
    }
    throw new Error(
      `「社員番号」が取れる行がありません（データらしき行 ${dataLinesWithCells} 行のうち社員番号が空の行が ${linesMissingEmployeeNumber} 行）。列のずれや 1 行目ヘッダ名の完全一致を確認してください。`,
    );
  }

  return rows;
}
