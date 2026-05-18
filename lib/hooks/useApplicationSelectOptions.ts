"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApplicationSelectCategory } from "@/lib/applicationSelectOptionCategories";

export type ApplicationSelectOptionsState = {
  labelsByCategory: Partial<Record<ApplicationSelectCategory, string[]>>;
  loading: boolean;
  error: string | null;
};

export function useApplicationSelectOptions(
  categories: readonly ApplicationSelectCategory[],
): ApplicationSelectOptionsState {
  const key = useMemo(() => [...categories].sort().join(","), [categories]);
  const [labelsByCategory, setLabelsByCategory] = useState<
    Partial<Record<ApplicationSelectCategory, string[]>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const u = new URL("/api/form-options", window.location.origin);
        u.searchParams.set("categories", categories.join(","));
        const res = await fetch(u.toString());
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          options?: Record<string, { label: string }[]>;
        };
        const next: Partial<Record<ApplicationSelectCategory, string[]>> = {};
        const opt = data.options ?? {};
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
  }, [key]);

  return { labelsByCategory, loading, error };
}
