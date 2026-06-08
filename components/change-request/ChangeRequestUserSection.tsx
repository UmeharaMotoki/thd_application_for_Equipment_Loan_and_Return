"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";
import type { ChangeRequestUserProfile } from "@/lib/changeRequestFormTypes";
import { changeRequestUserFromEmployee } from "@/lib/changeRequestFormTypes";
import type { EmployeeMasterFields } from "@/lib/lendingUserProfile";
import {
  changeRequestFormRowFieldCellSx,
  changeRequestFormRowLabelSx,
  changeRequestSectionTitleSx,
  changeRequestTextFieldRowSx,
} from "@/components/change-request/changeRequestFormUi";

type EmployeeRow = EmployeeMasterFields & { id: string; retired?: boolean };

type Props = {
  sectionTitle: string;
  profile: ChangeRequestUserProfile;
  onChange: (next: ChangeRequestUserProfile) => void;
  allowCostDeptEdit?: boolean;
};

export default function ChangeRequestUserSection({
  sectionTitle,
  profile,
  onChange,
  allowCostDeptEdit = false,
}: Props) {
  const [searchName, setSearchName] = useState(profile.userName);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchName(profile.userName);
  }, [profile.userName]);

  const applyEmployee = useCallback(
    (emp: EmployeeRow) => {
      onChange(changeRequestUserFromEmployee(emp));
      setSearchName(emp.fullName);
      setSelectedId(emp.id);
      setCandidates([]);
    },
    [onChange],
  );

  useEffect(() => {
    if (selectedId) {
      setCandidates([]);
      return;
    }
    const q = normalizeEmployeeSearchInput(searchName);
    const ac = new AbortController();
    if (q.length < 1) {
      setCandidates([]);
      setLoading(false);
      return () => ac.abort();
    }
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeRow[] };
        if (!ac.signal.aborted) {
          setCandidates(res.ok ? (data.employees ?? []) : []);
        }
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) {
          setCandidates([]);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [searchName, selectedId]);

  const showSelect = searchName.trim().length > 0 && candidates.length >= 1 && !selectedId;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography sx={changeRequestSectionTitleSx}>{sectionTitle}</Typography>
      <Stack spacing={2.2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography sx={changeRequestFormRowLabelSx}>氏名</Typography>
          <Box sx={{ ...changeRequestFormRowFieldCellSx, position: "relative" }}>
            <TextField
              value={searchName}
              onChange={(e) => {
                const hadSelection = selectedId !== null;
                setSearchName(e.target.value);
                setSelectedId(null);
                if (hadSelection || !e.target.value.trim()) {
                  onChange({ ...profile, userName: e.target.value, userEmployeeNumber: "" });
                } else {
                  onChange({ ...profile, userName: e.target.value });
                }
              }}
              placeholder="氏名の一部で検索（マスタから索引）"
              required
              fullWidth
              size="small"
              sx={changeRequestTextFieldRowSx}
            />
            {loading && (
              <CircularProgress
                size={22}
                sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }}
              />
            )}
          </Box>
        </Box>

        {showSelect ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography sx={changeRequestFormRowLabelSx}>社員番号（選択）</Typography>
            <Box sx={changeRequestFormRowFieldCellSx}>
              <TextField
                select
                value={selectedId ?? ""}
                onChange={(e) => {
                  const emp = candidates.find((c) => c.id === e.target.value);
                  if (emp) applyEmployee(emp);
                }}
                required
                fullWidth
                size="small"
                sx={changeRequestTextFieldRowSx}
              >
                {candidates.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.employeeNumber} — {c.fullName}（{c.departmentName}）
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        ) : (
          profile.userEmployeeNumber && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={changeRequestFormRowLabelSx}>社員番号</Typography>
              <Box sx={changeRequestFormRowFieldCellSx}>
                <TextField
                  value={profile.userEmployeeNumber}
                  slotProps={{ htmlInput: { readOnly: true } }}
                  fullWidth
                  size="small"
                  sx={changeRequestTextFieldRowSx}
                />
              </Box>
            </Box>
          )
        )}

        {profile.userEmployeeNumber && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={changeRequestFormRowLabelSx}>所属会社</Typography>
              <Box sx={changeRequestFormRowFieldCellSx}>
                <TextField
                  value={profile.userCompanyName}
                  slotProps={{ htmlInput: { readOnly: true } }}
                  fullWidth
                  size="small"
                  sx={changeRequestTextFieldRowSx}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={changeRequestFormRowLabelSx}>所属部署</Typography>
              <Box sx={changeRequestFormRowFieldCellSx}>
                <TextField
                  value={profile.userDepartmentName}
                  slotProps={{ htmlInput: { readOnly: true } }}
                  fullWidth
                  size="small"
                  sx={changeRequestTextFieldRowSx}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={changeRequestFormRowLabelSx}>経費負担部署名</Typography>
              <Box sx={changeRequestFormRowFieldCellSx}>
                <TextField
                  value={profile.userCostDeptName}
                  onChange={(e) => onChange({ ...profile, userCostDeptName: e.target.value })}
                  slotProps={{ htmlInput: { readOnly: !allowCostDeptEdit } }}
                  fullWidth
                  size="small"
                  sx={changeRequestTextFieldRowSx}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={changeRequestFormRowLabelSx}>経費負担部門コード</Typography>
              <Box sx={changeRequestFormRowFieldCellSx}>
                <TextField
                  value={profile.userCostDeptCode}
                  onChange={(e) => onChange({ ...profile, userCostDeptCode: e.target.value })}
                  slotProps={{ htmlInput: { readOnly: !allowCostDeptEdit } }}
                  fullWidth
                  size="small"
                  sx={changeRequestTextFieldRowSx}
                />
              </Box>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
}
