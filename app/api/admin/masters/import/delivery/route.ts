import { NextResponse } from "next/server";
import { masterImportUnauthorized } from "@/lib/masterImportAuth";
import { parseDeliverySiteMasterXlsx } from "@/lib/importDeliveryMasterFromXlsx";
import { replaceDeliverySiteMaster, writeMasterImportLog } from "@/lib/replaceMasterTables";

export const runtime = "nodejs";

/**
 * 納品先マスタ xlsx を multipart（field: file）でアップロードし、delivery_site_master を全件差し替え。
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
    const rows = parseDeliverySiteMasterXlsx(buf);
    const rowCount = await replaceDeliverySiteMaster(rows);
    await writeMasterImportLog("DELIVERY_MASTER", "manual", true, rowCount, null);

    return NextResponse.json({ ok: true, rowCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeMasterImportLog("DELIVERY_MASTER", "manual", false, null, msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
