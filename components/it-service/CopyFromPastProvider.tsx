"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import CopyFromPastRequestsDialog from "@/components/equipment-lending/CopyFromPastRequestsDialog";
import CopyFromPastReturnRequestsDialog from "@/components/equipment-return/CopyFromPastReturnRequestsDialog";
import {
  LENDING_PREFILL_SESSION_KEY,
  RETURN_PREFILL_SESSION_KEY,
} from "@/lib/copyFromPastConstants";
import type { LendingRequestPrefillPayload } from "@/lib/mapEquipmentRequestToPrefill";
import type { EquipmentReturnPrefillPayload } from "@/lib/mapEquipmentReturnRequestToPrefill";
import { buildArchivePrefill, enrichLendingPrefillForCopy, enrichReturnPrefillForCopy } from "@/lib/copyFromPastPrefillFetch";
import { loadNamedRequestArchives, type NamedRequestArchive } from "@/lib/namedRequestArchives";

const BRAND = "#007D9E";

type CopyFromPastContextValue = {
  openLendingCopyDialog: () => void;
  openReturnCopyDialog: () => void;
  archives: NamedRequestArchive[];
  refreshArchives: () => void;
  applyFromNamedArchive: (a: NamedRequestArchive) => Promise<void>;
  registerLendingPrefill: (fn: ((p: LendingRequestPrefillPayload) => void) | null) => void;
  registerReturnPrefill: (fn: ((p: EquipmentReturnPrefillPayload) => void) | null) => void;
};

const CopyFromPastContext = createContext<CopyFromPastContextValue | null>(null);

export function useCopyFromPastBridge(): CopyFromPastContextValue {
  const v = useContext(CopyFromPastContext);
  if (!v) {
    throw new Error("CopyFromPastProvider でラップしてください。");
  }
  return v;
}

export function useCopyFromPastBridgeOptional(): CopyFromPastContextValue | null {
  return useContext(CopyFromPastContext);
}

export function useRegisterLendingCopyPrefill(fn: (p: LendingRequestPrefillPayload) => void) {
  const { registerLendingPrefill } = useCopyFromPastBridge();
  useEffect(() => {
    registerLendingPrefill(fn);
    return () => registerLendingPrefill(null);
  }, [fn, registerLendingPrefill]);
}

export function useRegisterReturnCopyPrefill(fn: (p: EquipmentReturnPrefillPayload) => void) {
  const { registerReturnPrefill } = useCopyFromPastBridge();
  useEffect(() => {
    registerReturnPrefill(fn);
    return () => registerReturnPrefill(null);
  }, [fn, registerReturnPrefill]);
}

export function CopyFromPastProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [lendingOpen, setLendingOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [archives, setArchives] = useState<NamedRequestArchive[]>([]);

  const lendingRef = useRef<((p: LendingRequestPrefillPayload) => void) | null>(null);
  const returnRef = useRef<((p: EquipmentReturnPrefillPayload) => void) | null>(null);

  useEffect(() => {
    setArchives(loadNamedRequestArchives());
  }, []);

  const refreshArchives = useCallback(() => {
    setArchives(loadNamedRequestArchives());
  }, []);

  const registerLendingPrefill = useCallback(
    (fn: ((p: LendingRequestPrefillPayload) => void) | null) => {
      lendingRef.current = fn;
    },
    [],
  );

  const registerReturnPrefill = useCallback(
    (fn: ((p: EquipmentReturnPrefillPayload) => void) | null) => {
      returnRef.current = fn;
    },
    [],
  );

  const deliverLending = useCallback(
    (p: LendingRequestPrefillPayload) => {
      if (lendingRef.current) {
        lendingRef.current(p);
        return;
      }
      try {
        sessionStorage.setItem(LENDING_PREFILL_SESSION_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
      router.push("/equipment-lending");
    },
    [router],
  );

  const deliverReturn = useCallback(
    (p: EquipmentReturnPrefillPayload) => {
      if (returnRef.current) {
        returnRef.current(p);
        return;
      }
      try {
        sessionStorage.setItem(RETURN_PREFILL_SESSION_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
      router.push("/equipment-return");
    },
    [router],
  );

  const applyFromNamedArchive = useCallback(
    async (a: NamedRequestArchive) => {
      try {
        const prefill = await buildArchivePrefill(
          a.kind,
          a.sourceRequestId,
          a.applicantNameSnapshot ?? "",
          a.applicantEmployeeNumber,
        );
        if (a.kind === "lending") {
          deliverLending(prefill as LendingRequestPrefillPayload);
        } else {
          deliverReturn(prefill as EquipmentReturnPrefillPayload);
        }
        return;
      } catch (fetchError) {
        if (!a.prefill) {
          throw fetchError;
        }
      }

      if (a.kind === "lending") {
        const enriched = await enrichLendingPrefillForCopy(a.prefill as LendingRequestPrefillPayload);
        deliverLending(enriched);
        return;
      }
      deliverReturn(await enrichReturnPrefillForCopy(a.prefill as EquipmentReturnPrefillPayload));
    },
    [deliverLending, deliverReturn],
  );

  const value = useMemo(
    () => ({
      openLendingCopyDialog: () => setLendingOpen(true),
      openReturnCopyDialog: () => setReturnOpen(true),
      archives,
      refreshArchives,
      applyFromNamedArchive,
      registerLendingPrefill,
      registerReturnPrefill,
    }),
    [archives, refreshArchives, applyFromNamedArchive, registerLendingPrefill, registerReturnPrefill],
  );

  return (
    <CopyFromPastContext.Provider value={value}>
      {children}
      <CopyFromPastRequestsDialog
        open={lendingOpen}
        onClose={() => setLendingOpen(false)}
        brandColor={BRAND}
        onLendingPrefill={deliverLending}
        onReturnPrefill={deliverReturn}
        onArchivesUpdated={refreshArchives}
      />
      <CopyFromPastReturnRequestsDialog
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        brandColor={BRAND}
        onLendingPrefill={deliverLending}
        onReturnPrefill={deliverReturn}
        onArchivesUpdated={refreshArchives}
      />
    </CopyFromPastContext.Provider>
  );
}

export default CopyFromPastProvider;
