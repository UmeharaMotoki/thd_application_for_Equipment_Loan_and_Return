import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  compactMatchForm,
  employeeNameSearchTokens,
  escapeSqlLikePattern,
  normalizeEmployeeSearchInput,
} from "@/lib/employeeSearchNormalize";
import { SQL_NORMALIZE_DEPARTMENT_CODE } from "@/lib/departmentCodeNormalize";
import { PC_ASSIST_HQ_ADDRESS } from "@/lib/pcAssistHqAddress";
import { getPrisma } from "@/lib/prisma";
import { buildPreflightResponse, checkRateLimit, createRateLimitResponse, withCors } from "@/lib/apiSecurity";
import { isHrPersonnelRetired } from "@/lib/hrPersonnelRetired";
import { employeeSearchQuerySchema } from "@/lib/validators";

/** $queryRaw の行で、ドライバにより列名の大文字小文字が揺れる場合に備えて正規化する */
function normalizeEmployeeSearchRow(row: Record<string, unknown>): {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  departmentCode: string | null;
  address: string;
  deliveryArea: string | null;
  deliveryPostalCode: string | null;
  deliveryAddressLine: string | null;
  deliveryBuilding: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  employmentType: string | null;
  employeeCategory: string | null;
  occupationName: string | null;
  retired: boolean;
} {
  const str = (v: unknown) => (v == null ? "" : String(v));
  const get = (canonical: string): unknown => {
    if (canonical in row) return row[canonical];
    const lower = canonical.toLowerCase();
    if (lower in row) return row[lower];
    return undefined;
  };
  return {
    id: str(get("id")),
    employeeNumber: str(get("employeeNumber")),
    fullName: str(get("fullName")),
    companyName: str(get("companyName")),
    departmentName: str(get("departmentName")),
    departmentCode: (() => {
      const v = get("departmentCode");
      if (v == null || String(v).trim() === "") return null;
      return String(v);
    })(),
    address: str(get("address")),
    deliveryArea: (() => {
      const v = get("deliveryArea");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    deliveryPostalCode: (() => {
      const v = get("deliveryPostalCode");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    deliveryAddressLine: (() => {
      const v = get("deliveryAddressLine");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    deliveryBuilding: (() => {
      const v = get("deliveryBuilding");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    jobTitle: (() => {
      const v = get("jobTitle");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    email: (() => {
      const v = get("email");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    phone: (() => {
      const v = get("phone");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    employmentType: (() => {
      const v = get("employmentType");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    employeeCategory: (() => {
      const v = get("employeeCategory");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    occupationName: (() => {
      const v = get("occupationName");
      return v == null || String(v).trim() === "" ? null : String(v);
    })(),
    retired: isHrPersonnelRetired({
      retirementDate: (() => {
        const v = get("retirementDate");
        return v == null ? null : String(v);
      })(),
      retirementCategory: (() => {
        const v = get("retirementCategory");
        return v == null ? null : String(v);
      })(),
      retirementCategoryCode: (() => {
        const v = get("retirementCategoryCode");
        return v == null ? null : String(v);
      })(),
    }),
  };
}

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}

export async function GET(req: Request) {
  const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init), req);
  const rl = checkRateLimit(req, "employees-search-get");
  if (!rl.ok) {
    return createRateLimitResponse(req, rl.resetAt);
  }

  const { searchParams } = new URL(req.url);
  const query = employeeSearchQuerySchema.safeParse({ q: searchParams.get("q") ?? "" });
  if (!query.success) {
    return json({ employees: [], error: "検索条件が不正です。" }, { status: 400 });
  }
  const raw = query.data.q;
  const normalized = normalizeEmployeeSearchInput(raw);
  if (!normalized) {
    return json({ employees: [] });
  }

  const tokens = employeeNameSearchTokens(normalized);
  const compact = compactMatchForm(raw);
  const normPat = `%${escapeSqlLikePattern(normalized)}%`;
  const compactPat = `%${escapeSqlLikePattern(compact)}%`;

  const displayNameSql = Prisma.sql`COALESCE(NULLIF(TRIM(hr."employeeName"), ''), NULLIF(TRIM(hr."legalNameKanji"), ''))`;

  const tokenAndClause =
    tokens.length <= 1
      ? Prisma.sql``
      : Prisma.sql`AND ${Prisma.join(
          tokens.map((t) => {
            const pat = `%${escapeSqlLikePattern(t)}%`;
            return Prisma.sql`(${displayNameSql}) ILIKE ${pat} ESCAPE '\\'`;
          }),
          " AND ",
        )}`;

  try {
    const rawRows = await getPrisma().$queryRaw<
      Array<{
        id: string;
        employeeNumber: string;
        fullName: string;
        companyName: string;
        departmentName: string;
        departmentCode: string | null;
        address: string;
        deliveryArea: string | null;
        deliveryPostalCode: string | null;
        deliveryAddressLine: string | null;
        deliveryBuilding: string | null;
        jobTitle: string | null;
        email: string | null;
        phone: string | null;
        employmentType: string | null;
        employeeCategory: string | null;
        occupationName: string | null;
        retirementDate: string | null;
        retirementCategory: string | null;
        retirementCategoryCode: string | null;
      }>
    >`
      WITH latest_hr AS (
        SELECT DISTINCT ON ("employeeNumber")
          "id",
          "employeeNumber",
          "employeeName",
          "legalNameKanji",
          "companyName",
          "departmentName",
          "departmentCode",
          "jobTitleName",
          "systemEmail",
          "employmentType",
          "employeeCategory",
          "occupationName",
          "retirementDate",
          "retirementCategory",
          "retirementCategoryCode"
        FROM hr_personnel_record
        WHERE TRIM("employeeNumber") <> ''
        ORDER BY "employeeNumber", "importedAt" DESC
      ),
      thd_pick AS (
        SELECT DISTINCT ON (code_key)
          code_key AS "departmentCode",
          thd_company_name,
          thd_department_name,
          thd_area,
          thd_postal_code,
          thd_address_line,
          thd_building_name,
          combined_addr
        FROM (
          SELECT
            ${Prisma.raw(SQL_NORMALIZE_DEPARTMENT_CODE('"departmentCode"'))} AS code_key,
            "companyName" AS thd_company_name,
            "departmentName" AS thd_department_name,
            area AS thd_area,
            "postalCode" AS thd_postal_code,
            address AS thd_address_line,
            "buildingName" AS thd_building_name,
            NULLIF(
              TRIM(CONCAT(COALESCE(address, ''), ' ', COALESCE("buildingName", ''))),
              ''
            ) AS combined_addr,
            "importedAt"
          FROM thd_location
          WHERE "departmentCode" IS NOT NULL
            AND TRIM("departmentCode") <> ''
            AND ${Prisma.raw(SQL_NORMALIZE_DEPARTMENT_CODE('"departmentCode"'))} IS NOT NULL
        ) tl
        ORDER BY code_key, "importedAt" DESC
      )
      SELECT
        hr."id",
        hr."employeeNumber",
        COALESCE(
          NULLIF(TRIM(hr."employeeName"), ''),
          NULLIF(TRIM(hr."legalNameKanji"), ''),
          ''
        ) AS "fullName",
        COALESCE(
          NULLIF(TRIM(COALESCE(hr."companyName", '')), ''),
          NULLIF(TRIM(COALESCE(tp.thd_company_name, '')), ''),
          ''
        ) AS "companyName",
        COALESCE(
          NULLIF(TRIM(COALESCE(hr."departmentName", '')), ''),
          NULLIF(TRIM(COALESCE(tp.thd_department_name, '')), ''),
          ''
        ) AS "departmentName",
        hr."departmentCode",
        COALESCE(NULLIF(TRIM(COALESCE(tp.combined_addr, '')), ''), ${PC_ASSIST_HQ_ADDRESS}) AS address,
        tp.thd_area AS "deliveryArea",
        tp.thd_postal_code AS "deliveryPostalCode",
        tp.thd_address_line AS "deliveryAddressLine",
        tp.thd_building_name AS "deliveryBuilding",
        hr."jobTitleName" AS "jobTitle",
        hr."systemEmail" AS email,
        NULL::text AS phone,
        hr."employmentType",
        hr."employeeCategory",
        hr."occupationName",
        hr."retirementDate",
        hr."retirementCategory",
        hr."retirementCategoryCode"
      FROM latest_hr hr
      LEFT JOIN thd_pick tp ON ${Prisma.raw(SQL_NORMALIZE_DEPARTMENT_CODE('hr."departmentCode"'))} = tp."departmentCode"
      WHERE (
        hr."employeeNumber" ILIKE ${normPat} ESCAPE '\\'
        OR (${displayNameSql}) ILIKE ${normPat} ESCAPE '\\'
        OR regexp_replace(COALESCE((${displayNameSql})::text, ''), '[　[:space:]]+', '', 'g') ILIKE ${compactPat} ESCAPE '\\'
      )
      ${tokenAndClause}
      ORDER BY hr."employeeNumber" ASC
      LIMIT 20
    `;

    const employees = rawRows.map((row) => normalizeEmployeeSearchRow(row as Record<string, unknown>));

    return json({ employees });
  } catch (e) {
    console.error("[employees search]", e);
    return json(
      { employees: [], error: "社員検索に失敗しました。" },
      { status: 500 },
    );
  }
}
