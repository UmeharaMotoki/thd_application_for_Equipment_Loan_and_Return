import { writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { buildLendingExportFileName, resolveLendingExportDirectory } from "@/lib/lendingExportDir";
import {
  buildLendingPersonExportSheet,
  type LendingExportSource,
  type LendingPersonExportRow,
} from "@/lib/lendingExportRows";

const TITLE = "機器貸与申請（複数利用者情報）";

const BASE_COL_WIDTHS = [18, 14, 12, 22, 24, 36, 28, 14] as const;
const EQUIPMENT_COL_WIDTH = 16;
const DATE_COL_WIDTH = 12;

function rowToArray(row: LendingPersonExportRow, maxEquipmentSlots: number): string[] {
  const base = [
    row.kubun,
    row.name,
    row.employeeNumber,
    row.companyName,
    row.departmentName,
    row.address,
    row.email,
    row.phone,
  ];
  const equipmentCols: string[] = [];
  for (let i = 0; i < maxEquipmentSlots; i++) {
    equipmentCols.push(row.equipmentTypes[i] ?? "");
  }
  return [...base, ...equipmentCols, row.lendingStartDate, row.expectedReturnDate];
}

export function buildLendingPersonExportWorkbook(
  sheet: ReturnType<typeof buildLendingPersonExportSheet>,
): XLSX.WorkBook {
  const { headers, rows, maxEquipmentSlots } = sheet;
  const lastCol = headers.length - 1;
  const aoa: string[][] = [
    [TITLE],
    [...headers],
    ...rows.map((r) => rowToArray(r, maxEquipmentSlots)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
  ws["!cols"] = [
    ...BASE_COL_WIDTHS.map((wch) => ({ wch })),
    ...Array.from({ length: maxEquipmentSlots }, () => ({ wch: EQUIPMENT_COL_WIDTH })),
    { wch: DATE_COL_WIDTH },
    { wch: DATE_COL_WIDTH },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 2, topLeftCell: "A3", activePane: "bottomLeft", state: "frozen" };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "利用者情報（複数）");
  return wb;
}

export type LendingExportWriteResult = {
  fileName: string;
  absolutePath: string;
  directory: string;
};

/** PoC: 要件定義/テスト へ xlsx を書き出す（SF 添付は未実装） */
export async function writeLendingPersonExportFile(
  request: LendingExportSource,
  at = new Date(),
): Promise<LendingExportWriteResult> {
  const sheet = buildLendingPersonExportSheet(request);
  const wb = buildLendingPersonExportWorkbook(sheet);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const directory = resolveLendingExportDirectory();
  const fileName = buildLendingExportFileName(request.applicationCorrelationId, at);
  const absolutePath = path.join(directory, fileName);
  await writeFile(absolutePath, buffer);
  console.info("[lending-export] wrote:", absolutePath);
  return { fileName, absolutePath, directory };
}

export function lendingExportWorkbookToBuffer(request: LendingExportSource): Buffer {
  const sheet = buildLendingPersonExportSheet(request);
  const wb = buildLendingPersonExportWorkbook(sheet);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
