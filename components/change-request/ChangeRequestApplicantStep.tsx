"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import {
  applicantFromEmployee,
  type ChangeRequestApplicantData,
} from "@/lib/changeRequestFormTypes";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";
import { EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE } from "@/lib/hrPersonnelRetired";

const APPLICANT_DETAIL_FIELDS: Array<{ key: keyof ChangeRequestApplicantData; label: string }> = [
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
  address: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  retired?: boolean;
};

const brandColor = "#007D9E";
const textFieldRowSx = { ".MuiInputBase-root": { height: 46 } };
const formRowLabelSx = { width: 170, flexShrink: 0, fontSize: 18 } as const;
const formRowFieldCellSx = { flex: 1, minWidth: 0 } as const;

const nextButtonSx = {
  width: 180,
  height: 46,
  borderRadius: 999,
  backgroundColor: brandColor,
  fontSize: 18,
  "&:hover": { backgroundColor: "#006c88" },
} as const;

type Props = {
  applicantData: ChangeRequestApplicantData;
  setApplicantData: React.Dispatch<React.SetStateAction<ChangeRequestApplicantData>>;
  isActive: boolean;
  onBack: () => void;
  onNext: () => void;
  onError: (message: string) => void;
};

export default function ChangeRequestApplicantStep({
  applicantData,
  setApplicantData,
  isActive,
  onBack,
  onNext,
  onError,
}: Props) {
  const [applicantCandidates, setApplicantCandidates] = useState<EmployeeOption[]>([]);
  const [selectedApplicantEmployeeId, setSelectedApplicantEmployeeId] = useState<string | null>(null);
  const [applicantSearchLoading, setApplicantSearchLoading] = useState(false);
  const [applicantRetired, setApplicantRetired] = useState(false);
  const [revealApplicantEmployeeField, setRevealApplicantEmployeeField] = useState(false);
  const [revealApplicantDetailFields, setRevealApplicantDetailFields] = useState(false);

  const showApplicantEmployeeField =
    revealApplicantEmployeeField && applicantData.applicantName.trim().length > 0;
  const showApplicantDetailFields =
    revealApplicantDetailFields && applicantData.employeeNumber.trim().length > 0;

  const applyApplicantFromEmployee = useCallback(
    (emp: EmployeeOption) => {
      setApplicantRetired(Boolean(emp.retired));
      setApplicantData(applicantFromEmployee(emp));
      setRevealApplicantEmployeeField(true);
      setRevealApplicantDetailFields(true);
      setSelectedApplicantEmployeeId(emp.id);
      setApplicantCandidates([]);
    },
    [setApplicantData],
  );

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
    if (!isActive) return;
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
        if (!(e instanceof Error && e.name === "AbortError")) {
          setApplicantCandidates([]);
        }
      } finally {
        if (!ac.signal.aborted) setApplicantSearchLoading(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(t);
      ac.abort();
      setApplicantSearchLoading(false);
    };
  }, [applicantData.applicantName, isActive, selectedApplicantEmployeeId]);

  useEffect(() => {
    if (!isActive) return;
    if (selectedApplicantEmployeeId) return;
    const num = applicantData.employeeNumber.trim();
    if (!num || applicantCandidates.length < 1) return;
    const match = applicantCandidates.find((c) => c.employeeNumber.trim() === num);
    if (match) {
      applyApplicantFromEmployee(match);
    }
  }, [
    isActive,
    selectedApplicantEmployeeId,
    applicantData.employeeNumber,
    applicantCandidates,
    applyApplicantFromEmployee,
  ]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, applicantData.employeeNumber]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicantData.employeeNumber.trim()) {
      onError(
        "申請者の社員番号を入力するか、リストから選択してください。社員番号がない場合は本申請ではお手続きいただけません。",
      );
      return;
    }
    if (applicantRetired) {
      onError(EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE);
      return;
    }
    onNext();
  };

  return (
    <>
      <Box>
        <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
          Q. 申請者氏名と社員番号を入力してください
        </Typography>
      </Box>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: "90%", margin: "0 auto" }}>
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
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onBack}
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
            <Button type="submit" variant="contained" disabled={applicantRetired} sx={nextButtonSx}>
              次へ
            </Button>
          </Box>
        </Stack>
      </Box>
    </>
  );
}
