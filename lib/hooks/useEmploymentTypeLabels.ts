"use client";

import { useEffect, useState } from "react";
import { FALLBACK_EMPLOYMENT_TYPE_LABELS } from "@/lib/formOptionsStaticFallback";

export type EmploymentTypeLabelsState = {
  labels: string[];
  loading: boolean;
  error: string | null;
};

export function useEmploymentTypeLabels(): EmploymentTypeLabelsState {
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(new URL("/api/master/employment-types", window.location.origin));
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { items?: { label: string }[] };
        const list = (data.items ?? []).map((x) => x.label).filter((s) => s.trim().length > 0);
        if (!cancelled) {
          setLabels(list.length > 0 ? list : [...FALLBACK_EMPLOYMENT_TYPE_LABELS]);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLabels([...FALLBACK_EMPLOYMENT_TYPE_LABELS]);
          setError("雇用形態一覧の取得に失敗しました。表示は既定の選択肢にフォールバックしています。");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { labels, loading, error };
}
