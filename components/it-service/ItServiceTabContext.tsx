"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type ItServiceTab = "lending" | "return";

function tabFromPathname(pathname: string): ItServiceTab | null {
  if (pathname.startsWith("/equipment-return")) return "return";
  if (pathname.startsWith("/equipment-lending")) return "lending";
  return null;
}

function urlForTab(tab: ItServiceTab): string {
  return tab === "lending" ? "/equipment-lending" : "/equipment-return";
}

type ContextValue = {
  tab: ItServiceTab;
  switchTab: (tab: ItServiceTab) => void;
};

const ItServiceTabContext = createContext<ContextValue | null>(null);

export function ItServiceTabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const fromPath = tabFromPathname(pathname);
  const [tab, setTab] = useState<ItServiceTab>(fromPath ?? "lending");

  useEffect(() => {
    const t = tabFromPathname(pathname);
    if (t) setTab(t);
  }, [pathname]);

  const switchTab = useCallback((next: ItServiceTab) => {
    setTab(next);
    const url = urlForTab(next);
    if (typeof window !== "undefined" && window.location.pathname !== url) {
      window.history.replaceState(null, "", url);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const t = tabFromPathname(window.location.pathname);
      if (t) setTab(t);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo(() => ({ tab, switchTab }), [tab, switchTab]);

  return <ItServiceTabContext.Provider value={value}>{children}</ItServiceTabContext.Provider>;
}

export function useItServiceTab(): ContextValue {
  const ctx = useContext(ItServiceTabContext);
  if (!ctx) {
    throw new Error("useItServiceTab は ItServiceTabProvider 内で使用してください。");
  }
  return ctx;
}

export function useItServiceTabOptional(): ContextValue | null {
  return useContext(ItServiceTabContext);
}
