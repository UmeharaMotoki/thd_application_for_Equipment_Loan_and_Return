import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse, withCors, buildPreflightResponse } from "@/lib/apiSecurity";
import { normalizeApplicantEmployeeNumber } from "@/lib/requestHistoryAuthz";
import { hasLocalSubmissionDatabase, useJsonSubmissionOnly } from "@/lib/jsonSubmissionStore";
import { lendingRequestListQuerySchema } from "@/lib/validators";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

/**
 * 機器貸与・機器返却の過去申請を申請者単位で統合した一覧（作成日時の新しい順）。
 * 取り込み本体は別エンドポイントで申請 ID 単位の GET を行う。
 */
export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "past-requests-get");
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

    const timeCond = includeArchived
      ? Prisma.empty
      : Prisma.sql`AND r."createdAt" >= ${threeMonthsAgo}`;

    const nameCond = filterApplicantName
      ? Prisma.sql`AND r."applicantName" ILIKE ${`%${filterApplicantName}%`}`
      : Prisma.empty;

    const userEmpCond = filterUserEmployeeNumber
      ? Prisma.sql`AND r."userEmployeeNumber" ILIKE ${`%${filterUserEmployeeNumber}%`}`
      : Prisma.empty;

    const baseWhere = Prisma.sql`r."employeeNumber" = ${emp} ${timeCond} ${nameCond} ${userEmpCond}`;

    type MergedRow = {
      id: string;
      sourceKind: string;
      createdAt: Date;
      applicantName: string;
      userName: string;
      userEmployeeNumber: string;
      requestReason: string;
      lendingStartDate: string | null;
      expectedReturnDate: string | null;
      lineCount: number | null;
    };

    const [lendingTotal, returnTotal, merged] = await prisma.$transaction([
      prisma.equipmentRequest.count({
        where: {
          employeeNumber: emp,
          ...(!includeArchived ? { createdAt: { gte: threeMonthsAgo } } : {}),
          ...(filterApplicantName
            ? { applicantName: { contains: filterApplicantName, mode: "insensitive" } }
            : {}),
          ...(filterUserEmployeeNumber
            ? { userEmployeeNumber: { contains: filterUserEmployeeNumber, mode: "insensitive" } }
            : {}),
        },
      }),
      prisma.equipmentReturnRequest.count({
        where: {
          employeeNumber: emp,
          ...(!includeArchived ? { createdAt: { gte: threeMonthsAgo } } : {}),
          ...(filterApplicantName
            ? { applicantName: { contains: filterApplicantName, mode: "insensitive" } }
            : {}),
          ...(filterUserEmployeeNumber
            ? { userEmployeeNumber: { contains: filterUserEmployeeNumber, mode: "insensitive" } }
            : {}),
        },
      }),
      prisma.$queryRaw<MergedRow[]>(Prisma.sql`
        SELECT * FROM (
          SELECT
            r.id,
            'lending' AS "sourceKind",
            r."createdAt",
            r."applicantName",
            r."userName",
            r."userEmployeeNumber",
            r."requestReason",
            TO_CHAR(r."lendingStartDate", 'YYYY-MM-DD') AS "lendingStartDate",
            TO_CHAR(r."expectedReturnDate", 'YYYY-MM-DD') AS "expectedReturnDate",
            (SELECT COUNT(*)::int FROM "EquipmentLendingLine" ell WHERE ell."requestId" = r.id) AS "lineCount"
          FROM "EquipmentRequest" r
          WHERE ${baseWhere}
          UNION ALL
          SELECT
            r.id,
            'return' AS "sourceKind",
            r."createdAt",
            r."applicantName",
            r."userName",
            r."userEmployeeNumber",
            r."requestReason",
            NULL::text AS "lendingStartDate",
            NULL::text AS "expectedReturnDate",
            (SELECT COUNT(*)::int FROM "EquipmentReturnLine" erl WHERE erl."requestId" = r.id) AS "lineCount"
          FROM "EquipmentReturnRequest" r
          WHERE ${baseWhere}
        ) sub
        ORDER BY sub."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
    ]);

    const total = lendingTotal + returnTotal;
    const threeMs = threeMonthsAgo.getTime();

    return json({
      total,
      items: merged.map((r) => ({
        id: r.id,
        sourceKind: r.sourceKind === "return" ? "return" : "lending",
        createdAt: r.createdAt.toISOString(),
        applicantName: r.applicantName,
        userName: r.userName,
        userEmployeeNumber: r.userEmployeeNumber,
        requestReason: r.requestReason,
        lendingStartDate: r.lendingStartDate,
        expectedReturnDate: r.expectedReturnDate,
        lineCount: r.lineCount ?? 0,
        isArchived: r.createdAt.getTime() < threeMs,
      })),
    });
  } catch (e) {
    console.error("[GET /api/past-requests]", e);
    return json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}
