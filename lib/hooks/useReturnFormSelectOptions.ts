"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APPLICATION_SELECT_CATEGORIES,
  RETURN_PAGE_FORM_OPTION_CATEGORIES,
  type ApplicationSelectCategory,
} from "@/lib/applicationSelectOptionCategories";
import { fetchFormOptionsCached, peekFormOptionsCache } from "@/lib/itServiceMasterDataCache";

export type FormSelectOption = { code: string | null; label: string };

export type ReturnFormSelectOptionsState = {
  optionsByCategory: Partial<Record<ApplicationSelectCategory, FormSelectOption[]>>;
  accessoriesByParentCode: Record<string, FormSelectOption[]>;
  assetNumberLabelByCode: Record<string, string>;
  loading: boolean;
  error: string | null;
  ready: boolean;
};

function optionsFromCache(
  opt: Record<string, { label: string; code?: string | null }[]>,
): Partial<Record<ApplicationSelectCategory, FormSelectOption[]>> {
  const next: Partial<Record<ApplicationSelectCategory, FormSelectOption[]>> = {};
  for (const c of RETURN_PAGE_FORM_OPTION_CATEGORIES) {
    next[c] = (opt[c] ?? []).map((x) => ({
      code: x.code ?? null,
      label: x.label,
    }));
  }
  return next;
}

export function useReturnFormSelectOptions(): ReturnFormSelectOptionsState {
  const key = useMemo(() => [...RETURN_PAGE_FORM_OPTION_CATEGORIES].sort().join(","), []);

  const initialFromCache = useMemo(() => {
    const opt = peekFormOptionsCache(RETURN_PAGE_FORM_OPTION_CATEGORIES);
    return opt ? optionsFromCache(opt) : null;
  }, []);

  const [optionsByCategory, setOptionsByCategory] = useState<
    Partial<Record<ApplicationSelectCategory, FormSelectOption[]>>
  >(initialFromCache ?? {});
  const [loading, setLoading] = useState(initialFromCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (peekFormOptionsCache(RETURN_PAGE_FORM_OPTION_CATEGORIES)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const opt = (await fetchFormOptionsCached(RETURN_PAGE_FORM_OPTION_CATEGORIES)) ?? {};
        if (!cancelled) {
          setOptionsByCategory(optionsFromCache(opt));
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
