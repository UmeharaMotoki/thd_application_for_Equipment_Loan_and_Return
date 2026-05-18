"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import ItServiceShell from "@/components/it-service/ItServiceShell";
import { useRegisterReturnCopyPrefill } from "@/components/it-service/CopyFromPastProvider";
import { brandDatePickerSlotProps } from "@/lib/brandDatePicker";
import { compareIsoDateOnly, parseIsoDateOnly } from "@/lib/dateOnly";
import { RETURN_EQUIPMENT_NAME_OPTIONS } from "@/lib/equipmentReturnOptions";
import { RETURN_REQUEST_REASON_OPTIONS } from "@/lib/equipmentReturnReasonOptions";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";
import { EQUIPMENT_RETURN_WARNINGS } from "@/lib/equipmentReturnWarnings";
import { RETURN_PREFILL_SESSION_KEY } from "@/lib/copyFromPastConstants";
import type { EquipmentReturnPrefillPayload } from "@/lib/mapEquipmentReturnRequestToPrefill";
import {
  APPLICATION_SELECT_CATEGORIES,
  RETURN_PAGE_FORM_OPTION_CATEGORIES,
  type ApplicationSelectCategory,
} from "@/lib/applicationSelectOptionCategories";
import { useApplicationSelectOptions } from "@/lib/hooks/useApplicationSelectOptions";
import { useEmploymentTypeLabels } from "@/lib/hooks/useEmploymentTypeLabels";

type ApplicantFormData = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
};

type UserFormData = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
};

export type ReturnEquipmentLine = {
  id: string;
  equipmentName: string;
  lendingDueDate: string;
  expectedReturnDate: string;
};

type ReturnReasonFormData = {
  requestReason: string;
  requestDetail: string;
};

type DraftPayload = {
  applicant: ApplicantFormData;
  user: UserFormData;
  lines: ReturnEquipmentLine[];
  returnReason?: ReturnReasonFormData;
};

const DRAFT_KEY = "equipment-return-draft";

const APPLICANT_DETAIL_FIELDS: Array<{ key: keyof ApplicantFormData; label: string }> = [
  { key: "companyName", label: "所属企業名" },
  { key: "departmentName", label: "部署名" },
  { key: "address", label: "住所" },
];

type EmployeeOption = {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  address: string;
  employmentType: string | null;
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
};

const initialUser: UserFormData = {
  userName: "",
  userEmployeeNumber: "",
  userCompanyName: "",
  userDepartmentName: "",
  userAddress: "",
  userContractType: "",
};

const initialReturnReason: ReturnReasonFormData = {
  requestReason: "",
  requestDetail: "",
};

function newLine(): ReturnEquipmentLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    equipmentName: "",
    lendingDueDate: "",
    expectedReturnDate: "",
  };
}

const textFieldRowSx = { ".MuiInputBase-root": { height: 46 } };
const formRowLabelSx = { width: 170, flexShrink: 0, fontSize: 18 } as const;
const formRowFieldCellSx = { flex: 1, minWidth: 0 } as const;

dayjs.locale("ja");

