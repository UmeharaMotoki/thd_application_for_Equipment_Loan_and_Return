"use client";

import { useEffect, useState } from "react";
import { FALLBACK_EMPLOYMENT_TYPE_LABELS } from "@/lib/formOptionsStaticFallback";
import {
  fetchEmploymentTypeLabelsCached,
  peekEmploymentTypeLabelsCache,
} from "@/lib/itServiceMasterDataCache";

export type EmploymentTypeLabelsState = {
  labels: string[];
  loading: boolean;
  error: string | null;
};

export function useEmploymentTypeLabels(): EmploymentTypeLabelsState {
  const cached = peekEmploymentTypeLabelsCache();
  const [labels, setLabels] = useState<string[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (peekEmploymentTypeLabelsCache()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const list = await fetchEmploymentTypeLabelsCached();
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
