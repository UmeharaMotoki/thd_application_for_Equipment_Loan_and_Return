import type { PrismaClient } from "@prisma/client";
import { FALLBACK_EMPLOYMENT_TYPE_LABELS } from "@/lib/formOptionsStaticFallback";

export type EmploymentTypeOption = { label: string; code: string | null };

export async function fetchDistinctEmploymentTypesFromHr(
  prisma: PrismaClient,
): Promise<EmploymentTypeOption[]> {
  const rows = await prisma.hrPersonnelRecord.findMany({
    where: {
      employmentType: { not: null },
      NOT: { employmentType: "" },
    },
    distinct: ["employmentType"],
    select: { employmentType: true, employmentTypeCode: true },
    orderBy: { employmentType: "asc" },
  });
  return rows
    .map((r) => ({
      label: (r.employmentType ?? "").trim(),
      code: r.employmentTypeCode?.trim() || null,
    }))
    .filter((r) => r.label.length > 0);
}

export async function getEmploymentTypeOptionsForApi(
  prisma: PrismaClient,
): Promise<EmploymentTypeOption[]> {
  const hrRows = await fetchDistinctEmploymentTypesFromHr(prisma);
  const byLabel = new Map<string, EmploymentTypeOption>();
  for (const r of hrRows) {
    byLabel.set(r.label, r);
  }
  const merged = new Set<string>([...FALLBACK_EMPLOYMENT_TYPE_LABELS]);
  for (const r of hrRows) {
    merged.add(r.label);
  }
  return [...merged]
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((label) => ({
      label,
      code: byLabel.get(label)?.code ?? null,
    }));
}

export async function getEmploymentTypeLabelSetForValidation(
  prisma: PrismaClient,
): Promise<Set<string>> {
  return new Set((await getEmploymentTypeOptionsForApi(prisma)).map((o) => o.label));
}
