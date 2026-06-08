"use client";

import { Box, Stack, Typography } from "@mui/material";

type Props = {
  items: readonly string[];
};

/** 注意事項ステップ用。折り返し時も本文が揃うハングインデント付き箇条書き */
export default function NoticeBulletList({ items }: Props) {
  return (
    <Stack spacing={1.2} sx={{ pl: "75px", pr: 2 }}>
      {items.map((text) => (
        <Box key={text} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
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
            {text}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
