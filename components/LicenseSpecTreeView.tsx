"use client";

import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { SpecTreeNode } from "@/lib/licenseSpecTree";

export default function LicenseSpecTreeView({ nodes }: { nodes: SpecTreeNode[] }) {
  const renderNodes = (list: SpecTreeNode[], depth: number): ReactNode =>
    list.map((node, idx) => (
      <Box component="li" key={`${depth}-${idx}`} sx={{ listStyle: "none", mt: depth ? 0.5 : 0.8 }}>
        <Typography
          sx={{
            fontSize: depth === 0 ? 15 : 14,
            fontWeight: depth === 0 ? 600 : 400,
            color: depth === 0 ? "#007D9E" : "#333",
          }}
        >
          {(depth === 0 ? "● " : "・ ") + node.label}
        </Typography>
        {node.children && node.children.length > 0 && (
          <Box
            component="ul"
            sx={{ m: 0, pl: 2.5, mt: 0.5, borderLeft: "2px solid #e8e8e8" }}
          >
            {renderNodes(node.children, depth + 1)}
          </Box>
        )}
      </Box>
    ));

  return (
    <Box component="ul" sx={{ m: 0, p: 0 }}>
      {renderNodes(nodes, 0)}
    </Box>
  );
}
