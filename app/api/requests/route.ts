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
import type { DerivedLicenseFields, StoredLicenseSpecCode } from "@/lib/resolvePcSpecDecision";
import {
  decisionResolutionToLicenseFields,
  isMsOfficeEditionAllowedForPcDecision,
  resolvePcSpecDecision,
} from "@/lib/resolvePcSpecDecision";
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
import { createLendingRequestSchema, lendingRequestListQuerySchema } from "@/lib/validators";

const NON_PC_LICENSE: DerivedLicenseFields = {
  licenseTechnoProApply: "-",
  licenseUserSoftwareInstall: "-",
  licenseTechnoProNetwork: "-",
  licenseSpecCode: "-" as StoredLicenseSpecCode,
};

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

    const lendingStart = parseIsoDateOnly(body.lendingStartDate);
    const expectedReturn = parseIsoDateOnly(body.expectedReturnDate);
    if (!lendingStart || !expectedReturn) {
      return json(
        { error: "貸与開始日・返却予定日は正しい日付で選択してください。" },
        { status: 400 },
      );
    }
    const minAllowedDate = new Date();
    minAllowedDate.setHours(0, 0, 0, 0);
    minAllowedDate.setDate(minAllowedDate.getDate() + 7);
    const isWeekday = (date: Date) => {
      const day = date.getDay();
      return day >= 1 && day <= 5;
    };
    if (lendingStart.getTime() < minAllowedDate.getTime()) {
      return json(
        { error: "貸与開始日は本日から1週間後以降の日付を選択してください。" },
        { status: 400 },
      );
    }
    if (expectedReturn.getTime() < minAllowedDate.getTime()) {
      return json(
        { error: "返却予定日は本日から1週間後以降の日付を選択してください。" },
        { status: 400 },
      );
    }
    if (!isWeekday(lendingStart) || !isWeekday(expectedReturn)) {
      return json(
        { error: "貸与開始日・返却予定日は平日（月〜金）を選択してください。" },
        { status: 400 },
      );
    }
    if (expectedReturn.getTime() < lendingStart.getTime()) {
      return json(
        { error: "返却予定日は貸与開始日以降の日付を選択してください。" },
        { status: 400 },
      );
    }

    const normalizedEquipmentTypes: string[] = [];
    for (let i = 0; i < body.lines.length; i += 1) {
      const row = body.lines[i];
      const t = row.equipmentType.trim();
      if (!t) {
        return json(
          { error: `機器 ${i + 1} 行目：種類を選択してください。` },
          { status: 400 },
        );
      }
      normalizedEquipmentTypes.push(t);
    }

    const masterErr = await validateLendingPostAgainstMasters(getPrisma(), body, normalizedEquipmentTypes);
    if (masterErr) {
      return json({ error: masterErr }, { status: 400 });
    }

    const includesPc = lendingLinesIncludePc(
      normalizedEquipmentTypes.map((equipmentType) => ({ equipmentType })),
    );

    let derived: DerivedLicenseFields;
    let userStaffCategoryOut: string;
    let decisionContractTypeOut: string;
    let decisionWorkContentOut: string;
    let decisionClientEnvOut: string;

    if (includesPc) {
      const ms = (body.msOfficeEdition ?? "").trim();
      if (!ms) {
        return json(
          { error: "MicrosoftOfficeのエディションを選択してください。" },
          { status: 400 },
        );
      }
      if (
        !isMsOfficeEditionAllowedForPcDecision(
          body.userStaffCategory.trim(),
          (body.decisionContractType ?? "").trim(),
          (body.decisionWorkContent ?? "").trim(),
          (body.decisionClientEnv ?? "").trim(),
          ms,
        )
      ) {
        return json(
          {
            error:
              "MicrosoftOfficeのエディションが、利用者区分・契約形態・業務内容・客先ネットワーク接続の組み合わせと一致しません。画面を確認してください。",
          },
          { status: 400 },
        );
      }

      const resolution = resolvePcSpecDecision(
        body.userStaffCategory.trim(),
        (body.decisionContractType ?? "").trim(),
        (body.decisionWorkContent ?? "").trim(),
        (body.decisionClientEnv ?? "").trim(),
        ms,
      );

      if (resolution.kind === "incomplete") {
        return json(
          {
            error:
              "利用者区分・判定プロセス（契約形態・業務内容・客先ネットワーク接続）および MicrosoftOfficeのエディションを正しく選択してください。",
          },
          { status: 400 },
        );
      }

      if (resolution.kind === "lending_denied") {
        return json({ error: resolution.message }, { status: 400 });
      }

      const d = decisionResolutionToLicenseFields(resolution);
      if (!d) {
        return json({ error: "判定結果を確定できませんでした。" }, { status: 400 });
      }
      derived = d;
      userStaffCategoryOut = body.userStaffCategory.trim();
      decisionContractTypeOut = (body.decisionContractType ?? "").trim();
      decisionWorkContentOut = (body.decisionWorkContent ?? "").trim();
      decisionClientEnvOut = (body.decisionClientEnv ?? "").trim();
    } else {
      if (body.userStaffCategory.trim() !== LENDING_NON_PC_STAFF_CATEGORY) {
        return json(
          { error: "貸与機器のデータが不正です。画面を再読み込みしてやり直してください。" },
          { status: 400 },
        );
      }
      derived = NON_PC_LICENSE;
      userStaffCategoryOut = LENDING_NON_PC_STAFF_CATEGORY;
      decisionContractTypeOut = "";
      decisionWorkContentOut = "";
      decisionClientEnvOut = "";
    }

    const requestDetail = (body.requestDetail ?? "").trim();

    const applicationCorrelationId =
      body.applicationCorrelationId?.trim() || randomUUID();

    const lendingCreateData = {
      applicationCorrelationId,
      applicantName: body.applicantName.trim(),
      employeeNumber: body.employeeNumber.trim(),
      companyName: body.companyName.trim(),
      departmentName: body.departmentName.trim(),
      address: body.address.trim(),
      applicantJobTitle: (body.applicantJobTitle ?? "").trim(),
      applicantEmail: (body.applicantEmail ?? "").trim(),
      applicantPhone: (body.applicantPhone ?? "").trim(),
      userName: body.userName.trim(),
      userEmployeeNumber: body.userEmployeeNumber.trim(),
      userCompanyName: body.userCompanyName.trim(),
      userDepartmentName: body.userDepartmentName.trim(),
      userAddress: body.userAddress.trim(),
      userContractType: body.userContractType.trim(),
      userCostDeptName: (body.userCostDeptName ?? "").trim(),
      userCostDeptCode: (body.userCostDeptCode ?? "").trim(),
      userEmail: (body.userEmail ?? "").trim(),
      userPhone: (body.userPhone ?? "").trim(),
      deliveryName: (body.deliveryName ?? "").trim(),
      deliveryCompanyName: (body.deliveryCompanyName ?? "").trim(),
      deliveryDepartment: (body.deliveryDepartment ?? "").trim(),
      deliveryArea: (body.deliveryArea ?? "").trim(),
      deliveryPostalCode: (body.deliveryPostalCode ?? "").trim(),
      deliveryAddress: (body.deliveryAddress ?? "").trim(),
      deliveryBuilding: (body.deliveryBuilding ?? "").trim(),
      deliveryEmail: (body.deliveryEmail ?? "").trim(),
      deliveryPhone: (body.deliveryPhone ?? "").trim(),
      userStaffCategory: userStaffCategoryOut,
      decisionContractType: decisionContractTypeOut,
      decisionWorkContent: decisionWorkContentOut,
      decisionClientEnv: decisionClientEnvOut,
      licenseTechnoProApply: derived.licenseTechnoProApply,
      licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
      licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
      licenseSpecCode: derived.licenseSpecCode,
      smartphoneCameraPresence: (body.smartphoneCameraPresence ?? "").trim(),
      smartphoneUserIdentification: (body.smartphoneUserIdentification ?? "").trim(),
      smartphoneWorkplaceUse: (body.smartphoneWorkplaceUse ?? "").trim(),
      peripheralMonitorSize: (body.peripheralMonitorSize ?? "").trim(),
      peripheralMonitorSizeCustom: (body.peripheralMonitorSizeCustom ?? "").trim(),
      peripheralLanCableLength: (body.peripheralLanCableLength ?? "").trim(),
      peripheralLanCableLengthCustom: (body.peripheralLanCableLengthCustom ?? "").trim(),
      lendingStartDate: lendingStart,
      expectedReturnDate: expectedReturn,
      requestReason: body.requestReason.trim(),
      requestDetail,
      lines: {
        create: normalizedEquipmentTypes.map((equipmentType, sortOrder) => ({
          equipmentType,
          sortOrder,
        })),
      },
    };

    const persistLendingAsJson = async (persistReason: "json-mode" | "db-fallback") => {
      const equipmentRequestId = randomUUID();
      const linesForSf = normalizedEquipmentTypes.map((equipmentType, sortOrder) => ({
        id: randomUUID(),
        equipmentType,
        sortOrder,
      }));
      const salesforcePayloadsByLine = buildSalesforcePerLinePayloads({
        applicationCorrelationId,
        equipmentRequestId,
        lines: linesForSf,
        body,
        includesPc,
        userStaffCategoryOut,
        decisionContractTypeOut,
        decisionWorkContentOut,
        decisionClientEnvOut,
        licenseTechnoProApply: derived.licenseTechnoProApply,
        licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
        licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
        licenseSpecCode: derived.licenseSpecCode,
      });

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
          resolvedLicense: {
            userStaffCategory: userStaffCategoryOut,
            decisionContractType: decisionContractTypeOut,
            decisionWorkContent: decisionWorkContentOut,
            decisionClientEnv: decisionClientEnvOut,
            licenseTechnoProApply: derived.licenseTechnoProApply,
            licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
            licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
            licenseSpecCode: derived.licenseSpecCode,
          },
          lendingStartDate: lendingStart.toISOString().slice(0, 10),
          expectedReturnDate: expectedReturn.toISOString().slice(0, 10),
          equipmentLines: normalizedEquipmentTypes.map((equipmentType, sortOrder) => ({
            equipmentType,
            sortOrder,
          })),
          salesforcePayloadsByLine,
        },
      });
      console.info(`[POST /api/requests] JSON 保存 (${persistReason})`, fullPath);

      return json(
        {
          id: equipmentRequestId,
          applicationCorrelationId,
          salesforcePayloadsByLine,
          persistedTo: "json" as const,
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
          include: { lines: true },
        });
      } catch (dbErr) {
        console.warn(
          "[POST /api/requests] THD_SUBMISSION_MODE=json: ローカル DB 保存に失敗 — JSON のみにフォールバック",
          dbErr,
        );
        return await persistLendingAsJson("json-mode");
      }

      const salesforcePayloadsByLineJsonDual = buildSalesforcePerLinePayloads({
        applicationCorrelationId,
        equipmentRequestId: createdLocal.id,
        lines: createdLocal.lines.map((l) => ({
          id: l.id,
          equipmentType: l.equipmentType,
          sortOrder: l.sortOrder,
        })),
        body,
        includesPc,
        userStaffCategoryOut,
        decisionContractTypeOut,
        decisionWorkContentOut,
        decisionClientEnvOut,
        licenseTechnoProApply: derived.licenseTechnoProApply,
        licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
        licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
        licenseSpecCode: derived.licenseSpecCode,
      });

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
          resolvedLicense: {
            userStaffCategory: userStaffCategoryOut,
            decisionContractType: decisionContractTypeOut,
            decisionWorkContent: decisionWorkContentOut,
            decisionClientEnv: decisionClientEnvOut,
            licenseTechnoProApply: derived.licenseTechnoProApply,
            licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
            licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
            licenseSpecCode: derived.licenseSpecCode,
          },
          lendingStartDate: lendingStart.toISOString().slice(0, 10),
          expectedReturnDate: expectedReturn.toISOString().slice(0, 10),
          equipmentLines: normalizedEquipmentTypes.map((equipmentType, sortOrder) => ({
            equipmentType,
            sortOrder,
          })),
          salesforcePayloadsByLine: salesforcePayloadsByLineJsonDual,
        },
      });
      console.info("[POST /api/requests] JSON+ローカルDB (json-mode)", jsonDualPath);

      return json(
        {
          id: createdLocal.id,
          applicationCorrelationId,
          salesforcePayloadsByLine: salesforcePayloadsByLineJsonDual,
          persistedTo: "db",
          jsonAuditPath: jsonDualPath,
        },
        { status: 201 },
      );
    }

    let created;
    try {
      created = await getPrisma().equipmentRequest.create({
        data: lendingCreateData,
        include: { lines: true },
      });
    } catch (dbErr) {
      if (shouldFallbackToJsonSave(dbErr)) {
        console.warn("[POST /api/requests] DB エラー — JSON にフォールバック", dbErr);
        return await persistLendingAsJson("db-fallback");
      }
      throw dbErr;
    }

    const salesforcePayloadsByLine = buildSalesforcePerLinePayloads({
      applicationCorrelationId,
      equipmentRequestId: created.id,
      lines: created.lines.map((l) => ({
        id: l.id,
        equipmentType: l.equipmentType,
        sortOrder: l.sortOrder,
      })),
      body,
      includesPc,
      userStaffCategoryOut,
      decisionContractTypeOut,
      decisionWorkContentOut,
      decisionClientEnvOut,
      licenseTechnoProApply: derived.licenseTechnoProApply,
      licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
      licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
      licenseSpecCode: derived.licenseSpecCode,
    });

    console.info(
      "[POST /api/requests] Salesforce placeholder payloads (per equipment line)",
      JSON.stringify(salesforcePayloadsByLine, null, 2),
    );

    return json(
      {
        id: created.id,
        applicationCorrelationId,
        salesforcePayloadsByLine,
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