/** 空ボディや HTML エラーでも落ちないようレスポンスを解釈 */
async function parseApiJson(response: Response): Promise<{ id?: string; error?: string }> {
  const text = await response.text();
  if (!text.trim()) {
    return {
      error:
        response.status >= 500
          ? "サーバーから空の応答がありました。DBマイグレーション（requestReason 列など）を実行したか確認してください。"
          : `通信に失敗しました（HTTP ${response.status}）。`,
    };
  }
  try {
    return JSON.parse(text) as { id?: string; error?: string };
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

const brandColor = "#007D9E";

export default function EquipmentReturnApplication() {
  const [step, setStep] = useState<"notice" | "applicant" | "user" | "equipment" | "confirm">(
    "notice",
  );
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const [applicantData, setApplicantData] = useState<ApplicantFormData>(initialApplicant);
  const [userData, setUserData] = useState<UserFormData>(initialUser);
  const [lines, setLines] = useState<ReturnEquipmentLine[]>(() => [newLine()]);
  const [returnReasonData, setReturnReasonData] =
    useState<ReturnReasonFormData>(initialReturnReason);
  const [applicantCandidates, setApplicantCandidates] = useState<EmployeeOption[]>([]);
  const [selectedApplicantEmployeeId, setSelectedApplicantEmployeeId] = useState<string | null>(
    null,
  );
  const [applicantSearchLoading, setApplicantSearchLoading] = useState(false);
  const [userCandidates, setUserCandidates] = useState<EmployeeOption[]>([]);
  const [selectedUserEmployeeId, setSelectedUserEmployeeId] = useState<string | null>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [revealApplicantEmployeeField, setRevealApplicantEmployeeField] = useState(false);
  const [revealApplicantDetailFields, setRevealApplicantDetailFields] = useState(false);
  const [revealUserEmployeeField, setRevealUserEmployeeField] = useState(false);
  const [revealUserDetailFields, setRevealUserDetailFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { labelsByCategory, error: formOptionsError } = useApplicationSelectOptions(
    RETURN_PAGE_FORM_OPTION_CATEGORIES,
  );
  const { labels: employmentTypeLabels, error: employmentTypesError } = useEmploymentTypeLabels();

  const pickOptions = useCallback(
    (cat: ApplicationSelectCategory, fallback: readonly string[]): string[] => {
      const list = labelsByCategory[cat];
      return list && list.length > 0 ? list : [...fallback];
    },
    [labelsByCategory],
  );

  const returnEquipmentNameOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.lendingEquipmentType, RETURN_EQUIPMENT_NAME_OPTIONS),
    [pickOptions],
  );
  const returnRequestReasonOptionsList = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.returnRequestReason, RETURN_REQUEST_REASON_OPTIONS),
    [pickOptions],
  );

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as DraftPayload;
      if (parsed.applicant) setApplicantData({ ...initialApplicant, ...parsed.applicant });
      if (parsed.user) setUserData({ ...initialUser, ...parsed.user });
      if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
        setLines(
          parsed.lines.map((l) => ({
            ...newLine(),
            ...l,
            id: l.id || newLine().id,
          })),
        );
      }
      if (parsed.returnReason) {
        setReturnReasonData({
          requestReason: parsed.returnReason.requestReason ?? "",
          requestDetail: parsed.returnReason.requestDetail ?? "",
        });
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const payload: DraftPayload = {
      applicant: applicantData,
      user: userData,
      lines,
      returnReason: returnReasonData,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [applicantData, userData, lines, returnReasonData]);

  const equipmentStepOk = useMemo(() => {
    if (!returnReasonData.requestReason.trim()) return false;
    for (const line of lines) {
      if (!line.equipmentName.trim()) return false;
      const due = line.lendingDueDate.trim();
      const ret = line.expectedReturnDate.trim();
      if (!due || !ret) return false;
      if (!parseIsoDateOnly(due) || !parseIsoDateOnly(ret)) return false;
      if (compareIsoDateOnly(ret, due) > 0) return false;
    }
    return true;
  }, [lines, returnReasonData.requestReason]);

  const showApplicantEmployeeField =
    revealApplicantEmployeeField && applicantData.applicantName.trim().length > 0;
  const showApplicantDetailFields =
    revealApplicantDetailFields && applicantData.employeeNumber.trim().length > 0;
  const showUserEmployeeField = revealUserEmployeeField && userData.userName.trim().length > 0;
  const showUserDetailFields = revealUserDetailFields && userData.userEmployeeNumber.trim().length > 0;

  const applyApplicantFromEmployee = useCallback((emp: EmployeeOption) => {
    setApplicantData({
      applicantName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      companyName: emp.companyName,
      departmentName: emp.departmentName,
      address: emp.address,
    });
    setRevealApplicantEmployeeField(true);
    setRevealApplicantDetailFields(true);
    setSelectedApplicantEmployeeId(emp.id);
    setApplicantCandidates([]);
  }, []);

  const handleApplicantNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
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
      return () => ac.abort();
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

  const applyUserFromEmployee = useCallback((emp: EmployeeOption) => {
    setUserData({
      userName: emp.fullName,
      userEmployeeNumber: emp.employeeNumber,
      userCompanyName: emp.companyName,
      userDepartmentName: emp.departmentName,
      userAddress: emp.address,
      userContractType: emp.employmentType ?? "",
    });
    setRevealUserEmployeeField(true);
    setRevealUserDetailFields(true);
    setSelectedUserEmployeeId(emp.id);
    setUserCandidates([]);
  }, []);

  const handleUserNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
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
        };
      }
      return { ...prev, userName: value };
    });
    setSelectedUserEmployeeId(null);
  };

  useEffect(() => {
    if (step !== "user") return;
    if (selectedUserEmployeeId) {
      setUserCandidates([]);
      return;
    }
    const q = normalizeEmployeeSearchInput(userData.userName);
    const ac = new AbortController();
    if (q.length < 1) {
      setUserCandidates([]);
      setUserSearchLoading(false);
      return () => ac.abort();
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
  }, [userData.userName, step, selectedUserEmployeeId]);

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
    setStep("user");
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
    setStep("equipment");
  };

  const buildReturnRequestBody = () => ({
    ...applicantData,
    ...userData,
    requestReason: returnReasonData.requestReason,
    requestDetail: returnReasonData.requestDetail,
    lines: lines.map(({ equipmentName, lendingDueDate, expectedReturnDate }) => ({
      equipmentName,
      lendingDueDate,
      expectedReturnDate,
    })),
  });

  const handleEquipmentContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!equipmentStepOk) {
      setMessage({
        type: "error",
        text: "申請理由・各機器の名称・貸与期限・返却予定日を入力し、返却予定日は貸与期限以前にしてください。",
      });
      return;
    }
    setStep("confirm");
  };

  const handleConfirmRegister = async () => {
    setMessage(null);
    if (!applicantData.employeeNumber.trim() || !userData.userEmployeeNumber.trim()) {
      setMessage({
        type: "error",
        text: "申請者・利用者の双方に社員番号が必要です。社員番号がない場合は本申請ではお手続きいただけません。",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/equipment-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReturnRequestBody()),
      });
      const data = await parseApiJson(response);
      if (!response.ok) {
        throw new Error(data.error ?? "登録に失敗しました。");
      }
      setMessage({ type: "success", text: "機器返却申請を登録しました。" });
      setApplicantData(initialApplicant);
      setUserData(initialUser);
      setLines([newLine()]);
      setReturnReasonData(initialReturnReason);
      setApplicantCandidates([]);
      setSelectedApplicantEmployeeId(null);
      setUserCandidates([]);
      setSelectedUserEmployeeId(null);
      setRevealApplicantEmployeeField(false);
      setRevealApplicantDetailFields(false);
      setRevealUserEmployeeField(false);
      setRevealUserDetailFields(false);
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

  const applyReturnPrefillFromPast = useCallback((prefill: EquipmentReturnPrefillPayload) => {
    setApplicantData(prefill.applicant);
    setUserData(prefill.user);
    setLines(prefill.lines.length > 0 ? prefill.lines : [newLine()]);
    setReturnReasonData(prefill.returnReason);
    setRevealApplicantEmployeeField(true);
    setRevealApplicantDetailFields(true);
    setRevealUserEmployeeField(true);
    setRevealUserDetailFields(true);
    setSelectedApplicantEmployeeId(null);
    setSelectedUserEmployeeId(null);
    setApplicantCandidates([]);
    setUserCandidates([]);
    setNoticeAgreed(true);
    setStep("applicant");
    setMessage({
      type: "success",
      text: "過去の申請を再利用しました。各機器の日付を入力し直し、内容を確認してから登録してください。",
    });
  }, []);

  useRegisterReturnCopyPrefill(applyReturnPrefillFromPast);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(RETURN_PREFILL_SESSION_KEY);
    if (!raw) return;
    sessionStorage.removeItem(RETURN_PREFILL_SESSION_KEY);
    try {
      applyReturnPrefillFromPast(JSON.parse(raw) as EquipmentReturnPrefillPayload);
    } catch {
      /* ignore */
    }
  }, [applyReturnPrefillFromPast]);

  const updateLine = (id: string, patch: Partial<ReturnEquipmentLine>) => {
    setLines((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        const due = next.lendingDueDate.trim();
        const ret = next.expectedReturnDate.trim();
        if (due && ret && parseIsoDateOnly(due) && parseIsoDateOnly(ret)) {
          if (compareIsoDateOnly(ret, due) > 0) {
            return { ...next, expectedReturnDate: "" };
          }
        }
        return next;
      }),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <ItServiceShell activeMenu="return" mainTitle="ITサービス依頼　機器返却 申請">
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
              {EQUIPMENT_RETURN_WARNINGS.map((warning) => (
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
                      "&.Mui-checked": { color: "#007D9E" },
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
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
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
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
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
              Q. 返却する機器を入力してください（複数台ある場合は「機器を追加」で行を増やせます）
            </Typography>
            <Box component="form" onSubmit={handleEquipmentContinue} sx={{ width: "95%", margin: "0 auto" }}>
              <Stack spacing={2.5}>
                {lines.map((line, index) => (
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
                    <Stack spacing={2}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Typography sx={{ ...formRowLabelSx, width: 140 }}>機器名称</Typography>
                        <Box sx={{ ...formRowFieldCellSx, minWidth: 220 }}>
                          <TextField
                            select
                            required
                            label="選択"
                            value={line.equipmentName}
                            onChange={(e) => updateLine(line.id, { equipmentName: e.target.value })}
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                          >
                            <MenuItem value="" disabled>
                              選択してください
                            </MenuItem>
                            {returnEquipmentNameOptions.map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Typography sx={{ ...formRowLabelSx, width: 140 }}>貸与期限</Typography>
                        <Box sx={{ ...formRowFieldCellSx, minWidth: 200, maxWidth: 360 }}>
                          <DatePicker
                            format="YYYY-MM-DD"
                            value={line.lendingDueDate ? dayjs(line.lendingDueDate) : null}
                            onChange={(v) =>
                              updateLine(line.id, {
                                lendingDueDate:
                                  v != null && v.isValid() ? v.format("YYYY-MM-DD") : "",
                              })
                            }
                            views={["year", "month", "day"]}
                            slotProps={brandDatePickerSlotProps}
                            sx={{ width: "100%", maxWidth: "100%" }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Typography sx={{ ...formRowLabelSx, width: 140 }}>返却予定日</Typography>
                        <Box sx={{ ...formRowFieldCellSx, minWidth: 200, maxWidth: 360 }}>
                          <DatePicker
                            format="YYYY-MM-DD"
                            value={line.expectedReturnDate ? dayjs(line.expectedReturnDate) : null}
                            onChange={(v) =>
                              updateLine(line.id, {
                                expectedReturnDate:
                                  v != null && v.isValid() ? v.format("YYYY-MM-DD") : "",
                              })
                            }
                            maxDate={
                              line.lendingDueDate ? dayjs(line.lendingDueDate) : undefined
                            }
                            views={["year", "month", "day"]}
                            slotProps={brandDatePickerSlotProps}
                            sx={{ width: "100%", maxWidth: "100%" }}
                          />
                        </Box>
                      </Box>
                      {lines.length > 1 && (
                        <Box>
                          <Button type="button" size="small" color="inherit" onClick={() => removeLine(line.id)}>
                            この機器行を削除
                          </Button>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                ))}
                <Box>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={addLine}
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={formRowLabelSx}>申請理由</Typography>
                  <Box sx={formRowFieldCellSx}>
                    <TextField
                      select
                      value={returnReasonData.requestReason}
                      onChange={(e) =>
                        setReturnReasonData((prev) => ({ ...prev, requestReason: e.target.value }))
                      }
                      required
                      fullWidth
                      size="small"
                      sx={textFieldRowSx}
                    >
                      <MenuItem value="" disabled>
                        選択してください
                      </MenuItem>
                      {returnRequestReasonOptionsList.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Typography sx={{ ...formRowLabelSx, pt: 0.5 }}>詳細</Typography>
                  <Box sx={formRowFieldCellSx}>
                    <TextField
                      value={returnReasonData.requestDetail}
                      onChange={(e) =>
                        setReturnReasonData((prev) => ({ ...prev, requestDetail: e.target.value }))
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
                {message && <Alert severity={message.type}>{message.text}</Alert>}
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setStep("user")}
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
                    確認へ
                  </Button>
                </Box>
              </Stack>
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
                <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>利用者</Typography>
                <SummaryRow label="氏名" value={userData.userName} />
                <SummaryRow label="社員番号" value={userData.userEmployeeNumber} />
                <SummaryRow label="所属企業名" value={userData.userCompanyName} />
                <SummaryRow label="部署名" value={userData.userDepartmentName} />
                <SummaryRow label="住所" value={userData.userAddress} />
                <SummaryRow label="契約形態" value={userData.userContractType} />
                <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>申請内容</Typography>
                <SummaryRow label="申請理由" value={returnReasonData.requestReason} />
                <SummaryRow label="詳細" value={returnReasonData.requestDetail} />
                <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>返却機器</Typography>
                {lines.map((line, index) => (
                  <Box
                    key={line.id}
                    sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1.5, bgcolor: "#fafafa" }}
                  >
                    <Typography sx={{ fontWeight: 600, mb: 1 }}>機器 {index + 1}</Typography>
                    <SummaryRow label="機器名称" value={line.equipmentName} />
                    <SummaryRow label="貸与期限" value={line.lendingDueDate} />
                    <SummaryRow label="返却予定日" value={line.expectedReturnDate} />
                  </Box>
                ))}
                {message && <Alert severity={message.type}>{message.text}</Alert>}
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 2, pb: 2 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={isSubmitting}
                    onClick={() => {
                      setMessage(null);
                      setStep("equipment");
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
    </LocalizationProvider>
  );
}
