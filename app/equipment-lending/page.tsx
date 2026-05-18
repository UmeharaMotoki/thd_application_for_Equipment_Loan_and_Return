"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/ja";
import ItServiceShell from "@/components/it-service/ItServiceShell";
import { useRegisterLendingCopyPrefill } from "@/components/it-service/CopyFromPastProvider";
import { brandDatePickerSlotProps } from "@/lib/brandDatePicker";
import { compareIsoDateOnly, parseIsoDateOnly } from "@/lib/dateOnly";
import {
  APPLICATION_SELECT_CATEGORIES,
  LENDING_PAGE_FORM_OPTION_CATEGORIES,
  type ApplicationSelectCategory,
} from "@/lib/applicationSelectOptionCategories";
import { STATIC_LENDING_REQUEST_REASON_OPTIONS } from "@/lib/formOptionsStaticFallback";
import { useApplicationSelectOptions } from "@/lib/hooks/useApplicationSelectOptions";
import { useEmploymentTypeLabels } from "@/lib/hooks/useEmploymentTypeLabels";
import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";
import { EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE } from "@/lib/hrPersonnelRetired";
import {
  deliveryPatchFromEmployeeSearch,
  fetchDeliveryAddressPatch,
  patchFromThdLocationRow,
} from "@/lib/resolveDeliveryAddressForEmployee";
import { LICENSE_SPEC_ROWS } from "@/lib/licenseSpecTree";
import {
  DECISION_CLIENT_NO,
  DECISION_CLIENT_YES,
  DECISION_CONTRACT_DISPATCH,
  DECISION_CONTRACT_QUASI,
  DECISION_WORK_DEVELOPMENT,
  DECISION_WORK_INTERNAL,
  MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED,
  MS_OFFICE_EDITION_STANDARD_OPTIONS,
  STAFF_MANAGEMENT,
  STAFF_TECHNICAL,
  decisionResolutionToLicenseFields,
  isMsOfficeEditionAllowedForPcDecision,
  resolvePcSpecDecision,
} from "@/lib/resolvePcSpecDecision";
import { IT_SERVICE_WARNINGS } from "@/lib/itServiceWarnings";
import { deriveUserStaffCategoryFromHr } from "@/lib/userStaffCategoryFromHr";
import { LENDING_PREFILL_SESSION_KEY } from "@/lib/copyFromPastConstants";
import type { LendingRequestPrefillPayload } from "@/lib/mapEquipmentRequestToPrefill";
import {
  EQUIPMENT_CATEGORY_LABEL,
  EQUIPMENT_CATEGORY_MAP,
  LAN_CABLE_LENGTH_OPTIONS,
  LENDING_EQUIPMENT_TYPE_OPTIONS,
  LENDING_NON_PC_STAFF_CATEGORY,
  MONITOR_SIZE_OPTIONS,
  lendingLinesIncludeCommunication,
  lendingLinesIncludeEquipment,
  lendingLinesIncludePc,
  lendingLinesIncludePeripheral,
  lendingLinesIncludeSmartphone,
  lendingLinesIncludeWifiRouter,
  type EquipmentCategory,
  type LendingEquipmentTypeOption,
} from "@/lib/lendingEquipmentOptions";

type ApplicantFormData = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
  applicantJobTitle: string;
  applicantEmail: string;
  applicantPhone: string;
};

type UserFormData = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
  /** PC 貸与時の判定用（管理社員／技術社員）。人事データに基づき自動設定可・手動で修正可 */
  userStaffCategory: string;
  userCostDeptName: string;
  userCostDeptCode: string;
  userEmail: string;
  userPhone: string;
  /** 人事マスタ「社員区分」（利用者区分の自動判定用） */
  userHrEmployeeCategory: string;
  /** 人事マスタ「職種名称」（補助判定用） */
  userHrOccupationName: string;
};

type DeliveryFormData = {
  deliverySameAsUser: boolean;
  deliveryName: string;
  /** 送付先氏名でマスタから確定した社員番号（未確定時は空） */
  deliveryEmployeeNumber: string;
  deliveryCompanyName: string;
  deliveryDepartment: string;
  deliveryArea: string;
  deliveryPostalCode: string;
  deliveryAddress: string;
  deliveryBuilding: string;
  deliveryEmail: string;
  deliveryPhone: string;
};

type ReasonFormData = {
  requestReason: string;
  /** セールスフォース等・機器行ごと送信時の申請単位キー（申請理由画面入場時に自動採番） */
  applicationCorrelationId: string;
  decisionContractType: string;
  decisionWorkContent: string;
  decisionClientEnv: string;
  msOfficeEdition: string;
  lendingStartDate: string;
  expectedReturnDate: string;
  requestDetail: string;
  smartphoneCameraPresence: string;
  smartphoneUserIdentification: string;
  smartphoneWorkplaceUse: string;
  peripheralMonitorSize: string;
  peripheralMonitorSizeCustom: string;
  peripheralLanCableLength: string;
  peripheralLanCableLengthCustom: string;
};

type LendingEquipmentLine = {
  id: string;
  equipmentType: string;
};

type DraftPayload = {
  applicant: ApplicantFormData;
  user: UserFormData;
  delivery?: DeliveryFormData;
  lendingLines?: LendingEquipmentLine[];
  reason?: ReasonFormData;
};

function newLendingEquipmentLine(): LendingEquipmentLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lend-line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    equipmentType: "",
  };
}

function newApplicationCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DRAFT_KEY = "equipment-request-draft";

const APPLICANT_DETAIL_FIELDS: Array<{ key: keyof ApplicantFormData; label: string }> = [
  { key: "companyName", label: "所属企業名" },
  { key: "departmentName", label: "部署名" },
  { key: "address", label: "住所" },
  { key: "applicantJobTitle", label: "役職" },
  { key: "applicantEmail", label: "Eメール" },
  { key: "applicantPhone", label: "電話番号" },
];

type EmployeeOption = {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  departmentCode: string | null;
  address: string;
  deliveryArea: string | null;
  deliveryPostalCode: string | null;
  deliveryAddressLine: string | null;
  deliveryBuilding: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  employmentType: string | null;
  employeeCategory: string | null;
  occupationName: string | null;
  /** 人事マスタの退職区分・退職年月日に基づく */
  retired: boolean;
};

const USER_DETAIL_FIELDS: Array<{ key: keyof UserFormData; label: string }> = [
  { key: "userCompanyName", label: "所属企業名" },
  { key: "userDepartmentName", label: "部署名" },
  { key: "userAddress", label: "住所" },
];

const initialApplicant: ApplicantFormData = {
  applicantName: "",
  employeeNumber: "",
  companyName: "",
  departmentName: "",
  address: "",
  applicantJobTitle: "",
  applicantEmail: "",
  applicantPhone: "",
};

const initialUser: UserFormData = {
  userName: "",
  userEmployeeNumber: "",
  userCompanyName: "",
  userDepartmentName: "",
  userAddress: "",
  userContractType: "",
  userStaffCategory: "",
  userCostDeptName: "",
  userCostDeptCode: "",
  userEmail: "",
  userPhone: "",
  userHrEmployeeCategory: "",
  userHrOccupationName: "",
};

const initialDelivery: DeliveryFormData = {
  deliverySameAsUser: false,
  deliveryName: "",
  deliveryEmployeeNumber: "",
  deliveryCompanyName: "",
  deliveryDepartment: "",
  deliveryArea: "",
  deliveryPostalCode: "",
  deliveryAddress: "",
  deliveryBuilding: "",
  deliveryEmail: "",
  deliveryPhone: "",
};

const initialReason: ReasonFormData = {
  requestReason: "",
  applicationCorrelationId: "",
  decisionContractType: "",
  decisionWorkContent: "",
  decisionClientEnv: "",
  msOfficeEdition: "",
  lendingStartDate: "",
  expectedReturnDate: "",
  requestDetail: "",
  smartphoneCameraPresence: "",
  smartphoneUserIdentification: "",
  smartphoneWorkplaceUse: "",
  peripheralMonitorSize: "",
  peripheralMonitorSizeCustom: "",
  peripheralLanCableLength: "",
  peripheralLanCableLengthCustom: "",
};

const textFieldRowSx = { ".MuiInputBase-root": { height: 46 } };

/** フォーム行共通：ラベル幅固定＋入力列を flex で氏名欄と同じ左端に揃える */
const formRowLabelSx = { width: 170, flexShrink: 0, fontSize: 18 } as const;
const formRowFieldCellSx = { flex: 1, minWidth: 0 } as const;

dayjs.locale("ja");

function isWeekday(date: Dayjs): boolean {
  const d = date.day();
  return d >= 1 && d <= 5;
}

async function parseApiJson(response: Response): Promise<{
  id?: string;
  applicationCorrelationId?: string;
  salesforcePayloadsByLine?: unknown;
  error?: string;
}> {
  const text = await response.text();
  if (!text.trim()) {
    return {
      error:
        response.status >= 500
          ? "サーバーから空の応答がありました（HTTP 500）。開発サーバーを一度停止し、`npx prisma migrate deploy` と `npx prisma generate` の後に `npm run dev` を再開し、ターミナルのエラーログを確認してください。"
          : `通信に失敗しました（HTTP ${response.status}）。`,
    };
  }
  try {
    return JSON.parse(text) as {
      id?: string;
      applicationCorrelationId?: string;
      salesforcePayloadsByLine?: unknown;
      error?: string;
    };
  } catch {
    return {
      error: `サーバー応答を解釈できませんでした: ${text.slice(0, 240)}`,
    };
  }
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 0.5, alignItems: "flex-start" }}>
      <Typography sx={{ width: 170, flexShrink: 0, color: "#555", fontSize: 16 }}>{label}</Typography>
      <Typography sx={{ fontSize: 16, whiteSpace: "pre-wrap", flex: 1 }}>{value.trim() ? value : "—"}</Typography>
    </Box>
  );
}

const pcInitialTableThSx = {
  fontWeight: 600,
  border: "1px solid #e0e0e0",
  bgcolor: "#f5f5f5",
  width: "58%",
} as const;
const pcInitialTableTdSx = { border: "1px solid #e0e0e0", fontSize: 18 } as const;

function PcInitialSettingsTitle() {
  return (
    <Typography sx={{ fontWeight: 600, mb: 0.5 }} component="div">
      PC初期設定
      <Box component="span" sx={{ fontWeight: 400, fontSize: 16 }}>
        （
        <Link
          href="/pc-spec-flow"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: "inherit", fontWeight: 600 }}
        >
          判定フローはこちら
        </Link>
        ）
      </Box>
    </Typography>
  );
}

