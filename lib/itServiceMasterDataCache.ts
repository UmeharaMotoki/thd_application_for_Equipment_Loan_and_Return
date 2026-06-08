import type { ApplicationSelectCategory } from "@/lib/applicationSelectOptionCategories";

type FormOptionsResponse = {
  options?: Record<string, { label: string; code?: string | null }[]>;
};

let employmentTypesCache: string[] | null = null;
let employmentTypesInflight: Promise<string[]> | null = null;

const formOptionsCache = new Map<string, FormOptionsResponse["options"]>();
const formOptionsInflight = new Map<string, Promise<FormOptionsResponse["options"]>>();

export async function fetchEmploymentTypeLabelsCached(): Promise<string[]> {
  if (employmentTypesCache) return employmentTypesCache;
  if (!employmentTypesInflight) {
    employmentTypesInflight = (async () => {
      const res = await fetch(new URL("/api/master/employment-types", window.location.origin));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items?: { label: string }[] };
      const list = (data.items ?? []).map((x) => x.label).filter((s) => s.trim().length > 0);
      employmentTypesCache = list;
      return list;
    })().finally(() => {
      employmentTypesInflight = null;
    });
  }
  return employmentTypesInflight;
}

export function peekEmploymentTypeLabelsCache(): string[] | null {
  return employmentTypesCache;
}

export async function fetchFormOptionsCached(
  categories: readonly ApplicationSelectCategory[],
): Promise<FormOptionsResponse["options"]> {
  const key = [...categories].sort().join(",");
  const hit = formOptionsCache.get(key);
  if (hit) return hit;

  let inflight = formOptionsInflight.get(key);
  if (!inflight) {
    inflight = (async () => {
      const u = new URL("/api/form-options", window.location.origin);
      u.searchParams.set("categories", categories.join(","));
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FormOptionsResponse;
      const opt = data.options ?? {};
      formOptionsCache.set(key, opt);
      return opt;
    })().finally(() => {
      formOptionsInflight.delete(key);
    });
    formOptionsInflight.set(key, inflight);
  }
  return inflight;
}

export function peekFormOptionsCache(
  categories: readonly ApplicationSelectCategory[],
): FormOptionsResponse["options"] | undefined {
  return formOptionsCache.get([...categories].sort().join(","));
}
