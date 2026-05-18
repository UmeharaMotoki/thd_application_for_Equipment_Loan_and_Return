import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { compareIsoDateOnly, parseIsoDateOnly } from "@/lib/dateOnly";
import { shouldFallbackToJsonSave } from "@/lib/dbSubmissionFallback";
import {
  hasLocalSubmissionDatabase,
  saveSubmissionJsonFile,
  useJsonSubmissionOnly,
} from "@/lib/jsonSubmissionStore";
import { getPrisma } from "@/lib/prisma";
import { buildPreflightResponse, checkRateLimit, createRateLimitResponse, withCors } from "@/lib/apiSecurity";
import { normalizeApplicantEmployeeNumber } from "@/lib/requestHistoryAuthz";
import { validateEquipmentReturnPostAgainstMasters } from "@/lib/equipmentReturnPostMasterValidation";
import {
  createEquipmentReturnRequestSchema,
  equipmentReturnListQuerySchema,
} from "@/lib/validators";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

/** 返却の過去申請一覧（申請者社員番号一致・直近3か月 / テンプレート期間を含む）。貸与と返却の統合一覧は GET /api/past-requests。 */
export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "equipment-returns-get");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    const url = new URL(req.url);
    const parsed = equipmentReturnListQuerySchema.safeParse({
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
    const where: Prisma.EquipmentReturnRequestWhereInput = {
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
      prisma.equipmentReturnRequest.count({ where }),
      prisma.equipmentReturnRequest.findMany({
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
          _count: { select: { lines: true } },
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
        lineCount: r._count.lines,
        isArchived: r.createdAt.getTime() < threeMonthsAgo.getTime(),
      })),
    });
  } catch (e) {
    console.error("[GET /api/equipment-returns]", e);
    return json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "equipment-returns-post");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json({ error: "リクエスト形式が不正です。" }, { status: 400 });
    }

    const parsed = createEquipmentReturnRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ error: "入力値が不正です。必須項目を確認してください。" }, { status: 400 });
    }
    const body = parsed.data;

    const masterErr = await validateEquipmentReturnPostAgainstMasters(getPrisma(), body);
    if (masterErr) {
      return json({ error: masterErr }, { status: 400 });
    }

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

    const requestDetail = body.requestDetail.trim();

    const normalizedLines: Array<{
      equipmentName: string;
      lendingDue: Date;
      expectedReturn: Date;
    }> = [];

    for (let i = 0; i < body.lines.length; i += 1) {
      const row = body.lines[i];
      const name = row.equipmentName.trim();
      if (!name) {
        return json({ error: `機器 ${i + 1} 行目：名称を選択してください。` }, { status: 400 });
      }
      const dueS = row.lendingDueDate.trim();
      const retS = row.expectedReturnDate.trim();
      const lendingDue = parseIsoDateOnly(dueS);
      const expectedReturn = parseIsoDateOnly(retS);
      if (!lendingDue || !expectedReturn) {
        return json(
          { error: `機器 ${i + 1} 行目：貸与期限・返却予定日を正しい日付で入力してください。` },
          { status: 400 },
        );
      }
      if (compareIsoDateOnly(retS, dueS) > 0) {
        return json(
          { error: `機器 ${i + 1} 行目：返却予定日は貸与期限以前の日付にしてください。` },
          { status: 400 },
        );
      }
      normalizedLines.push({
        equipmentName: name,
        lendingDue,
        expectedReturn,
      });
    }

    const returnCreateData = {
      applicantName: body.applicantName.trim(),
      employeeNumber: body.employeeNumber.trim(),
      companyName: body.companyName.trim(),
      departmentName: body.departmentName.trim(),
      address: body.address.trim(),
      userName: body.userName.trim(),
      userEmployeeNumber: body.userEmployeeNumber.trim(),
      userCompanyName: body.userCompanyName.trim(),
      userDepartmentName: body.userDepartmentName.trim(),
      userAddress: body.userAddress.trim(),
      userContractType: body.userContractType.trim(),
      requestReason: body.requestReason.trim(),
      requestDetail,
      lines: {
        create: normalizedLines.map((l, sortOrder) => ({
          equipmentName: l.equipmentName,
          lendingDueDate: l.lendingDue,
          expectedReturnDate: l.expectedReturn,
          sortOrder,
        })),
      },
    };

    const persistReturnAsJson = async (persistReason: "json-mode" | "db-fallback") => {
      const requestId = randomUUID();
      const { fullPath } = await saveSubmissionJsonFile({
        prefix: "equipment-return",
        payload: {
          schemaVersion: 1,
          kind: "equipment-return",
          savedAt: new Date().toISOString(),
          requestId,
          persistReason,
          storageNote:
            persistReason === "json-mode"
              ? "DB 未設定モード。`docker/JSON/議事送信` へ保存。"
              : "DB 保存に失敗したため `docker/JSON/議事送信` へフォールバック保存。",
          clientRequest: body,
          lines: normalizedLines.map((l) => ({
            equipmentName: l.equipmentName,
            lendingDueDate: l.lendingDue.toISOString().slice(0, 10),
            expectedReturnDate: l.expectedReturn.toISOString().slice(0, 10),
          })),
        },
      });
      console.info(`[POST /api/equipment-returns] JSON 保存 (${persistReason})`, fullPath);
      return json({ id: requestId, persistedTo: "json" as const }, { status: 201 });
    };

    if (useJsonSubmissionOnly()) {
      if (!hasLocalSubmissionDatabase()) {
        return await persistReturnAsJson("json-mode");
      }
      let createdLocal;
      try {
        createdLocal = await getPrisma().equipmentReturnRequest.create({
          data: returnCreateData,
        });
      } catch (dbErr) {
        console.warn(
          "[POST /api/equipment-returns] THD_SUBMISSION_MODE=json: ローカル DB 保存に失敗 — JSON のみにフォールバック",
          dbErr,
        );
        return await persistReturnAsJson("json-mode");
      }

      const { fullPath: jsonDualPath } = await saveSubmissionJsonFile({
        prefix: "equipment-return",
        payload: {
          schemaVersion: 1,
          kind: "equipment-return",
          savedAt: new Date().toISOString(),
          localEquipmentReturnRequestId: createdLocal.id,
          persistReason: "json-mode",
          storageNote:
            "THD_SUBMISSION_MODE=json かつ DATABASE_URL あり。下流 API 用の JSON と、一覧・一時保管用にローカル DB（EquipmentReturnRequest）へ二重保存。",
          clientRequest: body,
          lines: normalizedLines.map((l) => ({
            equipmentName: l.equipmentName,
            lendingDueDate: l.lendingDue.toISOString().slice(0, 10),
            expectedReturnDate: l.expectedReturn.toISOString().slice(0, 10),
          })),
        },
      });
      console.info("[POST /api/equipment-returns] JSON+ローカルDB (json-mode)", jsonDualPath);

      return json(
        { id: createdLocal.id, persistedTo: "db", jsonAuditPath: jsonDualPath },
        { status: 201 },
      );
    }

    let created;
    try {
      created = await getPrisma().equipmentReturnRequest.create({
        data: returnCreateData,
      });
    } catch (dbErr) {
      if (shouldFallbackToJsonSave(dbErr)) {
        console.warn("[POST /api/equipment-returns] DB エラー — JSON にフォールバック", dbErr);
        return await persistReturnAsJson("db-fallback");
      }
      throw dbErr;
    }

    return json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/equipment-returns]", e);
    const msg = e instanceof Error ? e.message : "";

    if (e instanceof Prisma.PrismaClientValidationError && /Unknown argument/i.test(msg)) {
      return json(
        {
          error:
            "Prisma クライアントがスキーマと一致していません。開発サーバーを一度停止し、`npx prisma generate` を実行してから `npm run dev` を再開してください。",
        },
        { status: 500 },
      );
    }

    const dbOutdated =
      /column .* does not exist|relation .* does not exist|no such table|Unknown column/i.test(
        msg,
      );
    return json(
      {
        error: dbOutdated
          ? "データベースが最新ではありません。`npx prisma migrate deploy`（または migrate dev）を実行してください。"
          : "登録処理でエラーが発生しました。しばらくしてから再度お試しください。",
      },
      { status: 500 },
    );
  }
}
