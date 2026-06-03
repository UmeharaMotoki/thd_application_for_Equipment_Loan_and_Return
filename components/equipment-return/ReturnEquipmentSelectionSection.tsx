"use client";

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { compareIsoDateOnly, parseIsoDateOnly } from "@/lib/dateOnly";
import { brandDatePickerSlotProps } from "@/lib/brandDatePicker";
import type { FormSelectOption } from "@/lib/hooks/useReturnFormSelectOptions";
import {
  RETURN_OTHER_EQUIPMENT_CODE,
  RETURN_SHIPPING_BOX_EQUIPMENT_CODES,
} from "@/lib/returnEquipmentFormConstants";
import type {
  ReturnEquipmentLineForm,
  ReturnEquipmentSelectionState,
} from "@/lib/returnEquipmentSelectionTypes";
import { newReturnEquipmentLine } from "@/lib/returnEquipmentSelectionTypes";

const textFieldRowSx = { ".MuiInputBase-root": { height: 46 } };
const formRowLabelSx = { width: 140, flexShrink: 0, fontSize: 18 } as const;
const formRowFieldCellSx = { flex: 1, minWidth: 220 } as const;
const lineCardSx = {
  border: "1px solid #e8e8e8",
  borderRadius: 1,
  p: 2,
  bgcolor: "#fafafa",
} as const;

type Props = {
  mainItems: FormSelectOption[];
  accessoriesByParentCode: Record<string, FormSelectOption[]>;
  shippingBoxOptions: FormSelectOption[];
  assetNumberLabelByCode: Record<string, string>;
  value: ReturnEquipmentSelectionState;
  onChange: (next: ReturnEquipmentSelectionState) => void;
  disabled?: boolean;
};

function optionsForLine(
  mainItems: FormSelectOption[],
  lines: ReturnEquipmentLineForm[],
  lineId: string,
): FormSelectOption[] {
  const current = lines.find((l) => l.id === lineId);
  const usedElsewhere = new Set(
    lines
      .filter((l) => l.id !== lineId && l.equipmentCode.trim())
      .map((l) => l.equipmentCode.trim()),
  );
  return mainItems.filter((opt) => {
    const code = (opt.code ?? "").trim();
    if (!code) return false;
    if (current?.equipmentCode.trim() === code) return true;
    return !usedElsewhere.has(code);
  });
}

