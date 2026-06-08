import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requiresAccountingAttachment } from "@/lib/changeRequestConstants";
import {
  CHANGE_REQUEST_ATTACHMENT_MAX_FILES,
  saveChangeRequestAttachments,
  type StoredChangeRequestAttachment,
} from "@/lib/changeRequestAttachmentStore";
import {
  buildChangeRequestSubmissionPayload,
  type ChangeRequestSubmissionPayload,
} from "@/lib/changeRequestSubmissionPayload";
import { buildPreflightResponse, checkRateLimit, createRateLimitResponse, withCors } from "@/lib/apiSecurity";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { shouldFallbackToJsonSave } from "@/lib/dbSubmissionFallback";
import {
  hasLocalSubmissionDatabase,
  saveSubmissionJsonFile,
  useJsonSubmissionOnly as isJsonSubmissionOnlyMode,
} from "@/lib/jsonSubmissionStore";
import { getPrisma } from "@/lib/prisma";
import { createChangeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

async function parseRequestBody(req: Request): Promise<{
  body: unknown;
  attachmentFiles: Array<{ fileName: string; buffer: Buffer; mimeType: string }>;
}> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      throw new Error("multipart の payload フィールド（JSON）が必要です。");
    }
    const body = JSON.parse(payloadRaw) as unknown;
    const attachmentFiles: Array<{ fileName: string; buffer: Buffer; mimeType: string }> = [];
    for (const entry of form.getAll("accountingAttachments")) {
      if (typeof entry === "string") continue;
      const buf = Buffer.from(await entry.arrayBuffer());
      attachmentFiles.push({
        fileName: entry.name,
        buffer: buf,
        mimeType: entry.type || "application/octet-stream",
      });
    }
    return { body, attachmentFiles };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error("リクエスト形式が不正です。");
  }
  return { body, attachmentFiles: [] };
}

function buildSubmissionPayload(args: {
  body: ReturnType<typeof createChangeRequestSchema.parse>;
  changeRequestId: string;
  applicationCorrelationId: string;
  storedAttachments: StoredChangeRequestAttachment[];
  equipmentLines: Array<{ id: string; equipmentType: string; sortOrder: number }>;
  deptAndCostDeptWarning: boolean;
  persistReason: ChangeRequestSubmissionPayload["persistReason"];
  storageNote?: string;
}): ChangeRequestSubmissionPayload {
  const { body } = args;
  const includesCostDept =
    body.changeKind === "cost_dept_change" || body.changeKind === "both";
  const effectiveNewUser =
    body.changeKind === "period_extension" ? body.currentUser : body.newUser;

  return buildChangeRequestSubmissionPayload({
    applicant: {
      applicantName: body.applicantName,
      employeeNumber: body.employeeNumber,
      companyName: body.companyName,
      departmentName: body.departmentName,
      address: body.address,
      applicantJobTitle: body.applicantJobTitle ?? "",
      applicantEmail: body.applicantEmail ?? "",
      applicantPhone: body.applicantPhone ?? "",
    },
    changeKind: body.changeKind,
    currentUser: body.currentUser,
    newUser: effectiveNewUser,
    equipmentTypes: body.equipmentTypes,
    assetAmountYen: includesCostDept ? (body.assetAmountYen ?? null) : null,
    periodExtensionCurrentEndDate: body.periodExtensionCurrentEndDate ?? "",
    periodExtensionNewEndDate: body.periodExtensionNewEndDate ?? "",
    accountingAttachmentPreviews: args.storedAttachments.map((a) => ({
      originalFileName: a.originalFileName,
      sizeBytes: a.sizeBytes,
    })),
    deptAndCostDeptWarning: args.deptAndCostDeptWarning,
    applicationCorrelationId: args.applicationCorrelationId,
    changeRequestId: args.changeRequestId,
    savedAt: new Date().toISOString(),
    persistReason: args.persistReason,
    storageNote: args.storageNote,
    equipmentLines: args.equipmentLines,
    storedAttachments: args.storedAttachments,
  });
}

