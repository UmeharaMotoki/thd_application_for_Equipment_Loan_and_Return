import { NextResponse } from "next/server";
import { hasLocalSubmissionDatabase, useJsonSubmissionOnly } from "@/lib/jsonSubmissionStore";
import { equipmentRequestToPrefillPayload } from "@/lib/mapEquipmentRequestToPrefill";
import { getPrisma } from "@/lib/prisma";
import { applicantOwnsEquipmentRequest, normalizeApplicantEmployeeNumber } from "@/lib/requestHistoryAuthz";
import { buildPreflightResponse, checkRateLimit, createRateLimitResponse, withCors } from "@/lib/apiSecurity";
import { lendingRequestDetailQuerySchema } from "@/lib/validators";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

/** 過去申請1件のプリフィル用データ（申請者社員番号が一致するときのみ） */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "requests-id-get");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    const { id } = await ctx.params;
    if (!id?.trim()) {
      return json({ error: "申請IDが必要です。" }, { status: 400 });
    }

    const url = new URL(req.url);
    const parsed = lendingRequestDetailQuerySchema.safeParse({
      applicantEmployeeNumber: url.searchParams.get("applicantEmployeeNumber") ?? "",
    });
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().fieldErrors.applicantEmployeeNumber?.[0] ?? "クエリが不正です。";
      return json({ error: msg }, { status: 400 });
    }
    const queryEmp = normalizeApplicantEmployeeNumber(parsed.data.applicantEmployeeNumber);

    if (useJsonSubmissionOnly() && !hasLocalSubmissionDatabase()) {
      return json(
        { error: "データベースが設定されていないため、過去申請の取得はできません。" },
        { status: 503 },
      );
    }

    const record = await getPrisma().equipmentRequest.findFirst({
      where: { id: id.trim() },
      include: { lines: true },
    });

    if (!record || !applicantOwnsEquipmentRequest(record.employeeNumber, queryEmp)) {
      return json({ error: "申請が見つかりません。" }, { status: 404 });
    }

    return json({ prefill: equipmentRequestToPrefillPayload(record) });
  } catch (e) {
    console.error("[GET /api/requests/[id]]", e);
    return json({ error: "申請の取得に失敗しました。" }, { status: 500 });
  }
}
