import { NextResponse } from "next/server";
import { masterImportUnauthorized } from "@/lib/masterImportAuth";
import { parseHrPersonnelXlsx } from "@/lib/importHrPersonnelFromXlsx";
import { replaceHrPersonnelRecords, writeMasterImportLog } from "@/lib/replaceMasterTables";

export const runtime = "nodejs";

/**
 * 全社人員データ xlsx を multipart（field: file）でアップロードし、hr_personnel_record を全件差し替え。
 * 認証: x-master-import-secret または Authorization: Bearer
 */
export async function POST(req: Request) {
  const denied = masterImportUnauthorized(req);
  if (denied) return denied;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Excel ファイルが必要です（multipart フィールド名: file）。" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseHrPersonnelXlsx(buf);
    const rowCount = await replaceHrPersonnelRecords(rows);
    await writeMasterImportLog("HR_PERSONNEL", "manual", true, rowCount, null);

    return NextResponse.json({ ok: true, rowCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeMasterImportLog("HR_PERSONNEL", "manual", false, null, msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