export async function POST(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "change-requests-post");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    let parsedBody: unknown;
    let attachmentFiles: Array<{ fileName: string; buffer: Buffer; mimeType: string }> = [];
    try {
      const parsed = await parseRequestBody(req);
      parsedBody = parsed.body;
      attachmentFiles = parsed.attachmentFiles;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "リクエスト形式が不正です。";
      return json({ error: msg }, { status: 400 });
    }

    const parsed = createChangeRequestSchema.safeParse(parsedBody);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msg =
        flat.fieldErrors.periodExtensionNewEndDate?.[0] ??
        flat.fieldErrors.periodExtensionCurrentEndDate?.[0] ??
        flat.fieldErrors.assetAmountYen?.[0] ??
        flat.fieldErrors.equipmentTypes?.[0] ??
        flat.fieldErrors.changeKind?.[0] ??
        "入力値が不正です。必須項目を確認してください。";
      return json({ error: msg }, { status: 400 });
    }

    const body = parsed.data;
    const includesCostDept =
      body.changeKind === "cost_dept_change" || body.changeKind === "both";
    const needsAttachment =
      includesCostDept && requiresAccountingAttachment(body.assetAmountYen ?? null);

    if (needsAttachment && attachmentFiles.length === 0) {
      return json(
        {
          error:
            "資産金額が10万円以上のため、経理部発行の資産登録変更資料の添付が必須です。",
        },
        { status: 400 },
      );
    }
    if (attachmentFiles.length > CHANGE_REQUEST_ATTACHMENT_MAX_FILES) {
      return json(
        { error: `添付ファイルは最大 ${CHANGE_REQUEST_ATTACHMENT_MAX_FILES} 件までです。` },
        { status: 400 },
      );
    }

    const applicationCorrelationId = body.applicationCorrelationId?.trim() || randomUUID();
    const changeRequestId = randomUUID();
    const equipmentLinesForSf = body.equipmentTypes.map((equipmentType, sortOrder) => ({
      id: randomUUID(),
      equipmentType,
      sortOrder,
    }));
    const requiresAccountingApproval = requiresAccountingAttachment(body.assetAmountYen ?? null);
    const deptAndCostDeptWarning = Boolean(body.flags?.deptAndCostDeptWarning);

    let storedAttachments: StoredChangeRequestAttachment[] = [];
    if (attachmentFiles.length > 0) {
      storedAttachments = await saveChangeRequestAttachments({
        changeRequestId,
        files: attachmentFiles,
      });
    }
    const accountingAttachmentsJson = JSON.stringify(storedAttachments);

    const periodCurrent =
      body.changeKind === "period_extension"
        ? parseIsoDateOnly(body.periodExtensionCurrentEndDate ?? "")
        : null;
    const periodNew =
      body.changeKind === "period_extension"
        ? parseIsoDateOnly(body.periodExtensionNewEndDate ?? "")
        : null;

    const effectiveNewUser =
      body.changeKind === "period_extension" ? body.currentUser : body.newUser;

    const createData = {
      id: changeRequestId,
      applicationCorrelationId,
      applicantName: body.applicantName.trim(),
      employeeNumber: body.employeeNumber.trim(),
      companyName: body.companyName.trim(),
      departmentName: body.departmentName.trim(),
      address: body.address.trim(),
      applicantJobTitle: (body.applicantJobTitle ?? "").trim(),
      applicantEmail: (body.applicantEmail ?? "").trim(),
      applicantPhone: (body.applicantPhone ?? "").trim(),
      changeKind: body.changeKind,
      currentUserName: body.currentUser.userName.trim(),
      currentUserEmployeeNumber: body.currentUser.userEmployeeNumber.trim(),
      currentUserCompanyName: (body.currentUser.userCompanyName ?? "").trim(),
      currentUserDepartmentName: (body.currentUser.userDepartmentName ?? "").trim(),
      currentUserDepartmentCode: (body.currentUser.userDepartmentCode ?? "").trim(),
      currentUserCostDeptName: (body.currentUser.userCostDeptName ?? "").trim(),
      currentUserCostDeptCode: (body.currentUser.userCostDeptCode ?? "").trim(),
      newUserName: effectiveNewUser.userName.trim(),
      newUserEmployeeNumber: effectiveNewUser.userEmployeeNumber.trim(),
      newUserCompanyName: (effectiveNewUser.userCompanyName ?? "").trim(),
      newUserDepartmentName: (effectiveNewUser.userDepartmentName ?? "").trim(),
      newUserDepartmentCode: (effectiveNewUser.userDepartmentCode ?? "").trim(),
      newUserCostDeptName: (effectiveNewUser.userCostDeptName ?? "").trim(),
      newUserCostDeptCode: (effectiveNewUser.userCostDeptCode ?? "").trim(),
      equipmentTypesJson: JSON.stringify(body.equipmentTypes),
      assetAmountYen: includesCostDept ? (body.assetAmountYen ?? null) : null,
      requiresAccountingApproval,
      periodExtensionCurrentEndDate: periodCurrent,
      periodExtensionNewEndDate: periodNew,
      accountingAttachmentsJson,
    };

    const buildPersistedPayload = (
      persistReason: ChangeRequestSubmissionPayload["persistReason"],
      storageNote?: string,
      idOverride?: string,
    ) =>
      buildSubmissionPayload({
        body,
        changeRequestId: idOverride ?? changeRequestId,
        applicationCorrelationId,
        storedAttachments,
        equipmentLines: equipmentLinesForSf,
        deptAndCostDeptWarning,
        persistReason,
        storageNote,
      });

    const writeJson = async (payload: ChangeRequestSubmissionPayload) => {
      const { fullPath, fileName } = await saveSubmissionJsonFile({
        prefix: "change-request",
        payload: {
          ...payload,
          storedAttachments,
        },
      });
      console.info("[POST /api/change-requests] JSON 保存", fullPath);
      return { fullPath, fileName };
    };

    const persistJsonOnly = async (reason: "json-mode" | "db-fallback") => {
      const payload = buildPersistedPayload(
        reason,
        reason === "json-mode"
          ? "DB 未設定または JSON 必須モード。`docker/JSON/議事送信` へ保存。"
          : "DB 保存失敗のため JSON へフォールバック保存。",
      );
      console.info(
        "[POST /api/change-requests] Salesforce placeholder payloads (per equipment type)",
        JSON.stringify(payload.salesforcePayloadsByEquipmentType, null, 2),
      );
      const { fullPath } = await writeJson(payload);
      return json(
        {
          id: changeRequestId,
          applicationCorrelationId,
          requiresAccountingApproval,
          attachmentCount: storedAttachments.length,
          persistedTo: "json" as const,
          jsonAuditPath: fullPath,
          salesforcePayloadsByEquipmentType: payload.salesforcePayloadsByEquipmentType,
        },
        { status: 201 },
      );
    };

    if (isJsonSubmissionOnlyMode()) {
      if (!hasLocalSubmissionDatabase()) {
        return await persistJsonOnly("json-mode");
      }
      try {
        const created = await getPrisma().changeRequest.create({ data: createData });
        const payload = buildPersistedPayload(
          "json-mode",
          "THD_SUBMISSION_MODE=json かつ DATABASE_URL あり。下流用 JSON とローカル DB へ二重保存。",
          created.id,
        );
        console.info(
          "[POST /api/change-requests] Salesforce placeholder payloads (per equipment type)",
          JSON.stringify(payload.salesforcePayloadsByEquipmentType, null, 2),
        );
        const { fullPath } = await writeJson(payload);
        return json(
          {
            id: created.id,
            applicationCorrelationId,
            requiresAccountingApproval,
            attachmentCount: storedAttachments.length,
            persistedTo: "db" as const,
            jsonAuditPath: fullPath,
            salesforcePayloadsByEquipmentType: payload.salesforcePayloadsByEquipmentType,
          },
          { status: 201 },
        );
      } catch (dbErr) {
        console.warn(
          "[POST /api/change-requests] THD_SUBMISSION_MODE=json: DB 保存失敗 — JSON のみ",
          dbErr,
        );
        return await persistJsonOnly("json-mode");
      }
    }

    try {
      const created = await getPrisma().changeRequest.create({ data: createData });
      const payload = buildPersistedPayload(
        "db-with-json-audit",
        "DB 保存成功後、下流連携用 JSON を `docker/JSON/議事送信` へ併存保存。",
        created.id,
      );
      console.info(
        "[POST /api/change-requests] Salesforce placeholder payloads (per equipment type)",
        JSON.stringify(payload.salesforcePayloadsByEquipmentType, null, 2),
      );
      const { fullPath } = await writeJson(payload);
      return json(
        {
          id: created.id,
          applicationCorrelationId,
          requiresAccountingApproval,
          attachmentCount: storedAttachments.length,
          persistedTo: "db" as const,
          jsonAuditPath: fullPath,
          salesforcePayloadsByEquipmentType: payload.salesforcePayloadsByEquipmentType,
        },
        { status: 201 },
      );
    } catch (dbErr) {
      if (shouldFallbackToJsonSave(dbErr)) {
        console.warn("[POST /api/change-requests] DB エラー — JSON にフォールバック", dbErr);
        return await persistJsonOnly("db-fallback");
      }
      throw dbErr;
    }
  } catch (e) {
    console.error("[POST /api/change-requests]", e);
    const msg = e instanceof Error ? e.message : "";
    const dbRelated = /change_request|does not exist|relation|column/i.test(msg);
    return json(
      {
        error: dbRelated
          ? "データベースが最新ではありません。変更依頼用のマイグレーションを適用してください（`npm run db:migrate`）。"
          : "登録処理でエラーが発生しました。",
      },
      { status: 500 },
    );
  }
}
