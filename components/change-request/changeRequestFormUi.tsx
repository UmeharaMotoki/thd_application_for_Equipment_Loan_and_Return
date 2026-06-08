"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";

/** 変更依頼フォーム共通レイアウト（申請者・詳細で揃える） */
export const changeRequestFormBodySx = { width: "90%", mx: "auto" } as const;

export const changeRequestBrandColor = "#007D9E";

export const changeRequestSectionTitleSx = {
  fontSize: 20,
  fontWeight: 600,
  mb: 2,
  color: changeRequestBrandColor,
} as const;

export const changeRequestFormRowLabelSx = {
  width: 170,
  flexShrink: 0,
  fontSize: 18,
} as const;

export const changeRequestFormRowFieldCellSx = {
  flex: 1,
  minWidth: 0,
  maxWidth: 420,
} as const;

export const changeRequestTextFieldRowSx = {
  ".MuiInputBase-root": { height: 46 },
} as const;

/** ラベル列と入力列の開始位置にチェックボックス等を揃える */
export const changeRequestFormFieldColumnSx = {
  display: "flex",
  gap: 2,
} as const;

export function ChangeRequestFormFieldColumn({ children }: { children: ReactNode }) {
  return (
    <Box sx={changeRequestFormFieldColumnSx}>
      <Box sx={{ width: 170, flexShrink: 0 }} aria-hidden />
      <Box sx={changeRequestFormRowFieldCellSx}>{children}</Box>
    </Box>
  );
}
