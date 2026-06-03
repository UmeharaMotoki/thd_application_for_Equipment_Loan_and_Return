import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildLendingExportFileName, resolveLendingExportDirectory } from "@/lib/lendingExportDir";
import { lendingExportWorkbookToBuffer } from "@/lib/lendingRegistrationExport";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse, withCors, buildPreflightResponse } from "@/lib/apiSecurity";

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);

  try {
    const rl = checkRateLimit(req, "requests-export");
    if (!rl.ok) {
      return createRateLimitResponse(req, rl.resetAt);
    }

    const { id } = await ctx.params;
    const prisma = getPrisma();
    const record = await prisma.equipmentRequest.findUnique({
      where: { id },
      include: {
        additionalUsers: { orderBy: { sortOrder: "asc" } },
        lines: { orderBy: { sortOrder: "asc" } },
        userLicenses: true,
      },
    });
    if (!record) {
      return json({ error: "申請が見つかりません。" }, { status: 404 });
    }

    const dir = resolveLendingExportDirectory();
    const prefix = `lending_${record.applicationCorrelationId.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40)}_`;
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(dir).catch(() => [] as string[]);
    const matches = files
      .filter((f) => f.startsWith(prefix) && f.endsWith(".xlsx"))
      .sort()
      .reverse();

    let buffer: Buffer;
    let fileName: string;

    if (matches.length > 0) {
      fileName = matches[0];
      buffer = await readFile(path.join(dir, fileName));
    } else {
      buffer = lendingExportWorkbookToBuffer(record);
      fileName = buildLendingExportFileName(record.applicationCorrelationId);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path.join(dir, fileName), buffer);
    }

    return withCors(
      new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      }),
      req,
    );
  } catch (e) {
    console.error("[GET /api/requests/[id]/export]", e);
    return json({ error: "帳票の取得に失敗しました。" }, { status: 500 });
  }
}
