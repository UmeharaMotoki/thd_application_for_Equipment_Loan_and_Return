import type { Prisma } from "@prisma/client";
import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";

const CSV_HEADERS = [
  "departmentCode",
  "companyName",
  "departmentName",
  "residentSiteName",
  "deliverySite",
  "area",
  "postalCode",
  "address",
  "buildingName",
] as const;

const EXPECTED_JP_HEADERS = [
  "所属部署コード",
  "会社名称",
  "所属名称",
  "常駐先名称",
  "送付先拠点",
  "エリア",
  "郵便番号",
  "住所",
  "ビル名",
] as const;

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function parseThdLocationCsv(
  buf: Buffer,
): Prisma.ThdLocationCreateManyInput[] {
  const text = buf.toString("utf-8");
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
  if (rawLines.length < 2) {
    throw new Error("CSV にデータ行がありません。");
  }

  const headerFields = parseCSVLine(rawLines[0]);
  if (headerFields.length < EXPECTED_JP_HEADERS.length) {
    throw new Error(
      `ヘッダ列数が不足しています（期待 ${EXPECTED_JP_HEADERS.length} 列、実際 ${headerFields.length} 列）。`,
    );
  }

  for (let i = 0; i < EXPECTED_JP_HEADERS.length; i++) {
    if (headerFields[i].trim() !== EXPECTED_JP_HEADERS[i]) {
      throw new Error(
        `ヘッダ ${i + 1} 列目が「${EXPECTED_JP_HEADERS[i]}」ではなく「${headerFields[i].trim()}」です。`,
      );
    }
  }

  const rows: Prisma.ThdLocationCreateManyInput[] = [];

  for (let r = 1; r < rawLines.length; r++) {
    const fields = parseCSVLine(rawLines[r]);
    if (fields.every((f) => !f.trim())) continue;

    const record: Record<string, string> = {};
    for (let c = 0; c < CSV_HEADERS.length; c++) {
      record[CSV_HEADERS[c]] = (fields[c] ?? "").trim();
    }

    const departmentCode = normalizeDepartmentCode(record.departmentCode);
    if (!departmentCode) continue;

    rows.push({
      departmentCode,
      companyName: record.companyName || null,
      departmentName: record.departmentName || null,
      residentSiteName: record.residentSiteName || null,
      deliverySite: record.deliverySite || null,
      area: record.area || null,
      postalCode: record.postalCode || null,
      address: record.address || null,
      buildingName: record.buildingName || null,
    });
  }

  if (rows.length === 0) {
    throw new Error("有効なデータ行がありません。");
  }

  return rows;
}
