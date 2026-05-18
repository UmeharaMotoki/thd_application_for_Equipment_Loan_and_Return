import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { buildPreflightResponse, withCors } from "@/lib/apiSecurity";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request) {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return withCors(NextResponse.json({ ok: true, db: "up" }), req);
  } catch {
    return withCors(NextResponse.json({ ok: false, db: "down" }, { status: 503 }), req);
  }
}
