"use client";

import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { LendingEquipmentUserBlockInfo } from "@/lib/lendingEquipmentUserBlocks";
import { linesForUser } from "@/lib/lendingEquipmentUserBlocks";

export type LendingEquipmentLine = {
  id: string;
  equipmentType: string;
  assignedUserEmployeeNumber: string;
};

type Props = {
  blocks: LendingEquipmentUserBlockInfo[];
  lendingLines: LendingEquipmentLine[];
  representativeEmployeeNumber: string;
  equipmentTypeOptions: readonly string[];
  onAddLine: (employeeNumber: string) => void;
  onRemoveLine: (id: string) => void;
  onUpdateLine: (id: string, patch: Partial<LendingEquipmentLine>) => void;
  textFieldRowSx: object;
  formRowLabelSx: object;
  formRowFieldCellSx: object;
};

export default function LendingEquipmentByUserBlock({
  blocks,
  lendingLines,
  representativeEmployeeNumber,
  equipmentTypeOptions,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  textFieldRowSx,
  formRowLabelSx,
  formRowFieldCellSx,
}: Props) {
  if (blocks.length === 0) {
    return (
      <Typography sx={{ fontSize: 14, color: "#666" }}>
        利用者ステップで代表利用者の社員番号を入力してから、機器を選択してください。
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      {blocks.map((block) => {
        const userLines = linesForUser(
          lendingLines,
          block.employeeNumber,
          representativeEmployeeNumber,
        );

        return (
          <Box
            key={block.employeeNumber}
            sx={{
              border: "1px solid #e8e8e8",
              borderRadius: 1,
              p: 2,
              bgcolor: "#fafafa",
            }}
          >
            <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>
              {block.userName}
              <Typography component="span" sx={{ fontSize: 14, fontWeight: 400, color: "#555", ml: 1 }}>
                （{block.roleLabel}） {block.employeeNumber}
              </Typography>
            </Typography>
            {(block.userCompanyName || block.userDepartmentName) && (
              <Typography sx={{ fontSize: 13, color: "#666", mb: 1.5 }}>
                {block.userCompanyName}
                {block.userCompanyName && block.userDepartmentName ? " / " : ""}
                {block.userDepartmentName}
              </Typography>
            )}

            <Stack spacing={1.5}>
              {userLines.map((line, lineIndex) => (
                <Box
                  key={line.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography sx={{ ...formRowLabelSx, width: 100 }}>
                    機器 {lineIndex + 1}
                  </Typography>
                  <Box sx={{ ...formRowFieldCellSx, minWidth: 220, flex: 1 }}>
                    <TextField
                      select
                      required
                      label="機器の種類"
                      value={line.equipmentType}
                      onChange={(e) =>
                        onUpdateLine(line.id, { equipmentType: e.target.value })
                      }
                      fullWidth
                      size="small"
                      sx={textFieldRowSx}
                    >
                      <MenuItem value="" disabled>
                        選択してください
                      </MenuItem>
                      {equipmentTypeOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  {userLines.length > 1 && (
                    <Button
                      type="button"
                      size="small"
                      color="inherit"
                      onClick={() => onRemoveLine(line.id)}
                    >
                      この行を削除
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>

            <Box sx={{ mt: 1.5 }}>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => onAddLine(block.employeeNumber)}
                sx={{
                  borderRadius: 999,
                  borderColor: "#c9c9c9",
                  color: "#333",
                }}
              >
                この利用者に機器を追加
              </Button>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
