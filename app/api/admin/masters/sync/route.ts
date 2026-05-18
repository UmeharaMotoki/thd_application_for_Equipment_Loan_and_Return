import { NextResponse } from "next/server";
import { masterImportUnauthorized } from "@/lib/masterImportAuth";
import { parseHrPersonnelXlsx } from "@/lib/importHrPersonnelFromXlsx";
import { parseDeliverySiteMasterXlsx } from "@/lib/importDeliveryMasterFromXlsx";
import {
  fetchMasterXlsxFromS3,
  getConfiguredDeliveryS3Key,
  getConfiguredHrS3Key,
} from "@/lib/masterImportS3";
import {
  replaceDeliverySiteMaster,
  replaceHrPersonnelRecords,
  writeMasterImportLog,
} from "@/lib/replaceMasterTables";

export const runtime = "nodejs";

type SyncBody = { types?: string[] };

/**
 * S3 から xlsx を取得して各テーブルを全件差し替え。
 * POST JSON: { "types": ["hr", "delivery"] } 省略時は両方試行。
 * 要: MASTER_S3_BUCKET, MASTER_S3_HR_KEY, MASTER_S3_DELIVERY_KEY（該当する取込のみ）
 * 認証: x-master-import-secret または Bearer
 */
export async function POST(req: Request) {
  const denied = masterImportUnauthorized(req);
  if (denied) return denied;

  let body: SyncBody = {};
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    body = {};
  }

  const requested = Array.isArray(body.types) ? body.types : null;
  const includeHr = !requested?.length || requested.includes("hr");
  const includeDelivery = !requested?.length || requested.includes("delivery");
  const results: Record<string, { ok: boolean; rowCount?: number; error?: string }> = {};

  if (includeHr) {
    const key = getConfiguredHrS3Key();
    if (!key) {
      const err = "MASTER_S3_HR_KEY が未設定です。";
      results.hr = { ok: false, error: err };
      await writeMasterImportLog("HR_PERSONNEL", "s3", false, null, err);
    } else {
      try {
        const buf = await fetchMasterXlsxFromS3(key);
        const rows = parseHrPersonnelXlsx(buf);
        const rowCount = await replaceHrPersonnelRecords(rows);
        await writeMasterImportLog("HR_PERSONNEL", "s3", true, rowCount, null);
        results.hr = { ok: true, rowCount };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await writeMasterImportLog("HR_PERSONNEL", "s3", false, null, msg);
        results.hr = { ok: false, error: msg };
      }
    }
  }

  if (includeDelivery) {
    const key = getConfiguredDeliveryS3Key();
    if (!key) {
      const err = "MASTER_S3_DELIVERY_KEY が未設定です。";
      results.delivery = { ok: false, error: err };
      await writeMasterImportLog("DELIVERY_MASTER", "s3", false, null, err);
    } else {
      try {
        const buf = await fetchMasterXlsxFromS3(key);
        const rows = parseDeliverySiteMasterXlsx(buf);
        const rowCount = await replaceDeliverySiteMaster(rows);
        await writeMasterImportLog("DELIVERY_MASTER", "s3", true, rowCount, null);
        results.delivery = { ok: true, rowCount };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await writeMasterImportLog("DELIVERY_MASTER", "s3", false, null, msg);
        results.delivery = { ok: false, error: msg };
      }
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}
