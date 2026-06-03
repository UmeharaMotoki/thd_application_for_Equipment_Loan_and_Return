import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildPreflightResponse, withCors } from "@/lib/apiSecurity";

export async function GET(req: Request) {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const imageBuffer = await readFile(logoPath);
    return withCors(new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    }), req);
  } catch {
    return withCors(NextResponse.json({ error: "ロゴ画像が見つかりません。" }, { status: 404 }), req);
  }
}

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}
