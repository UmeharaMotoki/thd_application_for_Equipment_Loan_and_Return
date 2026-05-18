import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { cellToString } from "@/lib/xlsxCell";

const DELIVERY_HEADERS = {
  deliveryCompanyName: "送付先会社名",
  deliverySite: "送付先拠点",
  searchKey: "検索値",
  postalCode: "送付先郵便番号",
  address: "送付先住所",
  building: "送付先ビル名",
  phone: "電話番号",
  itamLocation: "ITAM機器設置場所",
} as const;

export function parseDeliverySiteMasterXlsx(
  buffer: Buffer,
): Prisma.DeliverySiteMasterCreateManyInput[] {
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

  for (const jp of Object.values(DELIVERY_HEADERS)) {
    if (!colByJp.has(jp)) {
      throw new Error(`必須列「${jp}」が見つかりません。1 行目の列名を確認してください。`);
    }
  }

  const rows: Prisma.DeliverySiteMasterCreateManyInput[] = [];
  let dataLinesWithCells = 0;

  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r];
    if (!line || line.every((c) => c == null || c === "")) continue;
    dataLinesWithCells++;

    const row: Prisma.DeliverySiteMasterCreateManyInput = {};

    for (const [field, jp] of Object.entries(DELIVERY_HEADERS)) {
      const idx = colByJp.get(jp)!;
      const s = cellToString(line[idx]);
      if (s !== undefined) {
        (row as Record<string, string>)[field] = s;
      }
    }

    if (!row.deliveryCompanyName && !row.searchKey && !row.deliverySite) {
      continue;
    }

    rows.push(row);
  }

  if (rows.length === 0) {
    if (dataLinesWithCells === 0) {
      throw new Error(
        "Excel にデータ行がありません（1 行目ヘッダの下に行がないか、すべて空行です）。",
      );
    }
    throw new Error(
      "送付先会社名・検索値・送付先拠点のいずれかが入った行がありません。列名のずれや空行のみになっていないか確認してください。",
    );
  }

  return rows;
}
