import { NextResponse } from "next/server";
import { getEmploymentTypeOptionsForApi } from "@/lib/employmentTypeOptions";
import { getPrisma } from "@/lib/prisma";
import {
  buildPreflightResponse,
  checkRateLimit,
  createRateLimitResponse,
  withCors,
} from "@/lib/apiSecurity";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);
  const rl = checkRateLimit(req, "employment-types-get");
  if (!rl.ok) {
    return createRateLimitResponse(req, rl.resetAt);
  }

  try {
    const items = await getEmploymentTypeOptionsForApi(getPrisma());
    return json({ items });
  } catch (e) {
    console.error("[GET /api/master/employment-types]", e);
    return json({ error: "雇用形態一覧の取得に失敗しました。" }, { status: 500 });
  }
}
