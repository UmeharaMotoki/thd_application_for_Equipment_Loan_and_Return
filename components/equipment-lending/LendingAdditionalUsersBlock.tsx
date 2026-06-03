"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  affiliationWarningMessage,
  isSameAffiliation,
} from "@/lib/lendingAdditionalUserAffiliation";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";
import {
  emptyLendingUserProfile,
  lendingUserProfileFromEmployee,
  type LendingUserProfile,
} from "@/lib/lendingUserProfile";

export type AdditionalUserRow = { id: string } & LendingUserProfile;

type EmployeeOption = {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  departmentCode?: string | null;
  address?: string;
  employmentType?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeCategory?: string | null;
  occupationName?: string | null;
};

type RowEditorProps = {
  row: AdditionalUserRow;
  index: number;
  representative: { userCompanyName: string; userDepartmentName: string };
  onChange: (patch: Partial<AdditionalUserRow>) => void;
  onRemove: () => void;
  textFieldRowSx: object;
  formRowLabelSx: object;
  formRowFieldCellSx: object;
};

function AdditionalUserRowEditor({
  row,
  index,
  representative,
  onChange,
  onRemove,
  textFieldRowSx,
  formRowLabelSx,
  formRowFieldCellSx,
}: RowEditorProps) {
  const [candidates, setCandidates] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const showEmployeeField = row.userName.trim().length > 0;

  const applyFromEmployee = useCallback(
    (emp: EmployeeOption) => {
      setSelectedEmployeeId(emp.id);
      setCandidates([]);
      onChange(lendingUserProfileFromEmployee(emp));
    },
    [onChange],
  );

  const handleNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
    setSelectedEmployeeId(null);
    setCandidates([]);
    if (!hasValue) {
      onChange({ ...emptyLendingUserProfile(), userName: value });
      return;
    }
    onChange({
      ...emptyLendingUserProfile(),
      userName: value,
    });
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      setCandidates([]);
      return;
    }

    const q = normalizeEmployeeSearchInput(row.userName);
    const ac = new AbortController();

    if (q.length < 1) {
      setCandidates([]);
      setSearchLoading(false);
      return () => {
        ac.abort();
      };
    }

    setSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setCandidates([]);
          return;
        }
        setCandidates(data.employees ?? []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setSearchLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      ac.abort();
      setSearchLoading(false);
    };
  }, [row.userName, selectedEmployeeId]);

  /** プリフィル等で社員番号のみ入っている場合、候補から確定 */
  useEffect(() => {
    if (selectedEmployeeId) return;
    const num = row.userEmployeeNumber.trim();
    if (!num || candidates.length < 1) return;
    const match = candidates.find((c) => c.employeeNumber.trim() === num);
    if (match) {
      applyFromEmployee(match);
    }
  }, [row.userEmployeeNumber, candidates, selectedEmployeeId, applyFromEmployee]);

  /** 氏名検索を経ず社員番号だけ入っている場合 */
  useEffect(() => {
    if (selectedEmployeeId) return;
    const num = row.userEmployeeNumber.trim();
    if (!num || row.userName.trim()) return;

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(num)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) return;
        const match = (data.employees ?? []).find((e) => e.employeeNumber.trim() === num);
        if (match) {
          applyFromEmployee(match);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }, 300);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [row.userEmployeeNumber, row.userName, selectedEmployeeId, applyFromEmployee]);

  const affiliationWarning =
    row.userName.trim() &&
    row.userEmployeeNumber.trim() &&
    !isSameAffiliation(representative, {
      userCompanyName: row.userCompanyName,
      userDepartmentName: row.userDepartmentName,
    })
      ? affiliationWarningMessage(row.userName, representative, {
          userCompanyName: row.userCompanyName,
          userDepartmentName: row.userDepartmentName,
        })
      : null;

  return (
    <Box
      sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
        追加利用者 {index + 1}
      </Typography>
      {affiliationWarning && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {affiliationWarning}
        </Alert>
      )}
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography sx={{ ...formRowLabelSx, width: 140 }}>氏名</Typography>
          <Box sx={{ ...formRowFieldCellSx, minWidth: 280, position: "relative" }}>
            <TextField
              required
              size="small"
              fullWidth
              value={row.userName}
              onChange={(e) => handleNameInput(e.target.value)}
              placeholder="氏名の一部で検索（マスタから索引）"
              sx={textFieldRowSx}
            />
            {searchLoading && (
              <CircularProgress
                size={22}
                sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }}
              />
            )}
          </Box>
        </Box>

        {showEmployeeField &&
          (candidates.length >= 1 && !selectedEmployeeId ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography sx={{ ...formRowLabelSx, width: 140 }}>社員番号（選択）</Typography>
              <Box sx={{ ...formRowFieldCellSx, minWidth: 280 }}>
                <TextField
                  select
                  required
                  size="small"
                  fullWidth
                  value={selectedEmployeeId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const emp = candidates.find((c) => c.id === id);
                    if (emp) applyFromEmployee(emp);
                  }}
                  sx={textFieldRowSx}
                >
                  <MenuItem value="" disabled>
                    社員番号を選択してください
                  </MenuItem>
                  {candidates.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.employeeNumber}　{emp.fullName}（{emp.companyName}・
                      {emp.departmentName}）
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography sx={{ ...formRowLabelSx, width: 140 }}>社員番号</Typography>
              <Box sx={{ ...formRowFieldCellSx, minWidth: 200 }}>
                <TextField
                  required
                  size="small"
                  fullWidth
                  value={row.userEmployeeNumber}
                  onChange={(e) => {
                    onChange({ userEmployeeNumber: e.target.value });
                    setSelectedEmployeeId(null);
                  }}
                  sx={textFieldRowSx}
                  slotProps={{
                    htmlInput: { readOnly: Boolean(selectedEmployeeId) },
                  }}
                />
              </Box>
            </Box>
          ))}

        {showEmployeeField &&
          !searchLoading &&
          candidates.length === 0 &&
          !selectedEmployeeId &&
          row.userName.trim().length > 0 && (
            <Typography sx={{ pl: "156px", fontSize: 14, color: "#666" }}>
              該当する社員が見つかりません。社員番号を直接入力してください。
            </Typography>
          )}

        {(row.userCompanyName || row.userDepartmentName) && row.userEmployeeNumber.trim() && (
          <Typography sx={{ fontSize: 13, color: "#555", pl: "156px" }}>
            {row.userCompanyName} / {row.userDepartmentName}
          </Typography>
        )}
      </Stack>
      <Box sx={{ mt: 1 }}>
        <Button type="button" size="small" color="inherit" onClick={onRemove}>
          この行を削除
        </Button>
      </Box>
    </Box>
  );
}

type Props = {
  rows: AdditionalUserRow[];
  representative: { userCompanyName: string; userDepartmentName: string };
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<AdditionalUserRow>) => void;
  textFieldRowSx: object;
  formRowLabelSx: object;
  formRowFieldCellSx: object;
};

export default function LendingAdditionalUsersBlock({
  rows,
  representative,
  onAdd,
  onRemove,
  onChange,
  textFieldRowSx,
  formRowLabelSx,
  formRowFieldCellSx,
}: Props) {
  return (
    <Stack spacing={2}>
      <Typography sx={{ fontSize: 16, fontWeight: 600 }}>追加利用者</Typography>
      {rows.map((row, index) => (
        <AdditionalUserRowEditor
          key={row.id}
          row={row}
          index={index}
          representative={representative}
          onChange={(patch) => onChange(row.id, patch)}
          onRemove={() => onRemove(row.id)}
          textFieldRowSx={textFieldRowSx}
          formRowLabelSx={formRowLabelSx}
          formRowFieldCellSx={formRowFieldCellSx}
        />
      ))}
      <Button type="button" variant="outlined" onClick={onAdd} sx={{ alignSelf: "flex-start" }}>
        追加利用者を追加
      </Button>
    </Stack>
  );
}
