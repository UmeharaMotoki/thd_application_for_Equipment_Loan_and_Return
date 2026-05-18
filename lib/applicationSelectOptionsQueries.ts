import type { PrismaClient } from "@prisma/client";
import type { ApplicationSelectCategory } from "@/lib/applicationSelectOptionCategories";

export type OptionRow = { category: string; label: string; code: string | null; sortOrder: number };

export async function fetchActiveOptionsByCategories(
  prisma: PrismaClient,
  categories: readonly string[],
): Promise<OptionRow[]> {
  if (categories.length === 0) return [];
  return prisma.applicationSelectOption.findMany({
    where: { category: { in: [...categories] }, isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    select: { category: true, label: true, code: true, sortOrder: true },
  });
}

export function optionsRowsToLabelSet(rows: OptionRow[], category: string): Set<string> {
  return new Set(rows.filter((r) => r.category === category).map((r) => r.label));
}

export function optionsRowsToLabelsByCategory(
  rows: OptionRow[],
  categories: readonly ApplicationSelectCategory[],
): Map<ApplicationSelectCategory, string[]> {
  const map = new Map<ApplicationSelectCategory, string[]>();
  for (const c of categories) {
    map.set(
      c,
      rows.filter((r) => r.category === c).map((r) => r.label),
    );
  }
  return map;
}
