"use server";

import { validateMasterImportSecret } from "@/lib/masterImportAuth";
import { parseHrPersonnelXlsx } from "@/lib/importHrPersonnelFromXlsx";
import { parseDeliverySiteMasterXlsx } from "@/lib/importDeliveryMasterFromXlsx";
import { parseThdLocationCsv } from "@/lib/importThdLocationFromCsv";
import {
  fetchMasterXlsxFromS3,
  getConfiguredDeliveryS3Key,
  getConfiguredHrS3Key,
} from "@/lib/masterImportS3";
import {
  replaceDeliverySiteMaster,
  replaceHrPersonnelRecords,
  replaceThdLocation,
  writeMasterImportLog,
} from "@/lib/replaceMasterTables";
import { syncThdLocationAddressFromDelivery } from "@/lib/masterSyncHooks";

export type MasterImportActionState = {
  ok: boolean;
  message: string;
  rowCount?: number;
  /** S3 同期のみ */
  results?: Record<string, { ok: boolean; rowCount?: number; error?: string }>;
};

function bad(message: string): MasterImportActionState {
  return { ok: false, message };
}

function good(message: string, rowCount: number): MasterImportActionState {
  return { ok: true, message, rowCount };
}

export async function importHrMasterAction(
  _prev: MasterImportActionState | null,
  formData: FormData,
): Promise<MasterImportActionState> {
  const auth = validateMasterImportSecret(formData.get("secret"));
  if (!auth.ok) return bad(auth.message);

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return bad("Excel ファイルを選択してください。");
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseHrPersonnelXlsx(buf);
    const rowCount = await replaceHrPersonnelRecords(rows);
    await writeMasterImportLog("HR_PERSONNEL", "manual", true, rowCount, null);
    return good(`人事マスタを ${rowCount} 件取り込みました（hr_personnel_record を全件置換）。`, rowCount);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeMasterImportLog("HR_PERSONNEL", "manual", false, null, msg);
    return bad(msg);
  }
}

export async function importDeliveryMasterAction(
  _prev: MasterImportActionState | null,
  formData: FormData,
): Promise<MasterImportActionState> {
  const auth = validateMasterImportSecret(formData.get("secret"));
  if (!auth.ok) return bad(auth.message);

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return bad("Excel ファイルを選択してください。");
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseDeliverySiteMasterXlsx(buf);
    const rowCount = await replaceDeliverySiteMaster(rows);
    await writeMasterImportLog("DELIVERY_MASTER", "manual", true, rowCount, null);
    const syncCount = await syncThdLocationAddressFromDelivery();
    return good(
      `納品先マスタを ${rowCount} 件取り込みました（ThdLocation ${syncCount} 件の住所を納品先マスタから同期）。`,
      rowCount,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeMasterImportLog("DELIVERY_MASTER", "manual", false, null, msg);
    return bad(msg);
  }
}

export async function syncMastersFromS3Action(
  _prev: MasterImportActionState | null,
  formData: FormData,
): Promise<MasterImportActionState> {
  const auth = validateMasterImportSecret(formData.get("secret"));
  if (!auth.ok) return bad(auth.message);

  const syncHr = formData.get("syncHr") === "on";
  const syncDelivery = formData.get("syncDelivery") === "on";
  if (!syncHr && !syncDelivery) {
    return bad("S3 から取り込む種類を 1 つ以上選んでください。");
  }

  const results: Record<string, { ok: boolean; rowCount?: number; error?: string }> = {};

  if (syncHr) {
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

  if (syncDelivery) {
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
        await syncThdLocationAddressFromDelivery();
        results.delivery = { ok: true, rowCount };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await writeMasterImportLog("DELIVERY_MASTER", "s3", false, null, msg);
        results.delivery = { ok: false, error: msg };
      }
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);
  const parts = Object.entries(results).map(([k, r]) => {
    if (r.ok) return `${k}: ${r.rowCount ?? 0} 件`;
    return `${k}: 失敗 — ${r.error ?? ""}`;
  });
  return {
    ok: allOk,
    message: allOk ? `S3 同期が完了しました（${parts.join(" / ")}）` : `一部失敗: ${parts.join(" / ")}`,
    results,
  };
}

export async function importThdLocationAction(
  _prev: MasterImportActionState | null,
  formData: FormData,
): Promise<MasterImportActionState> {
  const auth = validateMasterImportSecret(formData.get("secret"));
  if (!auth.ok) return bad(auth.message);

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return bad("CSV ファイルを選択してください。");
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseThdLocationCsv(buf);
    const rowCount = await replaceThdLocation(rows);
    await writeMasterImportLog("THD_LOCATION", "manual", true, rowCount, null);
    const syncCount = await syncThdLocationAddressFromDelivery();
    return good(
      `THD拠点マスタを ${rowCount} 件取り込みました（納品先マスタからの住所同期 ${syncCount} 件）。`,
      rowCount,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeMasterImportLog("THD_LOCATION", "manual", false, null, msg);
    return bad(msg);
  }
}
