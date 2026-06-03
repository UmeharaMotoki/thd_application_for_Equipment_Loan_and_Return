import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { validateLendingPostAgainstMasters } from "@/lib/equipmentLendingPostMasterValidation";
import {
  lendingLinesIncludePc,
  LENDING_NON_PC_STAFF_CATEGORY,
} from "@/lib/lendingEquipmentOptions";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse, withCors, buildPreflightResponse } from "@/lib/apiSecurity";
import { formatDateOnlyUtc } from "@/lib/mapEquipmentRequestToPrefill";
import { normalizeApplicantEmployeeNumber } from "@/lib/requestHistoryAuthz";
import { shouldFallbackToJsonSave } from "@/lib/dbSubmissionFallback";
import {
  hasLocalSubmissionDatabase,
  saveSubmissionJsonFile,
  useJsonSubmissionOnly,
} from "@/lib/jsonSubmissionStore";
import { buildSalesforcePerLinePayloads } from "@/lib/salesforceEquipmentLendingPayload";
import {
  buildLendingPrismaCreateData,
  licenseMapFromResolved,
  normalizedLinesFromBody,
  validateLendingLineAssignees,
} from "@/lib/lendingPostHelpers";
import { buildLendingExportSourceFromPost } from "@/lib/lendingExportRows";
import { writeLendingPersonExportFile } from "@/lib/lendingRegistrationExport";
import { resolveUserLicensesForLendingPost } from "@/lib/lendingResolveUserLicenses";
import { buildLendingUserPool } from "@/lib/lendingUserPool";
import { createLendingRequestSchema, lendingRequestListQuerySchema } from "@/lib/validators";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

