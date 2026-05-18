"use client";

import { Box, Typography } from "@mui/material";
import LicenseSpecTreeView from "@/components/LicenseSpecTreeView";
import { buildManagementAndTechnicalTree } from "@/lib/pcSpecDecisionTree";
import { useMemo } from "react";

export default function PcSpecFlowPage() {
  const tree = useMemo(() => buildManagementAndTechnicalTree(), []);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#fff", py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 700, mb: 1, color: "#007D9E" }}>
          PC貸与 判定フロー（参照）
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#666", mb: 3 }}>
          管理社員・技術社員の分岐、仕様①〜④および貸与不可の考え方です。申請画面では利用者区分と判定プロセスに沿って選択します。
        </Typography>

        <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1, color: "#333" }}>
          判定フロー（画像）
        </Typography>
        <Box
          component="img"
          src="/pc-spec-decision-full.png"
          alt="管理社員・技術社員の分岐と仕様①〜④の説明図"
          sx={{ maxWidth: "100%", height: "auto", display: "block", mb: 2 }}
        />

        <Box
          sx={{
            border: "1px solid #d8d8d8",
            borderRadius: 1,
            p: 2,
            backgroundColor: "#fafafa",
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1, color: "#333" }}>
            分岐ツリー（テキスト）
          </Typography>
          <LicenseSpecTreeView nodes={tree} />
        </Box>
      </Box>
    </Box>
  );
}