export default function ReturnEquipmentSelectionSection({
  mainItems,
  accessoriesByParentCode,
  shippingBoxOptions,
  assetNumberLabelByCode,
  value,
  onChange,
  disabled = false,
}: Props) {
  const usedCodeCount = value.lines.filter((l) => l.equipmentCode.trim()).length;
  const canAddLine =
    !disabled &&
    value.lines.length < mainItems.length &&
    usedCodeCount < mainItems.filter((m) => (m.code ?? "").trim()).length;

  const updateLine = (lineId: string, patch: Partial<ReturnEquipmentLineForm>) => {
    onChange({
      lines: value.lines.map((row) => {
        if (row.id !== lineId) return row;
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
    });
  };

  const selectEquipment = (lineId: string, opt: FormSelectOption | null) => {
    const code = (opt?.code ?? "").trim();
    const label = opt?.label ?? "";
    updateLine(lineId, {
      equipmentCode: code,
      equipmentLabel: label,
      assetManagementNumber: "",
      shippingBoxChoice: "",
      selectedAccessories: [],
      otherDetail: "",
      lendingDueDate: "",
      expectedReturnDate: "",
    });
  };

  const toggleAccessory = (lineId: string, accessoryLabel: string, checked: boolean) => {
    const line = value.lines.find((l) => l.id === lineId);
    if (!line) return;
    const set = new Set(line.selectedAccessories);
    if (checked) set.add(accessoryLabel);
    else set.delete(accessoryLabel);
    updateLine(lineId, { selectedAccessories: [...set] });
  };

  const removeLine = (lineId: string) => {
    if (value.lines.length <= 1) return;
    onChange({ lines: value.lines.filter((l) => l.id !== lineId) });
  };

  const addLine = () => {
    if (!canAddLine) return;
    onChange({ lines: [...value.lines, newReturnEquipmentLine()] });
  };

  return (
    <Stack spacing={2.5}>
      <Typography sx={{ fontSize: 14, color: "#666" }}>
        ※機器種別ごとに1行ずつ選択してください（同じ種別の重複選択はできません）。プルダウンで選ぶと、直下に入力欄が表示されます。
      </Typography>

      {value.lines.map((line, index) => {
        const code = line.equipmentCode.trim();
        const rowOptions = optionsForLine(mainItems, value.lines, line.id);
        const accessories = code ? (accessoriesByParentCode[code] ?? []) : [];
        const assetLabel = code ? (assetNumberLabelByCode[code] ?? "資産管理番号") : "";
        const showShippingBox = RETURN_SHIPPING_BOX_EQUIPMENT_CODES.has(code);
        const isOther = code === RETURN_OTHER_EQUIPMENT_CODE;
        const hasSelection = code.length > 0;

        return (
          <Box key={line.id} sx={lineCardSx}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1.5 }}>
              機器 {index + 1}
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Typography sx={formRowLabelSx}>
                  機器名称{" "}
                  <Typography component="span" sx={{ color: "#d32f2f" }}>
                    *
                  </Typography>
                </Typography>
                <Box sx={formRowFieldCellSx}>
                  <TextField
                    select
                    required
                    label="選択"
                    value={line.equipmentCode}
                    onChange={(e) => {
                      const nextCode = e.target.value;
                      if (!nextCode) {
                        selectEquipment(line.id, null);
                        return;
                      }
                      const opt = mainItems.find((m) => (m.code ?? "").trim() === nextCode);
                      if (opt) selectEquipment(line.id, opt);
                    }}
                    fullWidth
                    size="small"
                    disabled={disabled}
                    sx={textFieldRowSx}
                  >
                    <MenuItem value="" disabled>
                      選択してください
                    </MenuItem>
                    {rowOptions.map((opt) => (
                      <MenuItem key={(opt.code ?? "").trim()} value={(opt.code ?? "").trim()}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              {hasSelection && (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={formRowLabelSx}>
                      貸与期限{" "}
                      <Typography component="span" sx={{ color: "#d32f2f" }}>
                        *
                      </Typography>
                    </Typography>
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
                        disabled={disabled}
                        views={["year", "month", "day"]}
                        slotProps={brandDatePickerSlotProps}
                        sx={{ width: "100%", maxWidth: "100%" }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={formRowLabelSx}>
                      返却予定日{" "}
                      <Typography component="span" sx={{ color: "#d32f2f" }}>
                        *
                      </Typography>
                    </Typography>
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
                        disabled={disabled}
                        views={["year", "month", "day"]}
                        slotProps={brandDatePickerSlotProps}
                        sx={{ width: "100%", maxWidth: "100%" }}
                      />
                    </Box>
                  </Box>
                </>
              )}

              {hasSelection && isOther && (
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1 }}>
                    返却物 — その他の詳細{" "}
                    <Typography component="span" sx={{ color: "#d32f2f" }}>
                      *
                    </Typography>
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#666", mb: 1 }}>
                    ※複数ある場合は改行で記入
                  </Typography>
                  <TextField
                    value={line.otherDetail}
                    onChange={(e) => updateLine(line.id, { otherDetail: e.target.value })}
                    fullWidth
                    multiline
                    minRows={4}
                    size="small"
                    disabled={disabled}
                    required
                  />
                </Box>
              )}

              {hasSelection && !isOther && (
                <>
                  {accessories.length > 0 && (
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1 }}>
                        付属品
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#666", mb: 1 }}>
                        ※返却する付属品にチェック。欠品がある場合は返却理由の詳細に記載してください。
                      </Typography>
                      <Stack spacing={0.25}>
                        {accessories.map((acc) => (
                          <FormControlLabel
                            key={`${line.id}-${acc.label}`}
                            disabled={disabled}
                            control={
                              <Checkbox
                                checked={line.selectedAccessories.includes(acc.label)}
                                onChange={(e) =>
                                  toggleAccessory(line.id, acc.label, e.target.checked)
                                }
                              />
                            }
                            label={acc.label}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={{ ...formRowLabelSx, width: "auto", maxWidth: "100%" }}>
                      {assetLabel}{" "}
                      <Typography component="span" sx={{ color: "#d32f2f" }}>
                        *
                      </Typography>
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                      <TextField
                        value={line.assetManagementNumber}
                        onChange={(e) =>
                          updateLine(line.id, { assetManagementNumber: e.target.value })
                        }
                        required
                        fullWidth
                        size="small"
                        disabled={disabled}
                        sx={textFieldRowSx}
                      />
                    </Box>
                  </Box>
                  {showShippingBox && shippingBoxOptions.length > 0 && (
                    <FormControl disabled={disabled} required>
                      <FormLabel sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 0.5 }}>
                        返却用梱包箱{" "}
                        <Typography component="span" sx={{ color: "#d32f2f" }}>
                          *
                        </Typography>
                      </FormLabel>
                      <Typography sx={{ fontSize: 13, color: "#666", mb: 1 }}>
                        ※返却用梱包箱が無い場合、ITサービス依頼＞箱関連申請にてご依頼ください。
                      </Typography>
                      <RadioGroup
                        row
                        value={line.shippingBoxChoice}
                        onChange={(e) =>
                          updateLine(line.id, { shippingBoxChoice: e.target.value })
                        }
                      >
                        {shippingBoxOptions.map((box) => (
                          <FormControlLabel
                            key={box.label}
                            value={box.label}
                            control={<Radio size="small" />}
                            label={box.label}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}
                </>
              )}

              {value.lines.length > 1 && (
                <Box>
                  <Button
                    type="button"
                    size="small"
                    color="inherit"
                    disabled={disabled}
                    onClick={() => removeLine(line.id)}
                  >
                    この機器行を削除
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>
        );
      })}

      <Box>
        <Button
          type="button"
          variant="outlined"
          disabled={!canAddLine}
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
    </Stack>
  );
}
