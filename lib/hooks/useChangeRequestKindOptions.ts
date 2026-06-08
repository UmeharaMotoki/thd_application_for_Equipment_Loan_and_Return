"use client";

import { useEffect, useState } from "react";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";
import type { ChangeRequestKindOption } from "@/lib/changeRequestKind";

export function useChangeRequestKindOptions() {
  const [options, setOptions] = useState<ChangeRequestKindOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const category = APPLICATION_SELECT_CATEGORIES.changeRequestKind;
        const res = await fetch(`/api/form-options?categories=${encodeURIComponent(category)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          options?: Record<string, ChangeRequestKindOption[]>;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "変更種別の取得に失敗しました。");
          setOptions([]);
          return;
        }
        setOptions(data.options?.[category] ?? []);
        setError(null);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("変更種別の取得に失敗しました。");
        setOptions([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { options, loading, error };
}
