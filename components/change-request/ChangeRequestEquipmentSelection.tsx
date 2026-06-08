"use client";

import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import {
  changeRequestBrandColor,
  changeRequestFormRowFieldCellSx,
  changeRequestFormRowLabelSx,
  changeRequestTextFieldRowSx,
} from "@/components/change-request/changeRequestFormUi";
import type { EquipmentOption } from "@/lib/hooks/useChangeRequestEquipmentOptions";

type Props = {
  options: EquipmentOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  loading: boolean;
  error: string | null;
  disabled?: boolean;
};

export default function ChangeRequestEquipmentSelection({
  options,
  selected,
  onChange,
  loading,
  error,
  disabled = false,
}: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Typography sx={{ ...changeRequestFormRowLabelSx, pt: 1.1 }}>対象機器</Typography>
        <Box sx={changeRequestFormRowFieldCellSx}>
          {loading ? (
            <CircularProgress size={28} sx={{ color: changeRequestBrandColor, mt: 0.5 }} />
          ) : (
            <TextField
              select
              required
              fullWidth
              size="small"
              disabled={disabled || options.length === 0}
              value={selected}
              onChange={(e) => {
                const value = e.target.value;
                onChange(typeof value === "string" ? value.split(",") : value);
              }}
              helperText="複数選択できます"
              sx={changeRequestTextFieldRowSx}
              slotProps={{
                select: {
                  multiple: true,
                  displayEmpty: true,
                  renderValue: (value) => {
                    const labels = value as string[];
                    if (labels.length === 0) return "選択してください";
                    return labels.join("、");
                  },
                },
              }}
            >
              <MenuItem value="" disabled>
                選択してください
              </MenuItem>
              {options.map((opt) => (
                <MenuItem key={opt.label} value={opt.label}>
                  <Checkbox
                    checked={selected.includes(opt.label)}
                    sx={{ color: changeRequestBrandColor, "&.Mui-checked": { color: changeRequestBrandColor } }}
                  />
                  <ListItemText primary={opt.label} />
                </MenuItem>
              ))}
            </TextField>
          )}
          {!loading && !error && options.length === 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              対象機器の選択肢が登録されていません。DB マスタ（change_request_equipment_type）を投入してください。
            </Alert>
          )}
          {error && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {error}
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
}
