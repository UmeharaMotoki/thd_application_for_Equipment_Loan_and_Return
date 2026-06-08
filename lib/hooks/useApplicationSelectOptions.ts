"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApplicationSelectCategory } from "@/lib/applicationSelectOptionCategories";
import { fetchFormOptionsCached, peekFormOptionsCache } from "@/lib/itServiceMasterDataCache";

export type ApplicationSelectOptionsState = {
  labelsByCategory: Partial<Record<ApplicationSelectCategory, string[]>>;
  loading: boolean;
  error: string | null;
};

export function useApplicationSelectOptions(
  categories: readonly ApplicationSelectCategory[],
): ApplicationSelectOptionsState {
  const key = useMemo(() => [...categories].sort().join(","), [categories]);

  const initialFromCache = useMemo(() => {
    const opt = peekFormOptionsCache(categories);
    if (!opt) return null;
    const next: Partial<Record<ApplicationSelectCategory, string[]>> = {};
    for (const c of categories) {
      next[c] = (opt[c] ?? []).map((x) => x.label);
    }
    return next;
  }, [categories]);

  const [labelsByCategory, setLabelsByCategory] = useState<
    Partial<Record<ApplicationSelectCategory, string[]>>
  >(initialFromCache ?? {});
  const [loading, setLoading] = useState(initialFromCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length === 0) {
      setLoading(false);
      return;
    }
    if (peekFormOptionsCache(categories)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const opt = (await fetchFormOptionsCached(categories)) ?? {};
        const next: Partial<Record<ApplicationSelectCategory, string[]>> = {};
        for (const c of categories) {
          next[c] = (opt[c] ?? []).map((x) => x.label);
        }
        if (!cancelled) {
          setLabelsByCategory(next);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("選択肢の取得に失敗しました。ページを再読み込みするか、時間をおいて再度お試しください。");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, categories]);

  return { labelsByCategory, loading, error };
}
