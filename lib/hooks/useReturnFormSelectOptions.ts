"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APPLICATION_SELECT_CATEGORIES,
  RETURN_PAGE_FORM_OPTION_CATEGORIES,
  type ApplicationSelectCategory,
} from "@/lib/applicationSelectOptionCategories";

export type FormSelectOption = { code: string | null; label: string };

export type ReturnFormSelectOptionsState = {
  optionsByCategory: Partial<Record<ApplicationSelectCategory, FormSelectOption[]>>;
  accessoriesByParentCode: Record<string, FormSelectOption[]>;
  assetNumberLabelByCode: Record<string, string>;
  loading: boolean;
  error: string | null;
  ready: boolean;
};

export function useReturnFormSelectOptions(): ReturnFormSelectOptionsState {
  const key = useMemo(() => [...RETURN_PAGE_FORM_OPTION_CATEGORIES].sort().join(","), []);
  const [optionsByCategory, setOptionsByCategory] = useState<
    Partial<Record<ApplicationSelectCategory, FormSelectOption[]>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const u = new URL("/api/form-options", window.location.origin);
        u.searchParams.set("categories", RETURN_PAGE_FORM_OPTION_CATEGORIES.join(","));
        const res = await fetch(u.toString());
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          options?: Record<string, FormSelectOption[]>;
        };
        const next: Partial<Record<ApplicationSelectCategory, FormSelectOption[]>> = {};
        const opt = data.options ?? {};
        for (const c of RETURN_PAGE_FORM_OPTION_CATEGORIES) {
          next[c] = (opt[c] ?? []).map((x) => ({
            code: x.code ?? null,
            label: x.label,
          }));
        }
        if (!cancelled) {
          setOptionsByCategory(next);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(
            "返却フォームの選択肢を取得できませんでした。マスタ（application_select_option）を投入したうえでページを再読み込みしてください。",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const accessoriesByParentCode = useMemo(() => {
    const rows = optionsByCategory[APPLICATION_SELECT_CATEGORIES.returnItemAccessory] ?? [];
    const map: Record<string, FormSelectOption[]> = {};
    for (const row of rows) {
      const parent = (row.code ?? "").trim();
      if (!parent) continue;
      if (!map[parent]) map[parent] = [];
      map[parent].push(row);
    }
    return map;
  }, [optionsByCategory]);

  const assetNumberLabelByCode = useMemo(() => {
    const rows = optionsByCategory[APPLICATION_SELECT_CATEGORIES.returnAssetNumberLabel] ?? [];
    const map: Record<string, string> = {};
    for (const row of rows) {
      const code = (row.code ?? "").trim();
      if (code) map[code] = row.label;
    }
    return map;
  }, [optionsByCategory]);

  const ready = useMemo(() => {
    if (loading || error) return false;
    const main = optionsByCategory[APPLICATION_SELECT_CATEGORIES.returnMainItem] ?? [];
    return main.length > 0;
  }, [loading, error, optionsByCategory]);

  return {
    optionsByCategory,
    accessoriesByParentCode,
    assetNumberLabelByCode,
    loading,
    error,
    ready,
  };
}
