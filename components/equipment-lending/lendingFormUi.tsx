"use client";

import { Box, Link, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from "@mui/material";

const pcInitialTableThSx = {
  fontWeight: 600,
  border: "1px solid #e0e0e0",
  bgcolor: "#f5f5f5",
  width: "58%",
} as const;
const pcInitialTableTdSx = { border: "1px solid #e0e0e0", fontSize: 18 } as const;

export function LendingSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 0.5, alignItems: "flex-start" }}>
      <Typography sx={{ width: 170, flexShrink: 0, color: "#555", fontSize: 16 }}>{label}</Typography>
      <Typography sx={{ fontSize: 16, whiteSpace: "pre-wrap", flex: 1 }}>
        {value.trim() ? value : "—"}
      </Typography>
    </Box>
  );
}

export function PcInitialSettingsTitle() {
  return (
    <Typography sx={{ fontWeight: 600, mb: 0.5 }} component="div">
      PC初期設定
      <Box component="span" sx={{ fontWeight: 400, fontSize: 16 }}>
        （
        <Link
          href="/pc-spec-flow"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: "inherit", fontWeight: 600 }}
        >
          判定フローはこちら
        </Link>
        ）
      </Box>
    </Typography>
  );
}

export function PcInitialSettingsTable({
  userInstall,
  network,
  licenseApply,
}: {
  userInstall: string;
  network: string;
  licenseApply: string;
}) {
  return (
    <TableContainer component={Box} sx={{ mt: 1 }}>
      <Table size="small" sx={{ borderCollapse: "collapse" }}>
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              ユーザーによるソフトウェアのインストール
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{userInstall}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              テクノプロネットワークへの接続
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{network}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              テクノプロ保有ライセンスの適用
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{licenseApply}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
