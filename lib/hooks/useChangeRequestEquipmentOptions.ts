"use client";

import { useEffect, useState } from "react";
import { APPLICATION_SELECT_CATEGORIES } from "@/lib/applicationSelectOptionCategories";

export type EquipmentOption = { label: string; code: string | null };

export function useChangeRequestEquipmentOptions() {
  const [options, setOptions] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const category = APPLICATION_SELECT_CATEGORIES.changeRequestEquipmentType;
        const res = await fetch(`/api/form-options?categories=${encodeURIComponent(category)}`, {
          signal: ac.signal,
          credentials: "same-origin",
        });
        const text = await res.text();
        let data: { options?: Record<string, EquipmentOption[]>; error?: string };
        try {
          data = JSON.parse(text) as typeof data;
        } catch {
          setError(
            res.ok
              ? "機器種別の取得に失敗しました。"
              : `機器種別の取得に失敗しました。（HTTP ${res.status}）`,
          );
          setOptions([]);
          return;
        }
        if (!res.ok) {
          setError(data.error ?? "機器種別の取得に失敗しました。");
          setOptions([]);
          return;
        }
        setOptions(data.options?.[category] ?? []);
        setError(null);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("機器種別の取得に失敗しました。");
        setOptions([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { options, loading, error };
}
