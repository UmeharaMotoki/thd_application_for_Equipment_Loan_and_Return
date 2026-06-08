"use client";

import { Alert, Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import {
  CHANGE_REQUEST_PC_CONFIRMATION_INTRO,
  CHANGE_REQUEST_PC_CONFIRMATION_ITEMS,
} from "@/lib/changeRequestConstants";
import { changeRequestSectionTitleSx } from "@/components/change-request/changeRequestFormUi";

type Props = {
  selectedEquipment: string[];
};

export function selectedChangeRequestEquipmentIncludesPc(selectedEquipment: string[]): boolean {
  return selectedEquipment.some((label) => {
    const t = label.trim();
    return t === "ノートPC" || t === "デスクトップPC";
  });
}

export default function ChangeRequestPcConfirmationPanel({ selectedEquipment }: Props) {
  if (!selectedChangeRequestEquipmentIncludesPc(selectedEquipment)) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={changeRequestSectionTitleSx}>PC 引き継ぎ条件の確認</Typography>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {CHANGE_REQUEST_PC_CONFIRMATION_INTRO}
      </Alert>
      <List dense sx={{ pl: 1, listStyleType: "disc", "& .MuiListItem-root": { display: "list-item" } }}>
        {CHANGE_REQUEST_PC_CONFIRMATION_ITEMS.map((item) => (
          <ListItem key={item} disablePadding sx={{ py: 0.25 }}>
            <ListItemText
              primary={item}
              slotProps={{ primary: { sx: { fontSize: 16, lineHeight: 1.55 } } }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