function PcInitialSettingsTable({
  userInstall,
  network,
  licenseApply,
}: {
  userInstall: string;
  network: string;
  licenseApply: string;
}) {
  return (
    <TableContainer component={Box} sx={{ mt: 1 }}>
      <Table size="small" sx={{ borderCollapse: "collapse" }}>
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              ユーザーによるソフトウェアのインストール
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{userInstall}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              テクノプロネットワークへの接続
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{network}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              テクノプロ保有ライセンスの適用
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{licenseApply}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

type ThdLocationDept = {
  departmentCode: string;
  departmentName: string | null;
  deliverySite: string | null;
  area: string | null;
  postalCode: string | null;
  address: string | null;
  buildingName: string | null;
};

const DELIVERY_DETAIL_FIELDS: Array<{ key: keyof DeliveryFormData; label: string }> = [
  { key: "deliveryCompanyName", label: "会社名" },
  { key: "deliveryDepartment", label: "部署名" },
  { key: "deliveryArea", label: "エリア" },
  { key: "deliveryPostalCode", label: "郵便番号" },
  { key: "deliveryAddress", label: "住所" },
  { key: "deliveryBuilding", label: "ビル名" },
  { key: "deliveryEmail", label: "Eメール" },
  { key: "deliveryPhone", label: "電話番号" },
];

function DeliveryStep({
  brandColor,
  deliveryData,
  setDeliveryData,
  userData,
  userRetired,
  deliveryRecipientRetired,
  setDeliveryRecipientRetired,
  message,
  onBack,
  onNext,
  formRowLabelSx,
  formRowFieldCellSx,
  textFieldRowSx,
}: {
  brandColor: string;
  deliveryData: DeliveryFormData;
  setDeliveryData: React.Dispatch<React.SetStateAction<DeliveryFormData>>;
  userData: UserFormData;
  userRetired: boolean;
  deliveryRecipientRetired: boolean;
  setDeliveryRecipientRetired: (v: boolean) => void;
  message: { type: "success" | "error"; text: string } | null;
  onBack: () => void;
  onNext: (e: FormEvent<HTMLFormElement>) => void;
  formRowLabelSx: Record<string, unknown>;
  formRowFieldCellSx: Record<string, unknown>;
  textFieldRowSx: Record<string, unknown>;
}) {
  const [delCandidates, setDelCandidates] = useState<EmployeeOption[]>([]);
  const [delSearchLoading, setDelSearchLoading] = useState(false);
  const [selectedDelEmployeeId, setSelectedDelEmployeeId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [revealDelEmployeeField, setRevealDelEmployeeField] = useState(
    () => !deliveryData.deliverySameAsUser && deliveryData.deliveryName.trim().length > 0,
  );
  const [revealDelDetailFields, setRevealDelDetailFields] = useState(
    () =>
      !deliveryData.deliverySameAsUser &&
      deliveryData.deliveryEmployeeNumber.trim().length > 0,
  );

  const deliveryRetiredNotice =
    (deliveryData.deliverySameAsUser && userRetired) ||
    (!deliveryData.deliverySameAsUser && deliveryRecipientRetired);

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) {
      setDeliveryRecipientRetired(userRetired);
    }
  }, [deliveryData.deliverySameAsUser, userRetired, setDeliveryRecipientRetired]);

  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [deptOptions, setDeptOptions] = useState<ThdLocationDept[]>([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDeptCode, setSelectedDeptCode] = useState("");

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    fetch("/api/master/locations?listAreas=true")
      .then((r) => r.json())
      .then((d: { areas?: string[] }) => setAreaOptions(d.areas ?? []))
      .catch(() => {});
  }, [deliveryData.deliverySameAsUser]);

  useEffect(() => {
    if (!selectedArea) { setCompanyOptions([]); return; }
    fetch(`/api/master/locations?listCompanies=true&area=${encodeURIComponent(selectedArea)}`)
      .then((r) => r.json())
      .then((d: { companies?: string[] }) => setCompanyOptions(d.companies ?? []))
      .catch(() => {});
  }, [selectedArea]);

  useEffect(() => {
    if (!selectedArea) { setDeptOptions([]); return; }
    const params = new URLSearchParams({ listDepartments: "true", area: selectedArea });
    if (selectedCompany) params.set("companyName", selectedCompany);
    fetch(`/api/master/locations?${params}`)
      .then((r) => r.json())
      .then((d: { departments?: ThdLocationDept[] }) => setDeptOptions(d.departments ?? []))
      .catch(() => {});
  }, [selectedArea, selectedCompany]);

  const handleDelNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
    if (!hasValue) {
      setDeliveryRecipientRetired(false);
    }
    setRevealDelEmployeeField(hasValue);
    setRevealDelDetailFields(false);
    setSelectedDelEmployeeId(null);
    setSelectedArea("");
    setSelectedCompany("");
    setSelectedDeptCode("");
    setDeliveryData((prev) => ({
      ...prev,
      deliveryName: value,
      deliveryEmployeeNumber: "",
      deliveryCompanyName: "",
      deliveryDepartment: "",
      deliveryArea: "",
      deliveryPostalCode: "",
      deliveryAddress: "",
      deliveryBuilding: "",
      deliveryEmail: "",
      deliveryPhone: "",
    }));
  };

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;

    if (selectedDelEmployeeId) {
      setDelCandidates([]);
      return;
    }

    const q = normalizeEmployeeSearchInput(deliveryData.deliveryName);
    const ac = new AbortController();
    if (q.length < 1) {
      setDelCandidates([]);
      setDelSearchLoading(false);
      return () => {
        ac.abort();
      };
    }
    setDelSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        setDelCandidates(res.ok ? (data.employees ?? []) : []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setDelSearchLoading(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(t);
      ac.abort();
      setDelSearchLoading(false);
    };
  }, [deliveryData.deliveryName, deliveryData.deliverySameAsUser, selectedDelEmployeeId]);

  const applyDelFromEmployee = useCallback(
    async (emp: EmployeeOption) => {
      setDeliveryRecipientRetired(emp.retired);
      setSelectedDelEmployeeId(emp.id);
      setRevealDelEmployeeField(true);
      setRevealDelDetailFields(true);
      setDelCandidates([]);
      setAddressLoading(true);

      const searchPatch = deliveryPatchFromEmployeeSearch({
        companyName: emp.companyName,
        departmentName: emp.departmentName,
        departmentCode: emp.departmentCode,
        address: emp.address,
        deliveryArea: emp.deliveryArea,
        deliveryPostalCode: emp.deliveryPostalCode,
        deliveryAddressLine: emp.deliveryAddressLine,
        deliveryBuilding: emp.deliveryBuilding,
      });
      setDeliveryData((prev) => ({
        ...prev,
        deliveryName: emp.fullName,
        deliveryEmployeeNumber: emp.employeeNumber,
        deliveryEmail: emp.email ?? "",
        deliveryPhone: emp.phone ?? "",
        ...searchPatch,
      }));

      try {
        const patch = await fetchDeliveryAddressPatch({
          departmentCode: emp.departmentCode,
          companyName: emp.companyName,
          departmentName: emp.departmentName,
          address: emp.address,
          deliveryArea: emp.deliveryArea,
          deliveryPostalCode: emp.deliveryPostalCode,
          deliveryAddressLine: emp.deliveryAddressLine,
          deliveryBuilding: emp.deliveryBuilding,
        });
        setDeliveryData((prev) => ({ ...prev, ...patch }));

        const deptCode = normalizeDepartmentCode(emp.departmentCode);
        if (deptCode) {
          setSelectedDeptCode(deptCode);
          setSelectedCompany(patch.deliveryCompanyName ?? emp.companyName);
          const area = patch.deliveryArea?.trim() ?? "";
          setSelectedArea(area);
          if (area) {
            const res = await fetch(
              `/api/master/locations?departmentCode=${encodeURIComponent(deptCode)}&withCascade=true`,
            );
            if (res.ok) {
              const d = (await res.json()) as {
                companies?: string[];
                departments?: ThdLocationDept[];
              };
              if (d.companies) setCompanyOptions(d.companies);
              if (d.departments) setDeptOptions(d.departments);
            }
          }
        }
      } finally {
        setAddressLoading(false);
      }
    },
    [setDeliveryRecipientRetired, setDeliveryData],
  );

  /** 下書き・プリフィルで社員番号のみ入っている場合、マスタ行を再確定する */
  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    if (selectedDelEmployeeId) return;
    const num = deliveryData.deliveryEmployeeNumber.trim();
    if (!num || delCandidates.length < 1) return;
    const match = delCandidates.find((c) => c.employeeNumber.trim() === num);
    if (match) {
      void applyDelFromEmployee(match);
    }
  }, [
    deliveryData.deliverySameAsUser,
    deliveryData.deliveryEmployeeNumber,
    selectedDelEmployeeId,
    delCandidates,
    applyDelFromEmployee,
  ]);

  const showDelEmployeeField =
    revealDelEmployeeField && deliveryData.deliveryName.trim().length > 0;
  const showDelDetailFields =
    revealDelDetailFields && deliveryData.deliveryEmployeeNumber.trim().length > 0;

  const deliveryNextDisabled = useMemo(() => {
    if (deliveryRetiredNotice) return true;
    if (deliveryData.deliverySameAsUser) {
      if (!userData.userEmployeeNumber.trim()) return true;
      if (!deliveryData.deliveryAddress.trim()) return true;
      return false;
    }
    if (delSearchLoading || addressLoading) return true;
    if (!deliveryData.deliveryName.trim()) return true;
    if (!deliveryData.deliveryEmployeeNumber.trim() || !selectedDelEmployeeId) return true;
    if (!deliveryData.deliveryAddress.trim()) return true;
    return false;
  }, [
    deliveryRetiredNotice,
    deliveryData.deliverySameAsUser,
    deliveryData.deliveryName,
    deliveryData.deliveryEmployeeNumber,
    deliveryData.deliveryAddress,
    userData.userEmployeeNumber,
    delSearchLoading,
    addressLoading,
    selectedDelEmployeeId,
  ]);

  const applyLocationFromDept = (dept: ThdLocationDept) => {
    setDeliveryData((prev) => ({ ...prev, ...patchFromThdLocationRow(dept) }));
  };

  return (
    <>
      <Box>
        <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
          Q. 送付先情報を入力してください
        </Typography>
      </Box>
      <Box component="form" onSubmit={onNext} sx={{ width: "90%", margin: "0 auto" }}>
        <Stack spacing={2.2}>
          {deliveryRetiredNotice && (
            <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              {EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE}
            </Alert>
          )}
          <FormControlLabel
            sx={{ ml: 0, ".MuiFormControlLabel-label": { fontSize: 16 } }}
            control={
              <Checkbox
                checked={deliveryData.deliverySameAsUser}
                onChange={(_, checked) => {
                  if (checked) {
                    setDeliveryRecipientRetired(userRetired);
                    setSelectedDelEmployeeId(null);
                    setRevealDelEmployeeField(false);
                    setRevealDelDetailFields(false);
                    setDelCandidates([]);
                    setDeliveryData({
                      deliverySameAsUser: true,
                      deliveryName: userData.userName,
                      deliveryEmployeeNumber: userData.userEmployeeNumber,
                      deliveryCompanyName: userData.userCompanyName,
                      deliveryDepartment: userData.userDepartmentName,
                      deliveryArea: "",
                      deliveryPostalCode: "",
                      deliveryAddress: userData.userAddress,
                      deliveryBuilding: "",
                      deliveryEmail: userData.userEmail,
                      deliveryPhone: userData.userPhone,
                    });
                  } else {
                    setDeliveryRecipientRetired(false);
                    setSelectedDelEmployeeId(null);
                    setRevealDelEmployeeField(false);
                    setRevealDelDetailFields(false);
                    setDelCandidates([]);
                    setDeliveryData({
                      deliverySameAsUser: false,
                      deliveryName: "",
                      deliveryEmployeeNumber: "",
                      deliveryCompanyName: "",
                      deliveryDepartment: "",
                      deliveryArea: "",
                      deliveryPostalCode: "",
                      deliveryAddress: "",
                      deliveryBuilding: "",
                      deliveryEmail: "",
                      deliveryPhone: "",
                    });
                  }
                }}
                sx={{ mr: 1, color: "#bdbdbd", "&.Mui-checked": { color: "#007D9E" } }}
              />
            }
            label="利用者と同じ"
          />
          {deliveryData.deliverySameAsUser && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontWeight: 600, fontSize: 15, color: "#007D9E" }}>
                送付先住所（利用者と同じ・編集可）
              </Typography>
              {addressLoading && (
                <Typography sx={{ fontSize: 14, color: "#666" }}>住所をマスタから取得しています…</Typography>
              )}
              {DELIVERY_DETAIL_FIELDS.map(({ key, label }) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={formRowLabelSx}>{label}</Typography>
                  <Box sx={formRowFieldCellSx}>
                    <TextField
                      value={deliveryData[key] as string}
                      onChange={(e) =>
                        setDeliveryData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      fullWidth
                      size="small"
                      required={key === "deliveryAddress"}
                      type={key === "deliveryEmail" ? "email" : key === "deliveryPhone" ? "tel" : "text"}
                      sx={textFieldRowSx}
                    />
                  </Box>
                </Box>
              ))}
            </>
          )}
          {!deliveryData.deliverySameAsUser && (
            <>
              {/* 氏名検索 */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={formRowLabelSx}>送付先氏名</Typography>
                <Box sx={{ ...formRowFieldCellSx, position: "relative" }}>
                  <TextField
                    value={deliveryData.deliveryName}
                    onChange={(e) => handleDelNameInput(e.target.value)}
                    placeholder="氏名の一部で検索（マスタから索引）"
                    required
                    fullWidth
                    size="small"
                    sx={textFieldRowSx}
                  />
                  {delSearchLoading && (
                    <CircularProgress size={22} sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }} />
                  )}
                </Box>
              </Box>

              {showDelEmployeeField &&
                delCandidates.length >= 1 &&
                !selectedDelEmployeeId && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>社員番号（選択）</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={selectedDelEmployeeId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          const emp = delCandidates.find((c) => c.id === id);
                          if (emp) void applyDelFromEmployee(emp);
                        }}
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          社員番号を選択してください
                        </MenuItem>
                        {delCandidates.map((emp) => (
                          <MenuItem key={emp.id} value={emp.id}>
                            {emp.employeeNumber}　{emp.fullName}（{emp.companyName}・
                            {emp.departmentName}）
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                )}
              {showDelEmployeeField && selectedDelEmployeeId && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={formRowLabelSx}>社員番号</Typography>
                  <Box sx={formRowFieldCellSx}>
                    <TextField
                      value={deliveryData.deliveryEmployeeNumber}
                      required
                      fullWidth
                      size="small"
                      sx={textFieldRowSx}
                      slotProps={{ htmlInput: { readOnly: true } }}
                    />
                  </Box>
                </Box>
              )}
              {showDelEmployeeField &&
                !delSearchLoading &&
                delCandidates.length === 0 &&
                !selectedDelEmployeeId && (
                  <Typography sx={{ pl: "186px", fontSize: 14, color: "#d32f2f" }}>
                    該当する社員が見つかりません。マスタに登録された送付先のみ申請できます。
                  </Typography>
                )}

              {showDelDetailFields && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography sx={{ fontWeight: 600, fontSize: 15, color: "#007D9E" }}>
                    送付先住所・連絡先
                  </Typography>
                  {addressLoading && (
                    <Typography sx={{ fontSize: 14, color: "#666" }}>
                      マスタから住所を取得しています…
                    </Typography>
                  )}
                  {selectedDelEmployeeId && areaOptions.length > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>拠点（エリア）</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          select
                          value={selectedArea}
                          onChange={(e) => {
                            setSelectedArea(e.target.value);
                            setSelectedCompany("");
                            setSelectedDeptCode("");
                            setDeliveryData((prev) => ({ ...prev, deliveryArea: e.target.value }));
                          }}
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        >
                          <MenuItem value="">指定なし（下の欄で直接入力）</MenuItem>
                          {selectedArea && !areaOptions.includes(selectedArea) && (
                            <MenuItem value={selectedArea}>{selectedArea}</MenuItem>
                          )}
                          {areaOptions.map((a) => (
                            <MenuItem key={a} value={a}>
                              {a}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Box>
                  )}
                  {selectedDelEmployeeId && selectedArea && deptOptions.length > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>拠点（部署）</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          select
                          value={selectedDeptCode}
                          onChange={(e) => {
                            setSelectedDeptCode(e.target.value);
                            const dept = deptOptions.find((d) => d.departmentCode === e.target.value);
                            if (dept) applyLocationFromDept(dept);
                          }}
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        >
                          <MenuItem value="">選択してください</MenuItem>
                          {deptOptions.map((d) => (
                            <MenuItem key={d.departmentCode} value={d.departmentCode}>
                              {d.departmentName}（{d.deliverySite ?? ""}）
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Box>
                  )}
                  {DELIVERY_DETAIL_FIELDS.map(({ key, label }) => (
                    <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>{label}</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          value={deliveryData[key] as string}
                          onChange={(e) =>
                            setDeliveryData((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          fullWidth
                          size="small"
                          required={key === "deliveryAddress"}
                          type={
                            key === "deliveryEmail"
                              ? "email"
                              : key === "deliveryPhone"
                                ? "tel"
                                : "text"
                          }
                          sx={textFieldRowSx}
                        />
                      </Box>
                    </Box>
                  ))}
                </>
              )}
            </>
          )}
          {message && <Alert severity={message.type}>{message.text}</Alert>}
          {!deliveryData.deliverySameAsUser && (
            <Typography sx={{ textAlign: "center", color: "#666", fontSize: 12, pt: 1 }}>
              送付先氏名でマスタ検索し、社員番号を選択すると住所が自動入力されます。該当者がいない場合は「次へ」に進めません。
            </Typography>
          )}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 1 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onBack}
              sx={{ borderRadius: 999, width: 180, height: 46, fontSize: 18, borderColor: "#c9c9c9", color: "#333" }}
            >
              戻る
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={deliveryNextDisabled}
              sx={{ width: 180, height: 46, borderRadius: 999, backgroundColor: brandColor, fontSize: 18, "&:hover": { backgroundColor: "#006c88" } }}
            >
              次へ
            </Button>
          </Box>
        </Stack>
      </Box>
    </>
  );
}

export default function Home() {
  const brandColor = "#007D9E";
  const [step, setStep] = useState<
    "notice" | "applicant" | "user" | "equipment" | "delivery" | "reason" | "confirm"
  >("notice");
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const [applicantData, setApplicantData] = useState<ApplicantFormData>(initialApplicant);
  const [userData, setUserData] = useState<UserFormData>(initialUser);
  const [deliveryData, setDeliveryData] = useState<DeliveryFormData>(initialDelivery);
  const [reasonData, setReasonData] = useState<ReasonFormData>(initialReason);
  const [lendingLines, setLendingLines] = useState<LendingEquipmentLine[]>(() => [
    newLendingEquipmentLine(),
  ]);
  const prevIncludesPcRef = useRef(false);
  const staffAutoKeyFromUserHrRef = useRef("");
  const [applicantCandidates, setApplicantCandidates] = useState<EmployeeOption[]>([]);
  const [selectedApplicantEmployeeId, setSelectedApplicantEmployeeId] = useState<string | null>(
    null,
  );
  const [applicantSearchLoading, setApplicantSearchLoading] = useState(false);
  const [userCandidates, setUserCandidates] = useState<EmployeeOption[]>([]);
  const [selectedUserEmployeeId, setSelectedUserEmployeeId] = useState<string | null>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [applicantRetired, setApplicantRetired] = useState(false);
  const [userRetired, setUserRetired] = useState(false);
  const [deliveryRecipientRetired, setDeliveryRecipientRetired] = useState(false);
  const [revealApplicantEmployeeField, setRevealApplicantEmployeeField] = useState(false);
  const [revealApplicantDetailFields, setRevealApplicantDetailFields] = useState(false);
  const [revealUserEmployeeField, setRevealUserEmployeeField] = useState(false);
  const [revealUserDetailFields, setRevealUserDetailFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const derivedUserStaffCategory = useMemo(
    () => deriveUserStaffCategoryFromHr(userData.userHrEmployeeCategory, userData.userHrOccupationName),
    [userData.userHrEmployeeCategory, userData.userHrOccupationName],
  );

  const { labelsByCategory, error: formOptionsError } =
    useApplicationSelectOptions(LENDING_PAGE_FORM_OPTION_CATEGORIES);
  const { labels: employmentTypeLabels, error: employmentTypesError } = useEmploymentTypeLabels();

  const pickOptions = useCallback(
    (cat: ApplicationSelectCategory, fallback: readonly string[]): string[] => {
      const list = labelsByCategory[cat];
      return list && list.length > 0 ? list : [...fallback];
    },
    [labelsByCategory],
  );

  const lendingRequestReasonOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.lendingRequestReason, STATIC_LENDING_REQUEST_REASON_OPTIONS),
    [pickOptions],
  );
  const lendingEquipmentTypeOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.lendingEquipmentType, LENDING_EQUIPMENT_TYPE_OPTIONS),
    [pickOptions],
  );
  const userStaffCategoryOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.userStaffCategory, [STAFF_MANAGEMENT, STAFF_TECHNICAL]),
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
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.decisionClientEnv, [DECISION_CLIENT_YES, DECISION_CLIENT_NO]),
    [pickOptions],
  );
  const smartphoneCameraOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.smartphoneCamera, ["カメラあり", "カメラなし"]),
    [pickOptions],
  );
  const smartphoneUserIdentificationOptions = useMemo(
    () =>
      pickOptions(APPLICATION_SELECT_CATEGORIES.smartphoneUserIdentification, ["特定する", "特定しない"]),
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
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength, LAN_CABLE_LENGTH_OPTIONS),
    [pickOptions],
  );

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft) as DraftPayload | ApplicantFormData;
      if ("applicant" in parsed && "user" in parsed) {
        const a = parsed.applicant as Partial<ApplicantFormData>;
        setApplicantData({
          applicantName: a.applicantName ?? "",
          employeeNumber: a.employeeNumber ?? "",
          companyName: a.companyName ?? "",
          departmentName: a.departmentName ?? "",
          address: a.address ?? "",
          applicantJobTitle: a.applicantJobTitle ?? "",
          applicantEmail: a.applicantEmail ?? "",
          applicantPhone: a.applicantPhone ?? "",
        });
        const u = parsed.user as Partial<UserFormData>;
        const reasonDraft =
          "reason" in parsed && parsed.reason
            ? (parsed.reason as ReasonFormData & { userStaffCategory?: string })
            : null;
        const legacyStaffFromReason =
          typeof reasonDraft?.userStaffCategory === "string" ? reasonDraft.userStaffCategory : "";
        setUserData({
          userName: u.userName ?? "",
          userEmployeeNumber: u.userEmployeeNumber ?? "",
          userCompanyName: u.userCompanyName ?? "",
          userDepartmentName: u.userDepartmentName ?? "",
          userAddress: u.userAddress ?? "",
          userContractType: u.userContractType ?? "",
          userStaffCategory:
            ((u as UserFormData).userStaffCategory ?? "").trim() ||
            legacyStaffFromReason.trim() ||
            "",
          userCostDeptName: u.userCostDeptName ?? "",
          userCostDeptCode: u.userCostDeptCode ?? "",
          userEmail: u.userEmail ?? "",
          userPhone: u.userPhone ?? "",
          userHrEmployeeCategory: (u as UserFormData).userHrEmployeeCategory ?? "",
          userHrOccupationName: (u as UserFormData).userHrOccupationName ?? "",
        });
        if (parsed.delivery) {
          const d = parsed.delivery as Partial<DeliveryFormData>;
          setDeliveryData({
            deliverySameAsUser: d.deliverySameAsUser ?? false,
            deliveryName: d.deliveryName ?? "",
            deliveryEmployeeNumber: d.deliveryEmployeeNumber ?? "",
            deliveryCompanyName: d.deliveryCompanyName ?? "",
            deliveryDepartment: d.deliveryDepartment ?? "",
            deliveryArea: d.deliveryArea ?? "",
            deliveryPostalCode: d.deliveryPostalCode ?? "",
            deliveryAddress: d.deliveryAddress ?? "",
            deliveryBuilding: d.deliveryBuilding ?? "",
            deliveryEmail: d.deliveryEmail ?? "",
            deliveryPhone: d.deliveryPhone ?? "",
          });
        }
        if (Array.isArray(parsed.lendingLines) && parsed.lendingLines.length > 0) {
          setLendingLines(
            parsed.lendingLines.map((row) => ({
              id:
                typeof row.id === "string" && row.id
                  ? row.id
                  : newLendingEquipmentLine().id,
              equipmentType:
                typeof row.equipmentType === "string" ? row.equipmentType : "",
            })),
          );
        }
        if (reasonDraft) {
          const r = reasonDraft as ReasonFormData & Record<string, unknown>;
          setReasonData({
            requestReason: r.requestReason ?? "",
            applicationCorrelationId: (r as ReasonFormData).applicationCorrelationId ?? "",
            decisionContractType: (r.decisionContractType as string) ?? "",
            decisionWorkContent: (r.decisionWorkContent as string) ?? "",
            decisionClientEnv: (r.decisionClientEnv as string) ?? "",
            msOfficeEdition: (r.msOfficeEdition as string) ?? "",
            lendingStartDate: (r.lendingStartDate as string) ?? "",
            expectedReturnDate: (r.expectedReturnDate as string) ?? "",
            requestDetail: r.requestDetail ?? "",
            smartphoneCameraPresence: (r.smartphoneCameraPresence as string) ?? "",
            smartphoneUserIdentification: (r.smartphoneUserIdentification as string) ?? "",
            smartphoneWorkplaceUse: (r.smartphoneWorkplaceUse as string) ?? "",
            peripheralMonitorSize: (r.peripheralMonitorSize as string) ?? "",
            peripheralMonitorSizeCustom: (r.peripheralMonitorSizeCustom as string) ?? "",
            peripheralLanCableLength: (r.peripheralLanCableLength as string) ?? "",
            peripheralLanCableLengthCustom: (r.peripheralLanCableLengthCustom as string) ?? "",
          });
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const payload: DraftPayload = {
      applicant: applicantData,
      user: userData,
      delivery: deliveryData,
      lendingLines,
      reason: reasonData,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [applicantData, userData, deliveryData, lendingLines, reasonData]);

  /** 送付先「利用者と同じ」時、利用者の所属・住所を同期し、拠点マスタで郵便番号・住所を補完する */
  useEffect(() => {
    if (!deliveryData.deliverySameAsUser) return;

    setDeliveryData((prev) => {
      if (!prev.deliverySameAsUser) return prev;
      return {
        ...prev,
        deliveryName: userData.userName,
        deliveryEmployeeNumber: userData.userEmployeeNumber,
        deliveryCompanyName: userData.userCompanyName,
        deliveryDepartment: userData.userDepartmentName,
        deliveryAddress: userData.userAddress || prev.deliveryAddress,
        deliveryEmail: userData.userEmail,
        deliveryPhone: userData.userPhone,
      };
    });

    const deptCode = normalizeDepartmentCode(userData.userCostDeptCode);
    if (!deptCode) return;

    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/master/locations?departmentCode=${encodeURIComponent(deptCode)}`,
          { signal: ac.signal },
        );
        if (!res.ok) return;
        const d = (await res.json()) as { location?: ThdLocationDept | null };
        if (ac.signal.aborted || !d.location) return;
        setDeliveryData((prev) => {
          if (!prev.deliverySameAsUser) return prev;
          return {
            ...prev,
            ...patchFromThdLocationRow(d.location!, {
              companyName: userData.userCompanyName,
              departmentName: userData.userDepartmentName,
            }),
          };
        });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    })();

    return () => ac.abort();
  }, [
    deliveryData.deliverySameAsUser,
    userData.userCostDeptCode,
    userData.userName,
    userData.userCompanyName,
    userData.userDepartmentName,
    userData.userAddress,
    userData.userEmail,
    userData.userPhone,
  ]);

  useEffect(() => {
    if (step !== "reason") return;
    setReasonData((prev) => {
      if (prev.applicationCorrelationId.trim()) return prev;
      return { ...prev, applicationCorrelationId: newApplicationCorrelationId() };
    });
  }, [step]);

  const decisionResolution = useMemo(
    () =>
      resolvePcSpecDecision(
        userData.userStaffCategory,
        reasonData.decisionContractType,
        reasonData.decisionWorkContent,
        reasonData.decisionClientEnv,
        reasonData.msOfficeEdition,
      ),
    [
      userData.userStaffCategory,
      reasonData.decisionContractType,
      reasonData.decisionWorkContent,
      reasonData.decisionClientEnv,
      reasonData.msOfficeEdition,
    ],
  );

  const derivedLicense = useMemo(
    () => decisionResolutionToLicenseFields(decisionResolution),
    [decisionResolution],
  );

  const technicalSpecCode =
    decisionResolution.kind === "spec" ? decisionResolution.code : null;

  const minSelectableDate = useMemo(() => dayjs().startOf("day").add(7, "day"), []);

  const returnMinSelectableDate = useMemo(() => {
    if (!reasonData.lendingStartDate.trim()) return minSelectableDate;
    const lendingStart = dayjs(reasonData.lendingStartDate).startOf("day");
    if (!lendingStart.isValid()) return minSelectableDate;
    return lendingStart.isAfter(minSelectableDate) ? lendingStart : minSelectableDate;
  }, [reasonData.lendingStartDate, minSelectableDate]);

  const isSelectableBusinessDate = useCallback(
    (value: Dayjs | null | undefined): boolean => {
      if (!value || !value.isValid()) return false;
      const date = value.startOf("day");
      return !date.isBefore(minSelectableDate) && isWeekday(date);
    },
    [minSelectableDate],
  );

  const lendingDatesOk = useMemo(() => {
    const s = reasonData.lendingStartDate.trim();
    const e = reasonData.expectedReturnDate.trim();
    if (!s || !e) return false;
    const lendingStart = parseIsoDateOnly(s);
    const expectedReturn = parseIsoDateOnly(e);
    if (!lendingStart || !expectedReturn) return false;
    const lendingStartDayjs = dayjs(lendingStart).startOf("day");
    const expectedReturnDayjs = dayjs(expectedReturn).startOf("day");
    if (!isSelectableBusinessDate(lendingStartDayjs)) return false;
    if (!isSelectableBusinessDate(expectedReturnDayjs)) return false;
    return compareIsoDateOnly(e, s) >= 0;
  }, [reasonData.lendingStartDate, reasonData.expectedReturnDate, isSelectableBusinessDate]);

  const includesPc = useMemo(() => lendingLinesIncludePc(lendingLines), [lendingLines]);
  const includesCommunication = useMemo(
    () => lendingLinesIncludeCommunication(lendingLines),
    [lendingLines],
  );
  const includesSmartphone = useMemo(
    () => lendingLinesIncludeSmartphone(lendingLines),
    [lendingLines],
  );
  const includesPeripheral = useMemo(
    () => lendingLinesIncludePeripheral(lendingLines),
    [lendingLines],
  );
  const includesWifiRouter = useMemo(
    () => lendingLinesIncludeWifiRouter(lendingLines),
    [lendingLines],
  );
  const includesMonitor = useMemo(
    () => lendingLinesIncludeEquipment(lendingLines, "モニター"),
    [lendingLines],
  );
  const includesLanCable = useMemo(
    () => lendingLinesIncludeEquipment(lendingLines, "LANケーブル"),
    [lendingLines],
  );
  const includesMouse = useMemo(
    () => lendingLinesIncludeEquipment(lendingLines, "マウス"),
    [lendingLines],
  );
  const includesHeadset = useMemo(
    () => lendingLinesIncludeEquipment(lendingLines, "ヘッドセット"),
    [lendingLines],
  );

  const msOfficeMenuOptions = useMemo((): string[] => {
    if (!includesPc) return [];
    const standardPool = pickOptions(
      APPLICATION_SELECT_CATEGORIES.msOfficeEdition,
      MS_OFFICE_EDITION_STANDARD_OPTIONS,
    );
    const cat = userData.userStaffCategory;
    if (cat === STAFF_MANAGEMENT) return [...standardPool];
    if (cat !== STAFF_TECHNICAL) return [];
    const cl = reasonData.decisionClientEnv.trim();
    const c = reasonData.decisionContractType.trim();
    const w = reasonData.decisionWorkContent.trim();
    if (!cl) return [];
    if (cl === DECISION_CLIENT_NO) {
      return [...standardPool];
    }
    if (cl === DECISION_CLIENT_YES) {
      if (c === DECISION_CONTRACT_QUASI && w === DECISION_WORK_DEVELOPMENT) {
        return [...standardPool, MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED];
      }
      if (c === DECISION_CONTRACT_DISPATCH && w === DECISION_WORK_DEVELOPMENT) {
        return [...standardPool];
      }
      return [];
    }
    return [];
  }, [
    includesPc,
    pickOptions,
    userData.userStaffCategory,
    reasonData.decisionContractType,
    reasonData.decisionWorkContent,
    reasonData.decisionClientEnv,
  ]);

  useEffect(() => {
    if (!includesPc) return;
    const ms = reasonData.msOfficeEdition.trim();
    if (!ms) return;
    if (
      !isMsOfficeEditionAllowedForPcDecision(
        userData.userStaffCategory,
        reasonData.decisionContractType,
        reasonData.decisionWorkContent,
        reasonData.decisionClientEnv,
        ms,
      )
    ) {
      setReasonData((prev) => ({ ...prev, msOfficeEdition: "" }));
    }
  }, [
    includesPc,
    userData.userStaffCategory,
    reasonData.decisionContractType,
    reasonData.decisionWorkContent,
    reasonData.decisionClientEnv,
    reasonData.msOfficeEdition,
  ]);

  useEffect(() => {
    if (!includesPc) return;
    const empNo = userData.userEmployeeNumber.trim();
    if (!empNo) return;
    const derived = derivedUserStaffCategory;
    if (!derived) return;
    const key = `${empNo}|${userData.userHrEmployeeCategory}|${userData.userHrOccupationName}|${derived}`;
    if (staffAutoKeyFromUserHrRef.current === key) return;
    staffAutoKeyFromUserHrRef.current = key;
    setUserData((prev) => ({ ...prev, userStaffCategory: derived }));
    if (derived === STAFF_MANAGEMENT) {
      setReasonData((prev) => ({
        ...prev,
        decisionContractType: "",
        decisionWorkContent: "",
        decisionClientEnv: "",
      }));
    }
  }, [
    includesPc,
    userData.userEmployeeNumber,
    userData.userHrEmployeeCategory,
    userData.userHrOccupationName,
    derivedUserStaffCategory,
  ]);

  const equipmentStepOk = useMemo(
    () => lendingLines.length > 0 && lendingLines.every((l) => l.equipmentType.trim() !== ""),
    [lendingLines],
  );

  const reasonStepCanProceed = useMemo(() => {
    if (!reasonData.requestReason.trim()) return false;
    if (!lendingDatesOk) return false;
    if (includesPc) {
      const staff = userData.userStaffCategory.trim();
      if (staff !== STAFF_MANAGEMENT && staff !== STAFF_TECHNICAL) return false;
      if (
        !reasonData.msOfficeEdition.trim() ||
        !isMsOfficeEditionAllowedForPcDecision(
          userData.userStaffCategory,
          reasonData.decisionContractType,
          reasonData.decisionWorkContent,
          reasonData.decisionClientEnv,
          reasonData.msOfficeEdition,
        )
      ) {
        return false;
      }
      if (!derivedLicense || decisionResolution.kind === "lending_denied") return false;
    }
    if (includesSmartphone) {
      if (
        !reasonData.smartphoneCameraPresence.trim() ||
        !reasonData.smartphoneUserIdentification.trim() ||
        !reasonData.smartphoneWorkplaceUse.trim()
      )
        return false;
    }
    if (includesMonitor) {
      if (!reasonData.peripheralMonitorSize.trim()) return false;
      if (
        reasonData.peripheralMonitorSize === "その他" &&
        !reasonData.peripheralMonitorSizeCustom.trim()
      )
        return false;
    }
    if (includesLanCable) {
      if (!reasonData.peripheralLanCableLength.trim()) return false;
      if (
        reasonData.peripheralLanCableLength === "その他" &&
        !reasonData.peripheralLanCableLengthCustom.trim()
      )
        return false;
    }
    return true;
  }, [
    reasonData.requestReason,
    lendingDatesOk,
    includesPc,
    userData.userStaffCategory,
    reasonData.msOfficeEdition,
    reasonData.decisionContractType,
    reasonData.decisionWorkContent,
    reasonData.decisionClientEnv,
    includesSmartphone,
    includesMonitor,
    includesLanCable,
    derivedLicense,
    decisionResolution.kind,
    reasonData.smartphoneCameraPresence,
    reasonData.smartphoneUserIdentification,
    reasonData.smartphoneWorkplaceUse,
    reasonData.peripheralMonitorSize,
    reasonData.peripheralMonitorSizeCustom,
    reasonData.peripheralLanCableLength,
    reasonData.peripheralLanCableLengthCustom,
  ]);

  useEffect(() => {
    if (prevIncludesPcRef.current && !includesPc) {
      staffAutoKeyFromUserHrRef.current = "";
      setUserData((prev) => ({ ...prev, userStaffCategory: "" }));
      setReasonData((prev) => ({
        ...prev,
        decisionContractType: "",
        decisionWorkContent: "",
        decisionClientEnv: "",
        msOfficeEdition: "",
      }));
    }
    prevIncludesPcRef.current = includesPc;
  }, [includesPc]);

  const showApplicantEmployeeField =
    revealApplicantEmployeeField && applicantData.applicantName.trim().length > 0;
  const showApplicantDetailFields =
    revealApplicantDetailFields && applicantData.employeeNumber.trim().length > 0;
  const showUserEmployeeField = revealUserEmployeeField && userData.userName.trim().length > 0;
  const showUserDetailFields = revealUserDetailFields && userData.userEmployeeNumber.trim().length > 0;

  const applyApplicantFromEmployee = useCallback((emp: EmployeeOption) => {
    setApplicantRetired(Boolean(emp.retired));
    setApplicantData({
      applicantName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      companyName: emp.companyName,
      departmentName: emp.departmentName,
      address: emp.address,
      applicantJobTitle: emp.jobTitle ?? "",
      applicantEmail: emp.email ?? "",
      applicantPhone: emp.phone ?? "",
    });
    setRevealApplicantEmployeeField(true);
    setRevealApplicantDetailFields(true);
    setSelectedApplicantEmployeeId(emp.id);
    setApplicantCandidates([]);
  }, []);

  const handleApplicantNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
    if (!hasValue) {
      setApplicantRetired(false);
    }
    setRevealApplicantEmployeeField(hasValue);
    if (!hasValue) {
      setRevealApplicantDetailFields(false);
    }
    setApplicantData((prev) => {
      if (selectedApplicantEmployeeId) {
        return {
          ...prev,
          applicantName: value,
          employeeNumber: "",
          companyName: "",
          departmentName: "",
          address: "",
          applicantJobTitle: "",
          applicantEmail: "",
          applicantPhone: "",
        };
      }
      return { ...prev, applicantName: value };
    });
    setSelectedApplicantEmployeeId(null);
  };

  useEffect(() => {
    if (step !== "applicant") return;

    if (selectedApplicantEmployeeId) {
      setApplicantCandidates([]);
      return;
    }

    const q = normalizeEmployeeSearchInput(applicantData.applicantName);
    const ac = new AbortController();

    if (q.length < 1) {
      setApplicantCandidates([]);
      setApplicantSearchLoading(false);
      return () => {
        ac.abort();
      };
    }

    setApplicantSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setApplicantCandidates([]);
          return;
        }
        setApplicantCandidates(data.employees ?? []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setApplicantSearchLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      ac.abort();
      setApplicantSearchLoading(false);
    };
  }, [applicantData.applicantName, step, selectedApplicantEmployeeId]);

  /** テンプレ／過去申請のプリフィル後、氏名が同姓同名で複数ヒットすると「社員番号（選択）」のみになり既存の社員番号が見えない。候補の番号と一致すればマスタ行を確定し、会社名・部署名なども流し込む。 */
  useEffect(() => {
    if (step !== "applicant") return;
    if (selectedApplicantEmployeeId) return;
    const num = applicantData.employeeNumber.trim();
    if (!num || applicantCandidates.length < 1) return;
    const match = applicantCandidates.find((c) => c.employeeNumber.trim() === num);
    if (match) {
      applyApplicantFromEmployee(match);
    }
  }, [
    step,
    selectedApplicantEmployeeId,
    applicantData.employeeNumber,
    applicantCandidates,
    applyApplicantFromEmployee,
  ]);

  /** 過去申請プリフィル等で氏名検索を経ない場合も、社員番号が確定していれば人事マスタの退職フラグを同期する */
  useEffect(() => {
    if (step !== "applicant") return;
    const num = applicantData.employeeNumber.trim();
    if (!num) {
      setApplicantRetired(false);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(num)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) return;
        const m = (data.employees ?? []).find((e) => e.employeeNumber.trim() === num);
        setApplicantRetired(m ? Boolean(m.retired) : false);
      } catch {
        /* ignore */
      }
    }, 350);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [step, applicantData.employeeNumber]);

  const applyUserFromEmployee = useCallback((emp: EmployeeOption) => {
    const suggested = deriveUserStaffCategoryFromHr(emp.employeeCategory, emp.occupationName) || "";
    setUserRetired(Boolean(emp.retired));
    setUserData({
      userName: emp.fullName,
      userEmployeeNumber: emp.employeeNumber,
      userCompanyName: emp.companyName,
      userDepartmentName: emp.departmentName,
      userAddress: emp.address,
      userContractType: emp.employmentType ?? "",
      userStaffCategory: suggested,
      userCostDeptName: emp.departmentName,
      userCostDeptCode: normalizeDepartmentCode(emp.departmentCode) ?? emp.departmentCode ?? "",
      userEmail: emp.email ?? "",
      userPhone: emp.phone ?? "",
      userHrEmployeeCategory: emp.employeeCategory ?? "",
      userHrOccupationName: emp.occupationName ?? "",
    });
    if (suggested === STAFF_MANAGEMENT) {
      setReasonData((prev) => ({
        ...prev,
        decisionContractType: "",
        decisionWorkContent: "",
        decisionClientEnv: "",
      }));
    }
    setRevealUserEmployeeField(true);
    setRevealUserDetailFields(true);
    setSelectedUserEmployeeId(emp.id);
    setUserCandidates([]);
  }, []);

  const handleUserNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
    if (!hasValue) {
      setUserRetired(false);
    }
    if (!hasValue || selectedUserEmployeeId) {
      staffAutoKeyFromUserHrRef.current = "";
    }
    setRevealUserEmployeeField(hasValue);
    if (!hasValue) {
      setRevealUserDetailFields(false);
    }
    setUserData((prev) => {
      if (selectedUserEmployeeId) {
        return {
          ...prev,
          userName: value,
          userEmployeeNumber: "",
          userCompanyName: "",
          userDepartmentName: "",
          userAddress: "",
          userContractType: "",
          userStaffCategory: "",
          userCostDeptName: "",
          userCostDeptCode: "",
          userEmail: "",
          userPhone: "",
          userHrEmployeeCategory: "",
          userHrOccupationName: "",
        };
      }
      return { ...prev, userName: value };
    });
    setSelectedUserEmployeeId(null);
  };

  useEffect(() => {
    if (step !== "user") return;

    const q = normalizeEmployeeSearchInput(userData.userName);
    const ac = new AbortController();

    if (q.length < 1) {
      setUserCandidates([]);
      setUserSearchLoading(false);
      return () => {
        ac.abort();
      };
    }

    setUserSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setUserCandidates([]);
          return;
        }
        setUserCandidates(data.employees ?? []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setUserSearchLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      ac.abort();
      setUserSearchLoading(false);
    };
  }, [userData.userName, step]);

  /** 利用者も同様（テンプレ取り込み時に社員番号が候補リストで隠れるのを防ぎ、マスタの所属情報を反映する） */
  useEffect(() => {
    if (step !== "user") return;
    if (selectedUserEmployeeId) return;
    const num = userData.userEmployeeNumber.trim();
    if (!num || userCandidates.length < 1) return;
    const match = userCandidates.find((c) => c.employeeNumber.trim() === num);
    if (match) {
      applyUserFromEmployee(match);
    }
  }, [step, selectedUserEmployeeId, userData.userEmployeeNumber, userCandidates, applyUserFromEmployee]);

  useEffect(() => {
    if (step !== "user") return;
    const num = userData.userEmployeeNumber.trim();
    if (!num) {
      setUserRetired(false);
      return;
    }
    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(num)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) return;
        const m = (data.employees ?? []).find((e) => e.employeeNumber.trim() === num);
        setUserRetired(m ? Boolean(m.retired) : false);
      } catch {
        /* ignore */
      }
    }, 350);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [step, userData.userEmployeeNumber]);

  const handleApplicantNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!applicantData.employeeNumber.trim()) {
      setMessage({
        type: "error",
        text: "申請者の社員番号を入力するか、リストから選択してください。社員番号がない場合は本申請ではお手続きいただけません。",
      });
      return;
    }
    if (applicantRetired) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }
    setStep("equipment");
  };

  const handleUserNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!userData.userEmployeeNumber.trim()) {
      setMessage({
        type: "error",
        text: "利用者の社員番号を入力するか、リストから選択してください。社員番号がない場合は本申請ではお手続きいただけません。",
      });
      return;
    }
    if (userRetired) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }
    if (lendingLinesIncludePc(lendingLines) && !userData.userStaffCategory.trim()) {
      setMessage({
        type: "error",
        text: "PC を含む申請では、利用者区分（管理社員／技術社員）を選択してください。",
      });
      return;
    }
    if (deliveryData.deliverySameAsUser) {
      setDeliveryData({
        deliverySameAsUser: true,
        deliveryName: userData.userName,
        deliveryEmployeeNumber: userData.userEmployeeNumber,
        deliveryCompanyName: userData.userCompanyName,
        deliveryDepartment: userData.userDepartmentName,
        deliveryArea: "",
        deliveryPostalCode: "",
        deliveryAddress: userData.userAddress,
        deliveryBuilding: "",
        deliveryEmail: userData.userEmail,
        deliveryPhone: userData.userPhone,
      });
    }
    setStep("delivery");
  };

  const handleDeliveryNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const deliveryRecipientBlocked = deliveryData.deliverySameAsUser
      ? userRetired
      : deliveryRecipientRetired;
    if (deliveryRecipientBlocked) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }
    if (!deliveryData.deliverySameAsUser) {
      if (!deliveryData.deliveryName.trim()) {
        setMessage({ type: "error", text: "送付先氏名を入力してください。" });
        return;
      }
      if (!deliveryData.deliveryEmployeeNumber.trim()) {
        setMessage({
          type: "error",
          text: "送付先の社員をマスタから選択してください。該当者がいない場合は本申請ではお手続きいただけません。",
        });
        return;
      }
      if (!deliveryData.deliveryAddress.trim()) {
        setMessage({
          type: "error",
          text: "送付先住所をマスタから取得できませんでした。別の送付先を選択するか、管理者へマスタ登録をご確認ください。",
        });
        return;
      }
    } else if (!deliveryData.deliveryAddress.trim()) {
      setMessage({ type: "error", text: "利用者の住所が未入力です。利用者情報を確認してください。" });
      return;
    }
    setStep("reason");
  };

  const updateLendingLine = (id: string, patch: Partial<LendingEquipmentLine>) => {
    setLendingLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeLendingLine = (id: string) => {
    setLendingLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const addLendingLine = () => setLendingLines((prev) => [...prev, newLendingEquipmentLine()]);

  const handleEquipmentNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!equipmentStepOk) {
      setMessage({
        type: "error",
        text: "各行で貸与機器の種類を選択してください。追加する場合は「機器を追加」から行を増やせます。",
      });
      return;
    }
  setStep("user");
  };

  const buildLendingRequestBody = () => {
    const pc = lendingLinesIncludePc(lendingLines);
    const delivery = deliveryData.deliverySameAsUser
      ? {
          deliveryName: userData.userName,
          deliveryCompanyName: userData.userCompanyName,
          deliveryDepartment: userData.userDepartmentName,
          deliveryArea: "",
          deliveryPostalCode: "",
          deliveryAddress: userData.userAddress,
          deliveryBuilding: "",
          deliveryEmail: userData.userEmail,
          deliveryPhone: userData.userPhone,
        }
      : {
          deliveryName: deliveryData.deliveryName,
          deliveryCompanyName: deliveryData.deliveryCompanyName,
          deliveryDepartment: deliveryData.deliveryDepartment,
          deliveryArea: deliveryData.deliveryArea,
          deliveryPostalCode: deliveryData.deliveryPostalCode,
          deliveryAddress: deliveryData.deliveryAddress,
          deliveryBuilding: deliveryData.deliveryBuilding,
          deliveryEmail: deliveryData.deliveryEmail,
          deliveryPhone: deliveryData.deliveryPhone,
        };
    const { applicationCorrelationId, ...reasonRest } = reasonData;
    return {
      ...applicantData,
      ...userData,
      ...delivery,
      ...reasonRest,
      ...(applicationCorrelationId.trim()
        ? { applicationCorrelationId: applicationCorrelationId.trim() }
        : {}),
      userStaffCategory: pc ? userData.userStaffCategory : LENDING_NON_PC_STAFF_CATEGORY,
      decisionContractType: pc ? reasonData.decisionContractType : "",
      decisionWorkContent: pc ? reasonData.decisionWorkContent : "",
      decisionClientEnv: pc ? reasonData.decisionClientEnv : "",
      lines: lendingLines.map(({ equipmentType }) => ({ equipmentType })),
    };
  };

  const handleReasonContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const deliveryRecipientBlocked = deliveryData.deliverySameAsUser
      ? userRetired
      : deliveryRecipientRetired;
    if (applicantRetired || userRetired || deliveryRecipientBlocked) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }

    if (includesPc) {
      if (!reasonData.msOfficeEdition.trim()) {
        setMessage({ type: "error", text: "MicrosoftOfficeのエディションを選択してください。" });
        return;
      }
      if (
        !isMsOfficeEditionAllowedForPcDecision(
          userData.userStaffCategory,
          reasonData.decisionContractType,
          reasonData.decisionWorkContent,
          reasonData.decisionClientEnv,
          reasonData.msOfficeEdition,
        )
      ) {
        setMessage({
          type: "error",
          text: "現在の判定に対して選択できない MicrosoftOffice のエディションです。客先ネットワーク接続や契約形態を確認してください。",
        });
        return;
      }
      const fields = decisionResolutionToLicenseFields(decisionResolution);
      if (!fields) {
        if (decisionResolution.kind === "lending_denied") {
          setMessage({ type: "error", text: decisionResolution.message });
        } else {
          setMessage({
            type: "error",
            text: "利用者区分と判定プロセスを正しく選択してください。",
          });
        }
        return;
      }
    }

    if (!lendingDatesOk) {
      setMessage({
        type: "error",
        text: "貸与開始日・返却予定日は本日から1週間後以降の平日を選択し、返却予定日は貸与開始日以降にしてください。",
      });
      return;
    }

    setStep("confirm");
  };

  const handleConfirmRegister = async () => {
    setMessage(null);
    const deliveryRecipientBlocked = deliveryData.deliverySameAsUser
      ? userRetired
      : deliveryRecipientRetired;
    if (applicantRetired || userRetired || deliveryRecipientBlocked) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }
    if (!applicantData.employeeNumber.trim() || !userData.userEmployeeNumber.trim()) {
      setMessage({
        type: "error",
        text: "申請者・利用者の双方に社員番号が必要です。社員番号がない場合は本申請ではお手続きいただけません。",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLendingRequestBody()),
      });
      const data = await parseApiJson(response);
      if (!response.ok) {
        throw new Error(data.error ?? "登録に失敗しました。");
      }

      setMessage({
        type: "success",
        text: data.applicationCorrelationId
          ? `申請を登録しました。申請連携ID: ${data.applicationCorrelationId}`
          : "申請を登録しました。",
      });
      staffAutoKeyFromUserHrRef.current = "";
      setApplicantData(initialApplicant);
      setUserData(initialUser);
      setDeliveryData(initialDelivery);
      setRevealApplicantEmployeeField(false);
      setRevealApplicantDetailFields(false);
      setRevealUserEmployeeField(false);
      setRevealUserDetailFields(false);
      setReasonData(initialReason);
      setLendingLines([newLendingEquipmentLine()]);
      setApplicantCandidates([]);
      setSelectedApplicantEmployeeId(null);
      setUserCandidates([]);
      setSelectedUserEmployeeId(null);
      setApplicantRetired(false);
      setUserRetired(false);
      setDeliveryRecipientRetired(false);
      setStep("notice");
      setNoticeAgreed(false);
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "登録に失敗しました。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyLendingPrefillFromPast = useCallback((prefill: LendingRequestPrefillPayload) => {
    setApplicantData(prefill.applicant);
    setUserData(prefill.user);
    setDeliveryData({
      ...initialDelivery,
      ...prefill.delivery,
      deliveryEmployeeNumber: prefill.delivery.deliveryEmployeeNumber ?? "",
    });
    setLendingLines(
      prefill.lendingLines.length > 0 ? prefill.lendingLines : [newLendingEquipmentLine()],
    );
    setReasonData(prefill.reason);
    staffAutoKeyFromUserHrRef.current = "";
    setRevealApplicantEmployeeField(true);
    setRevealApplicantDetailFields(true);
    setRevealUserEmployeeField(true);
    setRevealUserDetailFields(true);
    setSelectedApplicantEmployeeId(null);
    setSelectedUserEmployeeId(null);
    setApplicantCandidates([]);
    setUserCandidates([]);
    setNoticeAgreed(true);
    setApplicantRetired(false);
    setUserRetired(false);
    setDeliveryRecipientRetired(false);
    setStep("applicant");
    setMessage({
      type: "success",
      text: "過去の申請を再利用しました。貸与期間は選び直し、内容を確認してから登録してください。",
    });
  }, []);

  useRegisterLendingCopyPrefill(applyLendingPrefillFromPast);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(LENDING_PREFILL_SESSION_KEY);
    if (!raw) return;
    sessionStorage.removeItem(LENDING_PREFILL_SESSION_KEY);
    try {
      applyLendingPrefillFromPast(JSON.parse(raw) as LendingRequestPrefillPayload);
    } catch {
      /* ignore */
    }
  }, [applyLendingPrefillFromPast]);

  return (
    <ItServiceShell activeMenu="lending" mainTitle="ITサービス依頼　機器貸与 申請">
      {(formOptionsError ?? employmentTypesError) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {formOptionsError ?? employmentTypesError}
        </Alert>
      )}
          {step === "notice" ? (
            <Stack spacing="20px">
              {message && <Alert severity={message.type}>{message.text}</Alert>}
              <Typography sx={{ fontSize: 24, mb: 1.2, padding: "20px 0 20px 0" }}>
                Q. 以下の注意事項をご確認のうえ、申請にお進みください。
              </Typography>
              <Stack spacing={1.2} sx={{ pl: "75px", pr: 2 }}>
                {IT_SERVICE_WARNINGS.map((warning) => (
                  <Box
                    key={warning}
                    sx={{ display: "flex", alignItems: "flex-start", gap: 0 }}
                  >
                    <Box
                      component="span"
                      sx={{
                        flexShrink: 0,
                        mt: "10px",
                        width: 11,
                        height: 11,
                        borderRadius: "50%",
                        bgcolor: "#007D9E",
                      }}
                    />
                    <Typography sx={{ fontSize: 18, color: "#333", flex: 1, lineHeight: 1.65 }}>
                      {"\u3000"}
                      {warning}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Box
                sx={{
                  pt: "15px",
                  mt: "40px",
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <FormControlLabel
                  sx={{
                    ml: 0,
                    mr: 0,
                    ".MuiFormControlLabel-label": { fontSize: 16, color: "#333" },
                  }}
                  control={
                    <Checkbox
                      checked={noticeAgreed}
                      onChange={(_, checked) => setNoticeAgreed(checked)}
                      sx={{
                        mr: 1,
                        p: 0.4,
                        color: "#bdbdbd",
                        "&.Mui-checked": {
                          color: "#007D9E",
                        },
                      }}
                    />
                  }
                  label="上記の注意事項に同意し、申請を続ける"
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 1.5,
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="contained"
                  disabled={!noticeAgreed}
                  onClick={() => {
                    setMessage(null);
                    setStep("applicant");
                  }}
                  sx={{
                    width: 210,
                    height: 46,
                    borderRadius: 999,
                    backgroundColor: brandColor,
                    fontSize: 18,
                    "&:hover": { backgroundColor: "#006c88" },
                  }}
                >
                  次へ
                </Button>
              </Box>
            </Stack>
          ) : step === "applicant" ? (
            <>
              <Box>
                <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
                  Q. 申請者氏名と社員番号を入力してください
                </Typography>
              </Box>
              <Box component="form" onSubmit={handleApplicantNext} sx={{ width: "90%", margin: "0 auto" }}>
                <Stack spacing={2.2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>申請者氏名</Typography>
                    <Box sx={{ ...formRowFieldCellSx, position: "relative" }}>
                      <TextField
                        value={applicantData.applicantName}
                        onChange={(e) => handleApplicantNameInput(e.target.value)}
                        placeholder="氏名の一部で検索（マスタから索引）"
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      />
                      {applicantSearchLoading && (
                        <CircularProgress
                          size={22}
                          sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }}
                        />
                      )}
                    </Box>
                  </Box>
                  {showApplicantEmployeeField &&
                    (applicantCandidates.length >= 1 && !selectedApplicantEmployeeId ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>社員番号（選択）</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            select
                            value={selectedApplicantEmployeeId ?? ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              const emp = applicantCandidates.find((c) => c.id === id);
                              if (emp) applyApplicantFromEmployee(emp);
                            }}
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                          >
                            <MenuItem value="" disabled>
                              社員番号を選択してください
                            </MenuItem>
                            {applicantCandidates.map((emp) => (
                              <MenuItem key={emp.id} value={emp.id}>
                                {emp.employeeNumber}　{emp.fullName}（{emp.companyName}・{emp.departmentName}）
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>社員番号</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={applicantData.employeeNumber}
                            onChange={(e) => {
                              const value = e.target.value;
                              setApplicantData((prev) => ({ ...prev, employeeNumber: value }));
                              setRevealApplicantDetailFields(value.trim().length > 0);
                            }}
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                            slotProps={{
                              htmlInput: { readOnly: Boolean(selectedApplicantEmployeeId) },
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  {applicantData.applicantName.trim().length > 0 &&
                    !applicantSearchLoading &&
                    applicantCandidates.length === 0 &&
                    !selectedApplicantEmployeeId && (
                      <Typography sx={{ pl: "186px", fontSize: 14, color: "#666" }}>
                        該当する社員が見つかりません。下の欄に直接入力してください。
                      </Typography>
                    )}
                  {showApplicantDetailFields &&
                    APPLICANT_DETAIL_FIELDS.map(({ key, label }) => (
                      <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>{label}</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={applicantData[key]}
                            onChange={(e) =>
                              setApplicantData((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                            slotProps={{
                              htmlInput: { readOnly: Boolean(selectedApplicantEmployeeId) },
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  {applicantRetired && (
                    <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
                      {EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE}
                    </Alert>
                  )}
                  <Box sx={{ pt: "15px" }}>
                    <Typography sx={{ textAlign: "center", color: "#666", fontSize: 12, mt: "40px" }}>
                      申請者情報が正しく入力されていることを確認し、「次へ」をクリックしてください。
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setStep("notice")}
                      sx={{
                        borderRadius: 999,
                        width: 180,
                        height: 46,
                        fontSize: 18,
                        borderColor: "#c9c9c9",
                        color: "#333",
                      }}
                    >
                      戻る
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={applicantRetired}
                      sx={{
                        width: 180,
                        height: 46,
                        borderRadius: 999,
                        backgroundColor: brandColor,
                        fontSize: 18,
                        "&:hover": { backgroundColor: "#006c88" },
                      }}
                    >
                      次へ
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </>
        ) : step === "equipment" ? (
          <>
            <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 12px 0" }}>
              Q. 貸与する機器の種類を選択してください（複数ある場合は「機器を追加」で行を増やせます）
            </Typography>
            <Box component="form" onSubmit={handleEquipmentNext} sx={{ width: "95%", margin: "0 auto" }}>
              <Stack spacing={2.5}>
                {lendingLines.map((line, index) => (
                  <Box
                    key={line.id}
                    sx={{
                      border: "1px solid #e8e8e8",
                      borderRadius: 1,
                      p: 2,
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1.5 }}>
                      機器 {index + 1}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                      <Typography sx={{ ...formRowLabelSx, width: 140 }}>機器の種類</Typography>
                      <Box sx={{ ...formRowFieldCellSx, minWidth: 220 }}>
                        <TextField
                          select
                          required
                          label="選択"
                          value={line.equipmentType}
                          onChange={(e) =>
                            updateLendingLine(line.id, { equipmentType: e.target.value })
                          }
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        >
                          <MenuItem value="" disabled>
                            選択してください
                          </MenuItem>
                          {lendingEquipmentTypeOptions.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Box>
                    {lendingLines.length > 1 && (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          type="button"
                          size="small"
                          color="inherit"
                          onClick={() => removeLendingLine(line.id)}
                        >
                          この行を削除
                        </Button>
                      </Box>
                    )}
                  </Box>
                ))}
                <Box>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={addLendingLine}
                    sx={{
                      borderRadius: 999,
                      height: 46,
                      fontSize: 18,
                      borderColor: "#c9c9c9",
                      color: "#333",
                    }}
                  >
                    機器を追加
                  </Button>
                </Box>
                {message && <Alert severity={message.type}>{message.text}</Alert>}
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setStep("applicant")}
                    sx={{
                      borderRadius: 999,
                      width: 180,
                      height: 46,
                      fontSize: 18,
                      borderColor: "#c9c9c9",
                      color: "#333",
                    }}
                  >
                    戻る
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!equipmentStepOk}
                    sx={{
                      width: 180,
                      height: 46,
                      borderRadius: 999,
                      backgroundColor: brandColor,
                      fontSize: 18,
                      "&:hover": { backgroundColor: "#006c88" },
                    }}
                  >
                    次へ
                  </Button>
                </Box>
              </Stack>
            </Box>
          </>
        ) : step === "user" ? (
            <>
              <Box>
                <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
                  Q. 利用者情報を入力してください
                </Typography>
              </Box>
              <Box component="form" onSubmit={handleUserNext} sx={{ width: "90%", margin: "0 auto" }}>
                <Stack spacing={2.2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>利用者氏名</Typography>
                    <Box sx={{ ...formRowFieldCellSx, position: "relative" }}>
                      <TextField
                        value={userData.userName}
                        onChange={(e) => handleUserNameInput(e.target.value)}
                        placeholder="氏名の一部で検索（マスタから索引）"
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      />
                      {userSearchLoading && (
                        <CircularProgress
                          size={22}
                          sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }}
                        />
                      )}
                    </Box>
                  </Box>
                  {showUserEmployeeField &&
                    (userCandidates.length >= 1 && !selectedUserEmployeeId ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>社員番号（選択）</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            select
                            value={selectedUserEmployeeId ?? ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              const emp = userCandidates.find((c) => c.id === id);
                              if (emp) applyUserFromEmployee(emp);
                            }}
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                          >
                            <MenuItem value="" disabled>
                              社員番号を選択してください
                            </MenuItem>
                            {userCandidates.map((emp) => (
                              <MenuItem key={emp.id} value={emp.id}>
                                {emp.employeeNumber}　{emp.fullName}（{emp.companyName}・{emp.departmentName}）
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>社員番号</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={userData.userEmployeeNumber}
                            onChange={(e) => {
                              const value = e.target.value;
                              setUserData((prev) => ({ ...prev, userEmployeeNumber: value }));
                              setRevealUserDetailFields(value.trim().length > 0);
                            }}
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                            slotProps={{
                              htmlInput: { readOnly: Boolean(selectedUserEmployeeId) },
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  {userData.userName.trim().length > 0 &&
                    !userSearchLoading &&
                    userCandidates.length === 0 &&
                    !selectedUserEmployeeId && (
                      <Typography sx={{ pl: "186px", fontSize: 14, color: "#666" }}>
                        該当する社員が見つかりません。下の欄に直接入力してください。
                      </Typography>
                    )}
                  {showUserDetailFields &&
                    USER_DETAIL_FIELDS.map(({ key, label }) => (
                      <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>{label}</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={userData[key]}
                            onChange={(e) => setUserData((prev) => ({ ...prev, [key]: e.target.value }))}
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                            slotProps={{
                              htmlInput: { readOnly: Boolean(selectedUserEmployeeId) },
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  {showUserDetailFields && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>契約形態</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          select
                          value={userData.userContractType}
                          onChange={(e) =>
                            setUserData((prev) => ({ ...prev, userContractType: e.target.value }))
                          }
                          required
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        >
                          <MenuItem value="" disabled>
                            選択してください
                          </MenuItem>
                          {employmentTypeLabels.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Box>
                  )}
                  {showUserDetailFields && includesPc && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>利用者区分</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          select
                          value={userData.userStaffCategory}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserData((prev) => ({ ...prev, userStaffCategory: v }));
                            if (v === STAFF_MANAGEMENT) {
                              setReasonData((prev) => ({
                                ...prev,
                                decisionContractType: "",
                                decisionWorkContent: "",
                                decisionClientEnv: "",
                              }));
                            }
                          }}
                          required
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        >
                          <MenuItem value="" disabled>
                            選択してください
                          </MenuItem>
                          {userStaffCategoryOptions.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Box>
                  )}
                  {showUserDetailFields && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography sx={{ fontWeight: 600, fontSize: 15, color: "#007D9E" }}>
                        経費負担・連絡先
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>経費負担部署名</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={userData.userCostDeptName}
                            onChange={(e) => setUserData((prev) => ({ ...prev, userCostDeptName: e.target.value }))}
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>経費負担部門コード</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={userData.userCostDeptCode}
                            onChange={(e) => setUserData((prev) => ({ ...prev, userCostDeptCode: e.target.value }))}
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>Eメール</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={userData.userEmail}
                            onChange={(e) => setUserData((prev) => ({ ...prev, userEmail: e.target.value }))}
                            fullWidth
                            size="small"
                            type="email"
                            sx={textFieldRowSx}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>電話番号</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            value={userData.userPhone}
                            onChange={(e) => setUserData((prev) => ({ ...prev, userPhone: e.target.value }))}
                            fullWidth
                            size="small"
                            type="tel"
                            sx={textFieldRowSx}
                          />
                        </Box>
                      </Box>
                    </>
                  )}
                  {userRetired && (
                    <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
                      {EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE}
                    </Alert>
                  )}
                  <Box sx={{ pt: "15px" }}>
                    <Typography sx={{ textAlign: "center", color: "#666", fontSize: 12, mt: "40px" }}>
                      利用者情報が正しく入力されていることを確認し、「次へ」をクリックしてください。
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setStep("equipment")}
                      sx={{
                        borderRadius: 999,
                        width: 180,
                        height: 46,
                        fontSize: 18,
                        borderColor: "#c9c9c9",
                        color: "#333",
                      }}
                    >
                      戻る
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={userRetired}
                      sx={{
                        width: 180,
                        height: 46,
                        borderRadius: 999,
                        backgroundColor: brandColor,
                        fontSize: 18,
                        "&:hover": { backgroundColor: "#006c88" },
                      }}
                    >
                      次へ
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </>
        ) : step === "delivery" ? (
            <DeliveryStep
              brandColor={brandColor}
              deliveryData={deliveryData}
              setDeliveryData={setDeliveryData}
              userData={userData}
              userRetired={userRetired}
              deliveryRecipientRetired={deliveryRecipientRetired}
              setDeliveryRecipientRetired={setDeliveryRecipientRetired}
              message={message}
              onBack={() => setStep("user")}
              onNext={handleDeliveryNext}
              formRowLabelSx={formRowLabelSx}
              formRowFieldCellSx={formRowFieldCellSx}
              textFieldRowSx={textFieldRowSx}
            />
        ) : step === "reason" ? (
            <>
              <Box>
                <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
                  Q. 申請理由を入力してください
                </Typography>
              </Box>
              <Box component="form" onSubmit={handleReasonContinue} sx={{ width: "90%", margin: "0 auto" }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                  <Stack spacing={2.2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>申請理由</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={reasonData.requestReason}
                        onChange={(e) =>
                          setReasonData((prev) => ({ ...prev, requestReason: e.target.value }))
                        }
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          選択してください
                        </MenuItem>
                        {lendingRequestReasonOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                  {/* ── PC セクション ── */}
                  {includesPc && (
                    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#007D9E" }}>
                        {EQUIPMENT_CATEGORY_LABEL.pc}
                      </Typography>
                      <Stack spacing={2.2}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography sx={formRowLabelSx}>利用者区分</Typography>
                          <Box sx={formRowFieldCellSx}>
                            <TextField
                              select
                              value={userData.userStaffCategory}
                              onChange={(e) => {
                                const v = e.target.value;
                                setUserData((prev) => ({ ...prev, userStaffCategory: v }));
                                if (v === STAFF_MANAGEMENT) {
                                  setReasonData((prev) => ({
                                    ...prev,
                                    decisionContractType: "",
                                    decisionWorkContent: "",
                                    decisionClientEnv: "",
                                  }));
                                }
                              }}
                              required
                              fullWidth
                              size="small"
                              sx={textFieldRowSx}
                              helperText="人事マスタと異なる場合は、ここで区分を修正してください。"
                            >
                              <MenuItem value="" disabled>
                                選択してください
                              </MenuItem>
                              {userStaffCategoryOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                  {opt}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>
                        </Box>
                        {userData.userStaffCategory === STAFF_TECHNICAL && (
                          <>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Typography sx={formRowLabelSx}>契約形態</Typography>
                              <Box sx={formRowFieldCellSx}>
                                <TextField
                                  select
                                  value={reasonData.decisionContractType}
                                  onChange={(e) =>
                                    setReasonData((prev) => ({
                                      ...prev,
                                      decisionContractType: e.target.value,
                                    }))
                                  }
                                  required
                                  fullWidth
                                  size="small"
                                  sx={textFieldRowSx}
                                >
                                  <MenuItem value="" disabled>
                                    選択してください
                                  </MenuItem>
                                  {decisionContractTypeOptions.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Typography sx={formRowLabelSx}>業務内容</Typography>
                              <Box sx={formRowFieldCellSx}>
                                <TextField
                                  select
                                  value={reasonData.decisionWorkContent}
                                  onChange={(e) =>
                                    setReasonData((prev) => ({
                                      ...prev,
                                      decisionWorkContent: e.target.value,
                                    }))
                                  }
                                  required
                                  fullWidth
                                  size="small"
                                  sx={textFieldRowSx}
                                >
                                  <MenuItem value="" disabled>
                                    選択してください
                                  </MenuItem>
                                  {decisionWorkContentOptions.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Typography sx={formRowLabelSx}>客先ネットワーク接続の有無</Typography>
                              <Box sx={formRowFieldCellSx}>
                                <TextField
                                  select
                                  value={reasonData.decisionClientEnv}
                                  onChange={(e) =>
                                    setReasonData((prev) => ({
                                      ...prev,
                                      decisionClientEnv: e.target.value,
                                    }))
                                  }
                                  required
                                  fullWidth
                                  size="small"
                                  sx={textFieldRowSx}
                                >
                                  <MenuItem value="" disabled>
                                    選択してください
                                  </MenuItem>
                                  {decisionClientEnvOptions.map((opt) => (
                                    <MenuItem key={opt} value={opt}>
                                      {opt}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Box>
                            </Box>
                          </>
                        )}
                        {(userData.userStaffCategory === STAFF_MANAGEMENT ||
                          userData.userStaffCategory === STAFF_TECHNICAL) && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Typography sx={formRowLabelSx}>MicrosoftOfficeのエディション</Typography>
                            <Box sx={formRowFieldCellSx}>
                              <TextField
                                select
                                value={reasonData.msOfficeEdition}
                                onChange={(e) =>
                                  setReasonData((prev) => ({
                                    ...prev,
                                    msOfficeEdition: e.target.value,
                                  }))
                                }
                                required
                                fullWidth
                                size="small"
                                disabled={msOfficeMenuOptions.length === 0}
                                helperText={
                                  userData.userStaffCategory === STAFF_TECHNICAL &&
                                  !reasonData.decisionClientEnv.trim()
                                    ? "先に客先ネットワーク接続の有無を選択してください。"
                                    : userData.userStaffCategory === STAFF_TECHNICAL &&
                                        msOfficeMenuOptions.length === 0
                                      ? "この組み合わせでは MicrosoftOffice の選択肢がありません。判定フローをご確認ください。"
                                      : ""
                                }
                                sx={textFieldRowSx}
                              >
                                <MenuItem value="" disabled>
                                  選択してください
                                </MenuItem>
                                {msOfficeMenuOptions.map((edition) => (
                                  <MenuItem key={edition} value={edition}>
                                    {edition}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Box>
                          </Box>
                        )}
                        {decisionResolution.kind === "lending_denied" && (
                          <Alert severity="error">
                            <Typography component="span" sx={{ fontSize: "inherit" }}>
                              {decisionResolution.message}
                            </Typography>
                            <Typography component="div" sx={{ mt: 0.5, fontSize: 13 }}>
                              <Link href="/pc-spec-flow" target="_blank" rel="noopener noreferrer">
                                判定フローはこちら
                              </Link>
                            </Typography>
                          </Alert>
                        )}
                        {derivedLicense && decisionResolution.kind === "management_internal" && (
                          <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
                            <PcInitialSettingsTitle />
                            <Typography sx={{ fontSize: 13, color: "#555", mb: 0.5 }}>
                              管理社員・社内仕様（固定。仕様①〜④の表とは別区分）
                            </Typography>
                            <PcInitialSettingsTable
                              userInstall="×"
                              network="○"
                              licenseApply="○"
                            />
                          </Alert>
                        )}
                        {derivedLicense && technicalSpecCode !== null && (
                          <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
                            <PcInitialSettingsTitle />
                            <PcInitialSettingsTable
                              userInstall={LICENSE_SPEC_ROWS[technicalSpecCode].userInstall}
                              network={LICENSE_SPEC_ROWS[technicalSpecCode].network}
                              licenseApply={LICENSE_SPEC_ROWS[technicalSpecCode].licenseApply}
                            />
                          </Alert>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* ── 通信機器セクション ── */}
                  {includesCommunication && (
                    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#007D9E" }}>
                        {EQUIPMENT_CATEGORY_LABEL.communication}
                      </Typography>
                      <Stack spacing={2}>
                        {includesSmartphone && (
                          <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>スマホ</Typography>
                            <Stack spacing={2.2}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography sx={formRowLabelSx}>カメラ利用の有無</Typography>
                                <Box sx={formRowFieldCellSx}>
                                  <TextField
                                    select
                                    value={reasonData.smartphoneCameraPresence}
                                    onChange={(e) =>
                                      setReasonData((prev) => ({
                                        ...prev,
                                        smartphoneCameraPresence: e.target.value,
                                      }))
                                    }
                                    required
                                    fullWidth
                                    size="small"
                                    sx={textFieldRowSx}
                                  >
                                    <MenuItem value="" disabled>選択してください</MenuItem>
                                    {smartphoneCameraOptions.map((opt) => (
                                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                  </TextField>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography sx={formRowLabelSx}>スマホの利用者の特定の有無</Typography>
                                <Box sx={formRowFieldCellSx}>
                                  <TextField
                                    select
                                    value={reasonData.smartphoneUserIdentification}
                                    onChange={(e) =>
                                      setReasonData((prev) => ({
                                        ...prev,
                                        smartphoneUserIdentification: e.target.value,
                                      }))
                                    }
                                    required
                                    fullWidth
                                    size="small"
                                    sx={textFieldRowSx}
                                  >
                                    <MenuItem value="" disabled>選択してください</MenuItem>
                                    {smartphoneUserIdentificationOptions.map((opt) => (
                                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                  </TextField>
                                </Box>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography sx={formRowLabelSx}>スマホの事業場での利用</Typography>
                                <Box sx={formRowFieldCellSx}>
                                  <TextField
                                    select
                                    value={reasonData.smartphoneWorkplaceUse}
                                    onChange={(e) =>
                                      setReasonData((prev) => ({
                                        ...prev,
                                        smartphoneWorkplaceUse: e.target.value,
                                      }))
                                    }
                                    required
                                    fullWidth
                                    size="small"
                                    sx={textFieldRowSx}
                                  >
                                    <MenuItem value="" disabled>選択してください</MenuItem>
                                    {smartphoneWorkplaceOptions.map((opt) => (
                                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                  </TextField>
                                </Box>
                              </Box>
                            </Stack>
                          </Box>
                        )}
                        {includesWifiRouter && (
                          <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.5 }}>Wifiルーター</Typography>
                            <Alert severity="info" sx={{ mt: 1 }}>
                              Wifiルーターに関する追加の入力事項はありません。
                            </Alert>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* ── 周辺機器セクション ── */}
                  {includesPeripheral && (
                    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#007D9E" }}>
                        {EQUIPMENT_CATEGORY_LABEL.peripheral}
                      </Typography>
                      <Stack spacing={2}>
                        {includesMonitor && (
                          <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>モニター</Typography>
                            <Stack spacing={2.2}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography sx={formRowLabelSx}>サイズ</Typography>
                                <Box sx={formRowFieldCellSx}>
                                  <TextField
                                    select
                                    value={reasonData.peripheralMonitorSize}
                                    onChange={(e) =>
                                      setReasonData((prev) => ({
                                        ...prev,
                                        peripheralMonitorSize: e.target.value,
                                        ...(e.target.value !== "その他" ? { peripheralMonitorSizeCustom: "" } : {}),
                                      }))
                                    }
                                    required
                                    fullWidth
                                    size="small"
                                    sx={textFieldRowSx}
                                  >
                                    <MenuItem value="" disabled>選択してください</MenuItem>
                                    {peripheralMonitorSizeOptions.map((opt) => (
                                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                  </TextField>
                                </Box>
                              </Box>
                              {reasonData.peripheralMonitorSize === "その他" && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <Typography sx={formRowLabelSx}>サイズ（詳細）</Typography>
                                  <Box sx={formRowFieldCellSx}>
                                    <TextField
                                      value={reasonData.peripheralMonitorSizeCustom}
                                      onChange={(e) =>
                                        setReasonData((prev) => ({
                                          ...prev,
                                          peripheralMonitorSizeCustom: e.target.value,
                                        }))
                                      }
                                      required
                                      fullWidth
                                      size="small"
                                      placeholder="例: 32インチ"
                                      sx={textFieldRowSx}
                                    />
                                  </Box>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        )}
                        {includesLanCable && (
                          <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>LANケーブル</Typography>
                            <Stack spacing={2.2}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography sx={formRowLabelSx}>最低限の長さ</Typography>
                                <Box sx={formRowFieldCellSx}>
                                  <TextField
                                    select
                                    value={reasonData.peripheralLanCableLength}
                                    onChange={(e) =>
                                      setReasonData((prev) => ({
                                        ...prev,
                                        peripheralLanCableLength: e.target.value,
                                        ...(e.target.value !== "その他" ? { peripheralLanCableLengthCustom: "" } : {}),
                                      }))
                                    }
                                    required
                                    fullWidth
                                    size="small"
                                    sx={textFieldRowSx}
                                  >
                                    <MenuItem value="" disabled>選択してください</MenuItem>
                                    {peripheralLanCableLengthOptions.map((opt) => (
                                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                  </TextField>
                                </Box>
                              </Box>
                              {reasonData.peripheralLanCableLength === "その他" && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <Typography sx={formRowLabelSx}>長さ（詳細）</Typography>
                                  <Box sx={formRowFieldCellSx}>
                                    <TextField
                                      value={reasonData.peripheralLanCableLengthCustom}
                                      onChange={(e) =>
                                        setReasonData((prev) => ({
                                          ...prev,
                                          peripheralLanCableLengthCustom: e.target.value,
                                        }))
                                      }
                                      required
                                      fullWidth
                                      size="small"
                                      placeholder="例: 15m"
                                      sx={textFieldRowSx}
                                    />
                                  </Box>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        )}
                        {includesMouse && (
                          <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.5 }}>マウス</Typography>
                            <Alert severity="info" sx={{ mt: 1 }}>
                              マウスに関する追加の入力事項はありません。
                            </Alert>
                          </Box>
                        )}
                        {includesHeadset && (
                          <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.5 }}>ヘッドセット</Typography>
                            <Alert severity="info" sx={{ mt: 1 }}>
                              ヘッドセットに関する追加の入力事項はありません。
                            </Alert>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}

                  <Divider />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>貸与開始日</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <DatePicker
                        format="YYYY-MM-DD"
                        minDate={minSelectableDate}
                        shouldDisableDate={(date) => !isSelectableBusinessDate(date)}
                        value={
                          reasonData.lendingStartDate
                            ? dayjs(reasonData.lendingStartDate)
                            : null
                        }
                        onChange={(v) =>
                          setReasonData((prev) => ({
                            ...prev,
                            lendingStartDate:
                              v != null && v.isValid() ? v.format("YYYY-MM-DD") : "",
                          }))
                        }
                        views={["year", "month", "day"]}
                        slotProps={brandDatePickerSlotProps}
                        sx={{ width: "100%", maxWidth: "100%" }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>返却予定日</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <DatePicker
                        format="YYYY-MM-DD"
                        minDate={returnMinSelectableDate}
                        shouldDisableDate={(date) => {
                          if (!isSelectableBusinessDate(date)) return true;
                          return date.startOf("day").isBefore(returnMinSelectableDate);
                        }}
                        value={
                          reasonData.expectedReturnDate
                            ? dayjs(reasonData.expectedReturnDate)
                            : null
                        }
                        onChange={(v) =>
                          setReasonData((prev) => ({
                            ...prev,
                            expectedReturnDate:
                              v != null && v.isValid() ? v.format("YYYY-MM-DD") : "",
                          }))
                        }
                        views={["year", "month", "day"]}
                        slotProps={brandDatePickerSlotProps}
                        sx={{ width: "100%", maxWidth: "100%" }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>申請連携ID</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        value={reasonData.applicationCorrelationId}
                        fullWidth
                        size="small"
                        placeholder="この画面に入ると自動で付与されます"
                        sx={textFieldRowSx}
                        slotProps={{ input: { readOnly: true } }}
                        helperText="機器行ごとのセールスフォース送信で同じ申請を紐づけるための ID です（編集不要）。"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Typography sx={{ ...formRowLabelSx, pt: 0.5 }}>詳細</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        value={reasonData.requestDetail}
                        onChange={(e) =>
                          setReasonData((prev) => ({ ...prev, requestDetail: e.target.value }))
                        }
                        fullWidth
                        multiline
                        minRows={4}
                        size="small"
                        placeholder="詳細を入力してください"
                        sx={{
                          "& textarea": {
                            resize: "vertical",
                            overflow: "auto",
                            minHeight: "6.5rem",
                            maxHeight: "min(70vh, 28rem)",
                            boxSizing: "border-box",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ pt: "15px" }}>
                    <Typography sx={{ textAlign: "center", color: "#666", fontSize: 12, mt: "40px" }}>
                      内容を確認のうえ、「確認へ」をクリックしてください。
                    </Typography>
                  </Box>
                  {message && <Alert severity={message.type}>{message.text}</Alert>}
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setStep("delivery")}
                      sx={{
                        borderRadius: 999,
                        width: 180,
                        height: 46,
                        fontSize: 18,
                        borderColor: "#c9c9c9",
                        color: "#333",
                      }}
                    >
                      戻る
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!reasonStepCanProceed}
                      sx={{
                        width: 180,
                        height: 46,
                        borderRadius: 999,
                        backgroundColor: brandColor,
                        fontSize: 18,
                        "&:hover": { backgroundColor: "#006c88" },
                      }}
                    >
                      確認へ
                    </Button>
                  </Box>
                  </Stack>
                </LocalizationProvider>
              </Box>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 12px 0" }}>
                入力内容の確認
              </Typography>
              <Typography sx={{ fontSize: 15, color: "#666", mb: 2 }}>
                内容をご確認のうえ「登録」を押してください。修正する場合は「入力に戻る」を押します。
              </Typography>
              <Box sx={{ width: "95%", margin: "0 auto", maxWidth: 900 }}>
                <Stack spacing={2}>
                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 1 }}>申請者</Typography>
                  <SummaryRow label="氏名" value={applicantData.applicantName} />
                  <SummaryRow label="社員番号" value={applicantData.employeeNumber} />
                  <SummaryRow label="所属企業名" value={applicantData.companyName} />
                  <SummaryRow label="部署名" value={applicantData.departmentName} />
                  <SummaryRow label="住所" value={applicantData.address} />
                  <SummaryRow label="役職" value={applicantData.applicantJobTitle} />
                  <SummaryRow label="Eメール" value={applicantData.applicantEmail} />
                  <SummaryRow label="電話番号" value={applicantData.applicantPhone} />
                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>利用者</Typography>
                  <SummaryRow label="氏名" value={userData.userName} />
                  <SummaryRow label="社員番号" value={userData.userEmployeeNumber} />
                  <SummaryRow label="所属企業名" value={userData.userCompanyName} />
                  <SummaryRow label="部署名" value={userData.userDepartmentName} />
                  <SummaryRow label="住所" value={userData.userAddress} />
                  <SummaryRow label="契約形態" value={userData.userContractType} />
                  {includesPc && <SummaryRow label="利用者区分" value={userData.userStaffCategory} />}
                  <SummaryRow label="経費負担部署名" value={userData.userCostDeptName} />
                  <SummaryRow label="経費負担部門コード" value={userData.userCostDeptCode} />
                  <SummaryRow label="Eメール" value={userData.userEmail} />
                  <SummaryRow label="電話番号" value={userData.userPhone} />
                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>送付先</Typography>
                  {deliveryData.deliverySameAsUser ? (
                    <SummaryRow label="" value="利用者と同じ" />
                  ) : (
                    <>
                      <SummaryRow label="送付先氏名" value={deliveryData.deliveryName} />
                      <SummaryRow label="会社名" value={deliveryData.deliveryCompanyName} />
                      <SummaryRow label="部署名" value={deliveryData.deliveryDepartment} />
                      <SummaryRow label="エリア" value={deliveryData.deliveryArea} />
                      <SummaryRow label="郵便番号" value={deliveryData.deliveryPostalCode} />
                      <SummaryRow label="住所" value={deliveryData.deliveryAddress} />
                      <SummaryRow label="ビル名" value={deliveryData.deliveryBuilding} />
                      <SummaryRow label="Eメール" value={deliveryData.deliveryEmail} />
                      <SummaryRow label="電話番号" value={deliveryData.deliveryPhone} />
                    </>
                  )}
                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>申請内容</Typography>
                  <SummaryRow label="申請連携ID" value={reasonData.applicationCorrelationId} />
                  <SummaryRow label="申請理由" value={reasonData.requestReason} />
                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>貸与機器</Typography>
                  {lendingLines.map((line, index) => {
                    const t = line.equipmentType.trim();
                    const cat: EquipmentCategory | null =
                      t && t in EQUIPMENT_CATEGORY_MAP
                        ? EQUIPMENT_CATEGORY_MAP[t as LendingEquipmentTypeOption]
                        : null;
                    return (
                      <Box
                        key={line.id}
                        sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1, color: "#007D9E" }}>
                          機器 {index + 1}: {line.equipmentType}
                          {cat && (
                            <Typography component="span" sx={{ ml: 1, fontWeight: 400, fontSize: 13, color: "#666" }}>
                              （{EQUIPMENT_CATEGORY_LABEL[cat]}）
                            </Typography>
                          )}
                        </Typography>
                        <Stack spacing={0.5}>
                          {/* PC 固有 */}
                          {cat === "pc" && (
                            <>
                              {userData.userStaffCategory === STAFF_TECHNICAL && (
                                <>
                                  <SummaryRow label="契約形態（判定）" value={reasonData.decisionContractType} />
                                  <SummaryRow label="業務内容" value={reasonData.decisionWorkContent} />
                                  <SummaryRow label="客先ネットワーク接続の有無" value={reasonData.decisionClientEnv} />
                                </>
                              )}
                              <SummaryRow label="MicrosoftOfficeのエディション" value={reasonData.msOfficeEdition} />
                              {derivedLicense && decisionResolution.kind === "management_internal" && (
                                <Box sx={{ pt: 1 }}>
                                  <PcInitialSettingsTitle />
                                  <PcInitialSettingsTable userInstall="×" network="○" licenseApply="○" />
                                </Box>
                              )}
                              {derivedLicense && technicalSpecCode !== null && (
                                <Box sx={{ pt: 1 }}>
                                  <PcInitialSettingsTitle />
                                  <PcInitialSettingsTable
                                    userInstall={LICENSE_SPEC_ROWS[technicalSpecCode].userInstall}
                                    network={LICENSE_SPEC_ROWS[technicalSpecCode].network}
                                    licenseApply={LICENSE_SPEC_ROWS[technicalSpecCode].licenseApply}
                                  />
                                </Box>
                              )}
                            </>
                          )}

                          {/* スマホ固有 */}
                          {t === "スマホ" && (
                            <>
                              <SummaryRow label="カメラ利用の有無" value={reasonData.smartphoneCameraPresence} />
                              <SummaryRow label="スマホの利用者の特定の有無" value={reasonData.smartphoneUserIdentification} />
                              <SummaryRow label="スマホの事業場での利用" value={reasonData.smartphoneWorkplaceUse} />
                            </>
                          )}

                          {/* モニター固有 */}
                          {t === "モニター" && (
                            <SummaryRow
                              label="サイズ"
                              value={
                                reasonData.peripheralMonitorSize === "その他"
                                  ? `その他（${reasonData.peripheralMonitorSizeCustom}）`
                                  : reasonData.peripheralMonitorSize
                              }
                            />
                          )}

                          {/* LANケーブル固有 */}
                          {t === "LANケーブル" && (
                            <SummaryRow
                              label="最低限の長さ"
                              value={
                                reasonData.peripheralLanCableLength === "その他"
                                  ? `その他（${reasonData.peripheralLanCableLengthCustom}）`
                                  : reasonData.peripheralLanCableLength
                              }
                            />
                          )}

                        </Stack>
                      </Box>
                    );
                  })}
                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>貸与期間・詳細</Typography>
                  <SummaryRow label="貸与開始日" value={reasonData.lendingStartDate} />
                  <SummaryRow label="返却予定日" value={reasonData.expectedReturnDate} />
                  <SummaryRow label="詳細" value={reasonData.requestDetail} />
                  {message && <Alert severity={message.type}>{message.text}</Alert>}
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 2, pb: 2 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      disabled={isSubmitting}
                      onClick={() => {
                        setMessage(null);
                        setStep("reason");
                      }}
                      sx={{
                        borderRadius: 999,
                        width: 180,
                        height: 46,
                        fontSize: 18,
                        borderColor: "#c9c9c9",
                        color: "#333",
                      }}
                    >
                      入力に戻る
                    </Button>
                    <Button
                      type="button"
                      variant="contained"
                      disabled={isSubmitting}
                      onClick={() => void handleConfirmRegister()}
                      sx={{
                        width: 180,
                        height: 46,
                        borderRadius: 999,
                        backgroundColor: brandColor,
                        fontSize: 18,
                        "&:hover": { backgroundColor: "#006c88" },
                      }}
                    >
                      {isSubmitting ? "登録中..." : "登録"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </>
          )}
    </ItServiceShell>
  );
}
