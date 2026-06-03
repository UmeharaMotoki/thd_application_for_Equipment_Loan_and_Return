import { Prisma, type PrismaClient, type ThdLocation } from "@prisma/client";
import { NextResponse } from "next/server";
import { normalizeDepartmentCode, SQL_NORMALIZE_DEPARTMENT_CODE } from "@/lib/departmentCodeNormalize";
import { getPrisma } from "@/lib/prisma";
import { buildPreflightResponse, checkRateLimit, createRateLimitResponse, withCors } from "@/lib/apiSecurity";

/**
 * 人事の部署コードと CSV 取込の thd_location の前後スペース差を吸収し、最新 import を優先する。
 */
async function findLatestThdLocationByDepartmentCode(
  prisma: PrismaClient,
  departmentCode: string,
): Promise<ThdLocation | null> {
  const normalized = normalizeDepartmentCode(departmentCode);
  if (!normalized) return null;

  const byExact = await prisma.thdLocation.findFirst({
    where: { departmentCode: normalized },
    orderBy: { importedAt: "desc" },
  });
  if (byExact) return byExact;

  const t = departmentCode.trim();
  if (t && t !== normalized) {
    const byRaw = await prisma.thdLocation.findFirst({
      where: { departmentCode: t },
      orderBy: { importedAt: "desc" },
    });
    if (byRaw) return byRaw;
  }

  const rows = await prisma.$queryRaw<ThdLocation[]>`
    SELECT * FROM "thd_location"
    WHERE ${Prisma.raw(SQL_NORMALIZE_DEPARTMENT_CODE('"departmentCode"'))} = ${normalized}
    ORDER BY "importedAt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) =>
    withCors(NextResponse.json(body, init), req);
  const rl = checkRateLimit(req, "locations-search-get");
  if (!rl.ok) {
    return createRateLimitResponse(req, rl.resetAt);
  }

  const { searchParams } = new URL(req.url);
  const departmentCode = searchParams.get("departmentCode")?.trim();
  const companyName = searchParams.get("companyName")?.trim();
  const area = searchParams.get("area")?.trim();
  const listAreas = searchParams.get("listAreas") === "true";
  const listCompanies = searchParams.get("listCompanies") === "true";
  const listDepartments = searchParams.get("listDepartments") === "true";

  try {
    const prisma = getPrisma();

    if (listAreas) {
      const records = await prisma.thdLocation.findMany({
        where: { area: { not: null } },
        select: { area: true },
        distinct: ["area"],
        orderBy: { area: "asc" },
      });
      return json({ areas: records.map((r) => r.area).filter(Boolean) });
    }

    if (listCompanies) {
      const where: Record<string, unknown> = { companyName: { not: null } };
      if (area) where.area = area;
      const records = await prisma.thdLocation.findMany({
        where,
        select: { companyName: true },
        distinct: ["companyName"],
        orderBy: { companyName: "asc" },
      });
      return json({ companies: records.map((r) => r.companyName).filter(Boolean) });
    }

    if (listDepartments) {
      const where: Record<string, unknown> = { departmentName: { not: null } };
      if (area) where.area = area;
      if (companyName) where.companyName = companyName;
      const records = await prisma.thdLocation.findMany({
        where,
        select: {
          departmentCode: true,
          departmentName: true,
          deliverySite: true,
          area: true,
          postalCode: true,
          address: true,
          buildingName: true,
        },
        orderBy: { departmentName: "asc" },
      });
      return json({ departments: records });
    }

    if (departmentCode) {
      const withCascade = searchParams.get("withCascade") === "true";
      const location = await findLatestThdLocationByDepartmentCode(prisma, departmentCode);

      if (!withCascade || !location?.area) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.debug("[locations API]", {
              departmentCode,
              withCascade,
              locationArea: location?.area ?? null,
              locationPostalCode: location?.postalCode ?? null,
              locationBuildingName: location?.buildingName ?? null,
            });
          }
        return json({ location });
      }

      const [companyRecords, deptRecords] = await Promise.all([
        prisma.thdLocation.findMany({
          where: { area: location.area, companyName: { not: null } },
          select: { companyName: true },
          distinct: ["companyName"],
          orderBy: { companyName: "asc" },
        }),
        prisma.thdLocation.findMany({
          where: {
            area: location.area,
            departmentName: { not: null },
            ...(location.companyName ? { companyName: location.companyName } : {}),
          },
          select: {
            departmentCode: true,
            departmentName: true,
            deliverySite: true,
            area: true,
            postalCode: true,
            address: true,
            buildingName: true,
          },
          orderBy: { departmentName: "asc" },
        }),
      ]);

      return json({
        location,
        companies: companyRecords.map((r) => r.companyName).filter(Boolean),
        departments: deptRecords,
      });
    }

    return json(
      { error: "departmentCode, listAreas, listCompanies, または listDepartments パラメータが必要です。" },
      { status: 400 },
    );
  } catch (e) {
    console.error("[locations search]", e);
    return json({ error: "拠点検索に失敗しました。" }, { status: 500 });
  }
}
