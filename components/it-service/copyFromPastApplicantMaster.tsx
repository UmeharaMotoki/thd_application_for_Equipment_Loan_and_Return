"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";

export type CopyFromPastEmployeeOption = {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  address: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  employmentType: string | null;
  employeeCategory: string | null;
  occupationName: string | null;
  /** GET /api/master/employees が返す場合のみ */
  retired?: boolean;
};

const textFieldRowSx = { ".MuiInputBase-root": { height: 40 } };

export function useCopyFromPastApplicantMaster(dialogOpen: boolean) {
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmployeeNumber, setApplicantEmployeeNumber] = useState("");
  const [selectedApplicantEmployeeId, setSelectedApplicantEmployeeId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CopyFromPastEmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setApplicantName("");
    setApplicantEmployeeNumber("");
    setSelectedApplicantEmployeeId(null);
    setCandidates([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!dialogOpen) reset();
  }, [dialogOpen, reset]);

  const handleApplicantNameInput = useCallback((value: string) => {
    const hadSelection = selectedApplicantEmployeeId !== null;
    setApplicantName(value);
    setSelectedApplicantEmployeeId(null);
    if (hadSelection || !value.trim()) {
      setApplicantEmployeeNumber("");
    }
  }, [selectedApplicantEmployeeId]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (selectedApplicantEmployeeId) {
      setCandidates([]);
      return;
    }

    const q = normalizeEmployeeSearchInput(applicantName);
    const ac = new AbortController();

    if (q.length < 1) {
      setCandidates([]);
      setLoading(false);
      return () => {
        ac.abort();
      };
    }

    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: CopyFromPastEmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setCandidates([]);
          return;
        }
        setCandidates(data.employees ?? []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      ac.abort();
      setLoading(false);
    };
  }, [applicantName, dialogOpen, selectedApplicantEmployeeId]);

  const applyApplicantFromEmployee = useCallback((emp: CopyFromPastEmployeeOption) => {
    setApplicantName(emp.fullName);
    setApplicantEmployeeNumber(emp.employeeNumber);
    setSelectedApplicantEmployeeId(emp.id);
    setCandidates([]);
  }, []);

  const showApplicantEmployeeField = applicantName.trim().length > 0;
  const showSelect =
    showApplicantEmployeeField && candidates.length >= 1 && !selectedApplicantEmployeeId;

  return {
    applicantName,
    applicantEmployeeNumber,
    selectedApplicantEmployeeId,
    candidates,
    loading,
    showApplicantEmployeeField,
    showSelect,
    handleApplicantNameInput,
    applyApplicantFromEmployee,
    setApplicantEmployeeNumber,
  };
}

type FieldsProps = {
  applicantName: string;
  applicantEmployeeNumber: string;
  selectedApplicantEmployeeId: string | null;
  candidates: CopyFromPastEmployeeOption[];
  loading: boolean;
  showApplicantEmployeeField: boolean;
  showSelect: boolean;
  onApplicantNameChange: (value: string) => void;
  onSelectEmployee: (emp: CopyFromPastEmployeeOption) => void;
  onManualEmployeeNumberChange: (value: string) => void;
};

export function CopyFromPastApplicantMasterFields({
  applicantName,
  applicantEmployeeNumber,
  selectedApplicantEmployeeId,
  candidates,
  loading,
  showApplicantEmployeeField,
  showSelect,
  onApplicantNameChange,
  onSelectEmployee,
  onManualEmployeeNumberChange,
}: FieldsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
        <Box sx={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <TextField
            label="申請者氏名"
            value={applicantName}
            onChange={(e) => onApplicantNameChange(e.target.value)}
            placeholder="氏名の一部で検索（マスタから索引）"
            size="small"
            fullWidth
            required
            sx={textFieldRowSx}
          />
          {loading && (
            <CircularProgress
              size={22}
              sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }}
            />
          )}
        </Box>
        {showApplicantEmployeeField &&
          (showSelect ? (
            <TextField
              label="社員番号（選択）"
              select
              size="small"
              required
              fullWidth
              sx={{ ...textFieldRowSx, flex: "1 1 280px", minWidth: 240 }}
              value=""
              onChange={(e) => {
                const id = e.target.value;
                const emp = candidates.find((c) => c.id === id);
                if (emp) onSelectEmployee(emp);
              }}
            >
              <MenuItem value="" disabled>
                社員番号を選択してください
              </MenuItem>
              {candidates.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.employeeNumber}　{emp.fullName}（{emp.companyName}・{emp.departmentName}）
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="申請者社員番号"
              value={applicantEmployeeNumber}
              onChange={(e) => onManualEmployeeNumberChange(e.target.value)}
              size="small"
              required
              fullWidth
              sx={{ ...textFieldRowSx, flex: "1 1 200px", minWidth: 180 }}
              slotProps={{
                htmlInput: { readOnly: Boolean(selectedApplicantEmployeeId) },
              }}
            />
          ))}
      </Box>
      {showApplicantEmployeeField &&
        !loading &&
        candidates.length === 0 &&
        !selectedApplicantEmployeeId && (
          <Typography sx={{ fontSize: 13, color: "#666" }}>
            該当する社員が見つかりません。社員番号を直接入力してください。
          </Typography>
        )}
    </Box>
  );
}
