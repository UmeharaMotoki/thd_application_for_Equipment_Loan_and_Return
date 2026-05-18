import { NextResponse } from "next/server";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";
import { fetchActiveOptionsByCategories } from "@/lib/applicationSelectOptionsQueries";
import { getPrisma } from "@/lib/prisma";
import {
  buildPreflightResponse,
  checkRateLimit,
  createRateLimitResponse,
  withCors,
} from "@/lib/apiSecurity";

const KNOWN = new Set<string>(Object.values(APPLICATION_SELECT_CATEGORIES));

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);
  const rl = checkRateLimit(req, "form-options-get");
  if (!rl.ok) {
    return createRateLimitResponse(req, rl.resetAt);
  }

  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("categories") ?? "";
    const categories = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (categories.length === 0) {
      return json({ error: "categories クエリが必要です（カンマ区切り）。" }, { status: 400 });
    }
    const unknown = categories.filter((c) => !KNOWN.has(c));
    if (unknown.length > 0) {
      return json({ error: `未対応の category です: ${unknown.join(", ")}` }, { status: 400 });
    }

    const rows = await fetchActiveOptionsByCategories(getPrisma(), categories);
    const options: Record<string, { label: string; code: string | null }[]> = {};
    for (const c of categories) {
      options[c] = rows
        .filter((r) => r.category === c)
        .map((r) => ({ label: r.label, code: r.code }));
    }
    return json({ options });
  } catch (e) {
    console.error("[GET /api/form-options]", e);
    return json({ error: "選択肢の取得に失敗しました。" }, { status: 500 });
  }
}