/** 貸与の過去申請一覧（申請者社員番号一致・直近3か月 / テンプレート期間を含む）。貸与と返却の統合一覧は GET /api/past-requests。 */
export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "requests-get");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    const url = new URL(req.url);
    const parsed = lendingRequestListQuerySchema.safeParse({
      applicantEmployeeNumber: url.searchParams.get("applicantEmployeeNumber") ?? "",
      filterApplicantName: url.searchParams.get("filterApplicantName"),
      filterUserEmployeeNumber: url.searchParams.get("filterUserEmployeeNumber"),
      includeArchived: url.searchParams.get("includeArchived"),
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.applicantEmployeeNumber?.[0] ?? "クエリが不正です。";
      return json({ error: msg }, { status: 400 });
    }
    const {
      applicantEmployeeNumber,
      filterApplicantName,
      filterUserEmployeeNumber,
      includeArchived,
      limit,
      offset,
    } = parsed.data;
    const emp = normalizeApplicantEmployeeNumber(applicantEmployeeNumber);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    if (useJsonSubmissionOnly() && !hasLocalSubmissionDatabase()) {
      return json({ total: 0, items: [] });
    }

    const prisma = getPrisma();
    const where: Prisma.EquipmentRequestWhereInput = {
      employeeNumber: emp,
      ...(!includeArchived ? { createdAt: { gte: threeMonthsAgo } } : {}),
    };
    if (filterApplicantName) {
      where.applicantName = { contains: filterApplicantName, mode: "insensitive" };
    }
    if (filterUserEmployeeNumber) {
      where.userEmployeeNumber = { contains: filterUserEmployeeNumber, mode: "insensitive" };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.equipmentRequest.count({ where }),
      prisma.equipmentRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          applicantName: true,
          userName: true,
          userEmployeeNumber: true,
          requestReason: true,
          lendingStartDate: true,
          expectedReturnDate: true,
        },
      }),
    ]);

    return json({
      total,
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        applicantName: r.applicantName,
        userName: r.userName,
        userEmployeeNumber: r.userEmployeeNumber,
        requestReason: r.requestReason,
        lendingStartDate: formatDateOnlyUtc(r.lendingStartDate),
        expectedReturnDate: formatDateOnlyUtc(r.expectedReturnDate),
        isArchived: r.createdAt.getTime() < threeMonthsAgo.getTime(),
      })),
    });
  } catch (e) {
    console.error("[GET /api/requests]", e);
    return json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "requests-post");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json({ error: "リクエスト形式が不正です。" }, { status: 400 });
    }

    const parsed = createLendingRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ error: "入力値が不正です。必須項目を確認してください。" }, { status: 400 });
    }
    const body = parsed.data;

    if (!body.employeeNumber) {
      return json(
        {
          error:
            "申請者の社員番号がありません。社員番号が未付与の場合は本フォームからは申請できません。",
        },
        { status: 400 },
      );
    }
    if (!body.userEmployeeNumber) {
      return json(
        {
          error:
            "利用者の社員番号がありません。社員番号が未付与の場合は本フォームからは申請できません。",
        },
        { status: 400 },
      );
    }

    const assignErr = validateLendingLineAssignees(body);
    if (assignErr) {
      return json({ error: assignErr }, { status: 400 });
    }

    const normalizedLines = normalizedLinesFromBody(body);
    const normalizedEquipmentTypes = normalizedLines.map((l) => l.equipmentType);

    const masterErr = await validateLendingPostAgainstMasters(getPrisma(), body, normalizedEquipmentTypes);
    if (masterErr) {
      return json({ error: masterErr }, { status: 400 });
    }

    const includesPc = lendingLinesIncludePc(
      normalizedEquipmentTypes.map((equipmentType) => ({ equipmentType })),
    );

    const licenseResult = resolveUserLicensesForLendingPost(body);
    if (!licenseResult.ok) {
      return json({ error: licenseResult.error }, { status: 400 });
    }

    const { representative, licenses: userLicensesResolved } = licenseResult;

    const validateLendingScheduleDate = (label: string, value: string): Date | null => {
      const parsed = parseIsoDateOnly(value);
      if (!parsed) return null;
      const minAllowedDate = new Date();
      minAllowedDate.setHours(0, 0, 0, 0);
      minAllowedDate.setDate(minAllowedDate.getDate() + 7);
      const isWeekday = (date: Date) => {
        const day = date.getDay();
        return day >= 1 && day <= 5;
      };
      if (parsed.getTime() < minAllowedDate.getTime()) {
        return null;
      }
      if (!isWeekday(parsed)) {
        return null;
      }
      return parsed;
    };

    for (const lic of userLicensesResolved) {
      const lendingStartUser = validateLendingScheduleDate("貸与開始日", lic.lendingStartDate);
      const expectedReturnUser = validateLendingScheduleDate("返却予定日", lic.expectedReturnDate);
      if (!lendingStartUser || !expectedReturnUser) {
        return json(
          {
            error: `利用者（社員番号: ${lic.userEmployeeNumber}）の貸与開始日・返却予定日は、本日から1週間後以降の平日を選択してください。`,
          },
          { status: 400 },
        );
      }
      if (expectedReturnUser.getTime() < lendingStartUser.getTime()) {
        return json(
          {
            error: `利用者（社員番号: ${lic.userEmployeeNumber}）の返却予定日は貸与開始日以降にしてください。`,
          },
          { status: 400 },
        );
      }
    }

    const lendingStart = parseIsoDateOnly(representative.lendingStartDate);
    const expectedReturn = parseIsoDateOnly(representative.expectedReturnDate);
    if (!lendingStart || !expectedReturn) {
      return json(
        { error: "代表利用者の貸与開始日・返却予定日は正しい日付で選択してください。" },
        { status: 400 },
      );
    }
    const licenseByEmployee = licenseMapFromResolved(userLicensesResolved);
    const userPool = buildLendingUserPool(body);

    const requestDetail = (body.requestDetail ?? "").trim();

    const applicationCorrelationId =
      body.applicationCorrelationId?.trim() || randomUUID();

    const lendingCreateData = buildLendingPrismaCreateData({
      body,
      applicationCorrelationId,
      lendingStart,
      expectedReturn,
      requestDetail,
      representative,
      userLicenses: userLicensesResolved,
      normalizedLines,
    });

    const buildSfPayloads = (
      equipmentRequestId: string,
      dbLines: Array<{
        id: string;
        equipmentType: string;
        sortOrder: number;
        assignedUserEmployeeNumber: string;
      }>,
    ) =>
      buildSalesforcePerLinePayloads({
        applicationCorrelationId,
        equipmentRequestId,
        lines: dbLines,
        body,
        userPool,
        licenseByEmployee,
        representativeEmployeeNumber: body.userEmployeeNumber.trim(),
      });

    const runExport = async (requestId: string) => {
      try {
        const full = await getPrisma().equipmentRequest.findUnique({
          where: { id: requestId },
          include: {
            additionalUsers: { orderBy: { sortOrder: "asc" } },
            lines: { orderBy: { sortOrder: "asc" } },
            userLicenses: true,
          },
        });
        if (!full) return null;
        const written = await writeLendingPersonExportFile(full);
        return {
          fileName: written.fileName,
          absolutePath: written.absolutePath,
          downloadPath: `/api/requests/${requestId}/export`,
        };
      } catch (exportErr) {
        console.warn("[POST /api/requests] lending export failed", exportErr);
        return null;
      }
    };

    const persistLendingAsJson = async (persistReason: "json-mode" | "db-fallback") => {
      const equipmentRequestId = randomUUID();
      const linesForSf = normalizedLines.map((line, sortOrder) => ({
        id: randomUUID(),
        equipmentType: line.equipmentType,
        sortOrder,
        assignedUserEmployeeNumber: line.assignedUserEmployeeNumber,
      }));
      const salesforcePayloadsByLine = buildSfPayloads(equipmentRequestId, linesForSf);

      const { fullPath } = await saveSubmissionJsonFile({
        prefix: "equipment-lending",
        payload: {
          schemaVersion: 1,
          kind: "equipment-lending",
          savedAt: new Date().toISOString(),
          applicationCorrelationId,
          equipmentRequestId,
          persistReason,
          storageNote:
            persistReason === "json-mode"
              ? "DB 未設定モード。`docker/JSON/議事送信` へ保存。"
              : "DB 保存に失敗したため `docker/JSON/議事送信` へフォールバック保存。",
          clientRequest: body,
          resolvedLicense: representative,
          userLicenses: userLicensesResolved,
          lendingStartDate: lendingStart.toISOString().slice(0, 10),
          expectedReturnDate: expectedReturn.toISOString().slice(0, 10),
          equipmentLines: normalizedLines.map((line, sortOrder) => ({
            ...line,
            sortOrder,
          })),
          salesforcePayloadsByLine,
        },
      });
      console.info(`[POST /api/requests] JSON 保存 (${persistReason})`, fullPath);

      let exportInfo: {
        fileName: string;
        absolutePath: string;
        downloadPath: string;
      } | null = null;
      try {
        const written = await writeLendingPersonExportFile(
          buildLendingExportSourceFromPost(
            body,
            applicationCorrelationId,
            lendingStart,
            expectedReturn,
          ),
        );
        exportInfo = {
          fileName: written.fileName,
          absolutePath: written.absolutePath,
          downloadPath: `/api/requests/${equipmentRequestId}/export`,
        };
      } catch (exportErr) {
        console.warn(`[POST /api/requests] lending export failed (${persistReason})`, exportErr);
      }

      return json(
        {
          id: equipmentRequestId,
          applicationCorrelationId,
          salesforcePayloadsByLine,
          persistedTo: "json" as const,
          export: exportInfo,
        },
        { status: 201 },
      );
    };

    if (useJsonSubmissionOnly()) {
      if (!hasLocalSubmissionDatabase()) {
        return await persistLendingAsJson("json-mode");
      }
      let createdLocal;
      try {
        createdLocal = await getPrisma().equipmentRequest.create({
          data: lendingCreateData,
          include: { lines: true, additionalUsers: true },
        });
      } catch (dbErr) {
        console.warn(
          "[POST /api/requests] THD_SUBMISSION_MODE=json: ローカル DB 保存に失敗 — JSON のみにフォールバック",
          dbErr,
        );
        return await persistLendingAsJson("json-mode");
      }

      const salesforcePayloadsByLineJsonDual = buildSfPayloads(
        createdLocal.id,
        createdLocal.lines.map((l) => ({
          id: l.id,
          equipmentType: l.equipmentType,
          sortOrder: l.sortOrder,
          assignedUserEmployeeNumber: l.assignedUserEmployeeNumber,
        })),
      );

      const { fullPath: jsonDualPath } = await saveSubmissionJsonFile({
        prefix: "equipment-lending",
        payload: {
          schemaVersion: 1,
          kind: "equipment-lending",
          savedAt: new Date().toISOString(),
          applicationCorrelationId,
          localEquipmentRequestId: createdLocal.id,
          persistReason: "json-mode",
          storageNote:
            "THD_SUBMISSION_MODE=json かつ DATABASE_URL あり。下流 API 用の JSON と、一覧・一時保管用にローカル DB（EquipmentRequest）へ二重保存。",
          clientRequest: body,
          resolvedLicense: representative,
          userLicenses: userLicensesResolved,
          lendingStartDate: lendingStart.toISOString().slice(0, 10),
          expectedReturnDate: expectedReturn.toISOString().slice(0, 10),
          equipmentLines: createdLocal.lines.map((l) => ({
            equipmentType: l.equipmentType,
            sortOrder: l.sortOrder,
            assignedUserEmployeeNumber: l.assignedUserEmployeeNumber,
          })),
          salesforcePayloadsByLine: salesforcePayloadsByLineJsonDual,
        },
      });
      console.info("[POST /api/requests] JSON+ローカルDB (json-mode)", jsonDualPath);

      const exportInfo = await runExport(createdLocal.id);

      return json(
        {
          id: createdLocal.id,
          applicationCorrelationId,
          salesforcePayloadsByLine: salesforcePayloadsByLineJsonDual,
          persistedTo: "db",
          jsonAuditPath: jsonDualPath,
          export: exportInfo,
        },
        { status: 201 },
      );
    }

    let created;
    try {
      created = await getPrisma().equipmentRequest.create({
        data: lendingCreateData,
        include: { lines: true, additionalUsers: true },
      });
    } catch (dbErr) {
      if (shouldFallbackToJsonSave(dbErr)) {
        console.warn("[POST /api/requests] DB エラー — JSON にフォールバック", dbErr);
        return await persistLendingAsJson("db-fallback");
      }
      throw dbErr;
    }

    const salesforcePayloadsByLine = buildSfPayloads(
      created.id,
      created.lines.map((l) => ({
        id: l.id,
        equipmentType: l.equipmentType,
        sortOrder: l.sortOrder,
        assignedUserEmployeeNumber: l.assignedUserEmployeeNumber,
      })),
    );

    console.info(
      "[POST /api/requests] Salesforce placeholder payloads (per equipment line)",
      JSON.stringify(salesforcePayloadsByLine, null, 2),
    );

    const exportInfo = await runExport(created.id);

    return json(
      {
        id: created.id,
        applicationCorrelationId,
        salesforcePayloadsByLine,
        export: exportInfo,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/requests]", e);
    const msg = e instanceof Error ? e.message : "";

    if (e instanceof Prisma.PrismaClientValidationError && /Unknown argument/i.test(msg)) {
      return json(
        {
          error:
            "Prisma クライアントがスキーマと一致していません。開発サーバーを停止し、`npx prisma generate` 後に `npm run dev` を再開してください。",
        },
        { status: 500 },
      );
    }

    const dbRelated =
      /EquipmentLendingLine|does not exist|relation|Foreign key|column/i.test(msg) ||
      (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021");

    return json(
      {
        error: dbRelated
          ? "データベースが最新ではありません。`EquipmentLendingLine` 用のマイグレーションを適用してください（`npx prisma migrate deploy` など）。"
          : "登録処理でエラーが発生しました。ターミナルの [POST /api/requests] ログを確認してください。",
      },
      { status: 500 },
    );
  }
}
