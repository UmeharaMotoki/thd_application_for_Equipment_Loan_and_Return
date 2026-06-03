"use client";

import { useCallback, useMemo } from "react";
import {
  APPLICATION_SELECT_CATEGORIES,
  LENDING_PAGE_FORM_OPTION_CATEGORIES,
  type ApplicationSelectCategory,
} from "@/lib/applicationSelectOptionCategories";
import { STATIC_LENDING_REQUEST_REASON_OPTIONS } from "@/lib/formOptionsStaticFallback";
import {
  LAN_CABLE_LENGTH_OPTIONS,
  LENDING_EQUIPMENT_TYPE_OPTIONS,
  MONITOR_SIZE_OPTIONS,
} from "@/lib/lendingEquipmentOptions";
import {
  DECISION_CLIENT_NO,
  DECISION_CLIENT_YES,
  DECISION_CONTRACT_DISPATCH,
  DECISION_CONTRACT_QUASI,
  DECISION_WORK_DEVELOPMENT,
  DECISION_WORK_INTERNAL,
  MS_OFFICE_EDITION_STANDARD_OPTIONS,
  STAFF_MANAGEMENT,
  STAFF_TECHNICAL,
} from "@/lib/resolvePcSpecDecision";
import { useApplicationSelectOptions } from "@/lib/hooks/useApplicationSelectOptions";

/** 機器貸与フォームのマスタ選択肢（申請理由・機器種別・PC判定・周辺等） */
export function useLendingFormOptions() {
  const { labelsByCategory, error: formOptionsError } =
    useApplicationSelectOptions(LENDING_PAGE_FORM_OPTION_CATEGORIES);

  const pickOptions = useCallback(
    (cat: ApplicationSelectCategory, fallback: readonly string[]): string[] => {
      const list = labelsByCategory[cat];
      return list && list.length > 0 ? list : [...fallback];
    },
    [labelsByCategory],
  );

  const lendingRequestReasonOptions = useMemo(
    () =>
      pickOptions(
        APPLICATION_SELECT_CATEGORIES.lendingRequestReason,
        STATIC_LENDING_REQUEST_REASON_OPTIONS,
      ),
    [pickOptions],
  );
  const lendingEquipmentTypeOptions = useMemo(
    () =>
      pickOptions(
        APPLICATION_SELECT_CATEGORIES.lendingEquipmentType,
        LENDING_EQUIPMENT_TYPE_OPTIONS,
      ),
    [pickOptions],
  );
  const userStaffCategoryOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.userStaffCategory, [
        STAFF_MANAGEMENT,
        STAFF_TECHNICAL,
      ]),
    [pickOptions],
  );
  const decisionContractTypeOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.decisionContractType, [
        DECISION_CONTRACT_QUASI,
        DECISION_CONTRACT_DISPATCH,
      ]),
    [pickOptions],
  );
  const decisionWorkContentOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.decisionWorkContent, [
        DECISION_WORK_DEVELOPMENT,
        DECISION_WORK_INTERNAL,
      ]),
    [pickOptions],
  );
  const decisionClientEnvOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.decisionClientEnv, [
        DECISION_CLIENT_YES,
        DECISION_CLIENT_NO,
      ]),
    [pickOptions],
  );
  const smartphoneCameraOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.smartphoneCamera, ["カメラあり", "カメラなし"]),
    [pickOptions],
  );
  const smartphoneUserIdentificationOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.smartphoneUserIdentification, [
        "特定する",
        "特定しない",
      ]),
    [pickOptions],
  );
  const smartphoneWorkplaceOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.smartphoneWorkplace, [
        "事業場で利用する",
        "事業場で利用しない",
      ]),
    [pickOptions],
  );
  const peripheralMonitorSizeOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.peripheralMonitorSize, MONITOR_SIZE_OPTIONS),
    [pickOptions],
  );
  const peripheralLanCableLengthOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength, LAN_CABLE_LENGTH_OPTIONS),
    [pickOptions],
  );
  const msOfficeMenuOptionsPool = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.msOfficeEdition, MS_OFFICE_EDITION_STANDARD_OPTIONS),
    [pickOptions],
  );

  return {
    formOptionsError,
    lendingRequestReasonOptions,
    lendingEquipmentTypeOptions,
    userStaffCategoryOptions,
    decisionContractTypeOptions,
    decisionWorkContentOptions,
    decisionClientEnvOptions,
    smartphoneCameraOptions,
    smartphoneUserIdentificationOptions,
    smartphoneWorkplaceOptions,
    peripheralMonitorSizeOptions,
    peripheralLanCableLengthOptions,
    msOfficeMenuOptionsPool,
  };
}
