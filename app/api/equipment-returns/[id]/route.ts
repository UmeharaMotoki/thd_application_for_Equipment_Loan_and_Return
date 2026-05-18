import { NextResponse } from "next/server";
import { hasLocalSubmissionDatabase, useJsonSubmissionOnly } from "@/lib/jsonSubmissionStore";
import { equipmentReturnRequestToPrefillPayload } from "@/lib/mapEquipmentReturnRequestToPrefill";
import { getPrisma } from "@/lib/prisma";
import { applicantOwnsEquipmentRequest, normalizeApplicantEmployeeNumber } from "@/lib/requestHistoryAuthz";
import { buildPreflightResponse, checkRateLimit, createRateLimitResponse, withCors } from "@/lib/apiSecurity";
import { equipmentReturnDetailQuerySchema } from "@/lib/validators";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "equipment-returns-id-get");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    const { id } = await ctx.params;
    if (!id?.trim()) {
      return json({ error: "申請IDが必要です。" }, { status: 400 });
    }

    const url = new URL(req.url);
    const parsed = equipmentReturnDetailQuerySchema.safeParse({
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

    const record = await getPrisma().equipmentReturnRequest.findFirst({
      where: { id: id.trim() },
      include: { lines: true },
    });

    if (!record || !applicantOwnsEquipmentRequest(record.employeeNumber, queryEmp)) {
      return json({ error: "申請が見つかりません。" }, { status: 404 });
    }

    return json({ prefill: equipmentReturnRequestToPrefillPayload(record) });
  } catch (e) {
    console.error("[GET /api/equipment-returns/[id]]", e);
    return json({ error: "申請の取得に失敗しました。" }, { status: 500 });
  }
}
