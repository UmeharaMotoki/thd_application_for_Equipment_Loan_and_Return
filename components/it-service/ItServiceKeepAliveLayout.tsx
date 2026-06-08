"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import ItServiceShell from "@/components/it-service/ItServiceShell";
import { useItServiceTab } from "@/components/it-service/ItServiceTabContext";
import {
  LENDING_PAGE_FORM_OPTION_CATEGORIES,
  RETURN_PAGE_FORM_OPTION_CATEGORIES,
} from "@/lib/applicationSelectOptionCategories";
import {
  fetchEmploymentTypeLabelsCached,
  fetchFormOptionsCached,
} from "@/lib/itServiceMasterDataCache";

function PanelLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress size={36} sx={{ color: "#007D9E" }} />
    </Box>
  );
}

const EquipmentLendingApplication = dynamic(
  () => import("@/components/equipment-lending/EquipmentLendingApplication"),
  { loading: () => <PanelLoading />, ssr: false },
);

const EquipmentReturnApplication = dynamic(
  () => import("@/components/equipment-return/EquipmentReturnApplication"),
  { loading: () => <PanelLoading />, ssr: false },
);

const hiddenPanelSx = {
  display: "none",
  pointerEvents: "none",
} as const;

/** タブ切替はクライアント状態のみ。非表示側は初回アクセス時までマウントしない */
export default function ItServiceKeepAliveLayout() {
  const { tab } = useItServiceTab();
  const isLending = tab === "lending";
  const isReturn = tab === "return";

  const [mounted, setMounted] = useState({
    lending: isLending,
    return: isReturn,
  });

  useLayoutEffect(() => {
    setMounted((prev) => ({
      lending: prev.lending || isLending,
      return: prev.return || isReturn,
    }));
  }, [isLending, isReturn]);

  useEffect(() => {
    void fetchEmploymentTypeLabelsCached().catch(() => {});
    void fetchFormOptionsCached(LENDING_PAGE_FORM_OPTION_CATEGORIES).catch(() => {});
    void fetchFormOptionsCached(RETURN_PAGE_FORM_OPTION_CATEGORIES).catch(() => {});
    void import("@/components/equipment-lending/EquipmentLendingApplication");
    void import("@/components/equipment-return/EquipmentReturnApplication");
  }, []);

  const mainTitle = isLending
    ? "ITサービス依頼　機器貸与 申請"
    : "ITサービス依頼　機器返却 申請";

  return (
    <ItServiceShell activeMenu={tab} mainTitle={mainTitle}>
      {mounted.lending && (
        <Box sx={isLending ? undefined : hiddenPanelSx} aria-hidden={!isLending}>
          <EquipmentLendingApplication />
        </Box>
      )}
      {mounted.return && (
        <Box sx={isReturn ? undefined : hiddenPanelSx} aria-hidden={!isReturn}>
          <EquipmentReturnApplication />
        </Box>
      )}
    </ItServiceShell>
  );
}
