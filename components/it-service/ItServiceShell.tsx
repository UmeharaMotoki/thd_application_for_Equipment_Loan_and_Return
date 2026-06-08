"use client";

import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Button, IconButton, Stack, SvgIcon, Typography } from "@mui/material";
import { useCopyFromPastBridgeOptional } from "@/components/it-service/CopyFromPastProvider";
import { useItServiceTabOptional } from "@/components/it-service/ItServiceTabContext";
import { removeNamedRequestArchive } from "@/lib/namedRequestArchives";

const BRAND = "#007D9E";
const BRAND_HOVER = "#006c88";

const menuButtonBase = {
  width: 170,
  height: 42,
  borderRadius: 999,
  fontSize: 18,
  minHeight: 0,
  textTransform: "none" as const,
  boxShadow: "none",
  transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
};

/** いま申請中のメニュー：白背景・文字と枠 #007D9E */
const menuButtonActiveSx = {
  ...menuButtonBase,
  backgroundColor: "#ffffff",
  color: BRAND,
  border: `2px solid ${BRAND}`,
  "&:hover": {
    backgroundColor: "#f0f8fa",
    color: BRAND,
    borderColor: BRAND,
    boxShadow: "none",
  },
};

/** もう一方：ブランド色塗り・白文字・ホバーで明確に反応 */
const menuButtonInactiveSx = {
  ...menuButtonBase,
  backgroundColor: BRAND,
  color: "#ffffff",
  border: `2px solid ${BRAND}`,
  "&:hover": {
    backgroundColor: BRAND_HOVER,
    borderColor: BRAND_HOVER,
    color: "#ffffff",
    boxShadow: "none",
  },
};

export type ItServiceActiveMenu = "lending" | "return" | "change-request";

type ItServiceShellProps = {
  activeMenu: ItServiceActiveMenu;
  mainTitle: string;
  children: ReactNode;
};

export default function ItServiceShell({ activeMenu, mainTitle, children }: ItServiceShellProps) {
  const copyBridge = useCopyFromPastBridgeOptional();
  const tabBridge = useItServiceTabOptional();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const isLendingReturnRoute =
    pathname.startsWith("/equipment-lending") || pathname.startsWith("/equipment-return");

  const menu: ItServiceActiveMenu = pathname.startsWith("/change-request")
    ? "change-request"
    : pathname.startsWith("/equipment-return")
      ? "return"
      : pathname.startsWith("/equipment-lending")
        ? "lending"
        : activeMenu;

  const goLending = () => {
    if (isLendingReturnRoute && tabBridge) {
      tabBridge.switchTab("lending");
      return;
    }
    router.push("/equipment-lending");
  };

  const goReturn = () => {
    if (isLendingReturnRoute && tabBridge) {
      tabBridge.switchTab("return");
      return;
    }
    router.push("/equipment-return");
  };

  const goChangeRequest = () => {
    router.push("/change-request");
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <Box
        sx={{
          backgroundColor: BRAND,
          height: 74,
          display: "flex",
          alignItems: "center",
          px: 3,
        }}
      >
        <Box
          component="img"
          src="/api/logo"
          alt="TECHNOPRO TalentCUBE ポータル"
          sx={{ height: 48, width: "auto", display: "block" }}
        />
      </Box>
      <Box sx={{ width: 1280, maxWidth: "96vw", mx: "auto", pt: 6, pb: 6, display: "flex", gap: 3 }}>
        <Stack spacing={2} sx={{ width: 280, alignSelf: "flex-start" }}>
          <Box
            sx={{
              minHeight: 290,
              border: "1px solid #d8d8d8",
              backgroundColor: "#fff",
              px: 2.5,
              py: 3,
            }}
          >
            <Typography sx={{ textAlign: "center", fontSize: 24, lineHeight: 1.2, mb: 1.6 }}>
              ITサービス依頼
            </Typography>
            <Box sx={{ borderTop: "1px solid #d9d9d9", mb: 2 }} />
            <Stack spacing={2.2} sx={{ alignItems: "center" }}>
              <Button
                type="button"
                variant="contained"
                disableElevation
                onClick={goLending}
                sx={menu === "lending" ? menuButtonActiveSx : menuButtonInactiveSx}
              >
                機器貸与 申請
              </Button>
              <Button
                type="button"
                variant="contained"
                disableElevation
                onClick={goReturn}
                sx={menu === "return" ? menuButtonActiveSx : menuButtonInactiveSx}
              >
                機器返却 申請
              </Button>
              <Button
                type="button"
                variant="contained"
                disableElevation
                onClick={goChangeRequest}
                sx={menu === "change-request" ? menuButtonActiveSx : menuButtonInactiveSx}
              >
                変更依頼 申請
              </Button>
            </Stack>
          </Box>
          {copyBridge && (
            <Box
              sx={{
                border: "1px solid #d8d8d8",
                backgroundColor: "#fff",
                px: 1.5,
                py: 2.2,
              }}
            >
              <Typography sx={{ textAlign: "center", fontSize: 24, lineHeight: 1.2, mb: 1.6 }}>
                申請一覧
              </Typography>
              <Box sx={{ borderTop: "1px solid #d9d9d9", mb: 1.5 }} />
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  onClick={() =>
                    menu === "lending"
                      ? copyBridge.openLendingCopyDialog()
                      : copyBridge.openReturnCopyDialog()
                  }
                  sx={menuButtonInactiveSx}
                >
                  過去の申請
                </Button>
              </Box>
              <Typography
                component="h3"
                sx={{
                  textAlign: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#333",
                  mt: 4,
                  mb: 1,
                  lineHeight: 1.3,
                }}
              >
                テンプレート一覧
              </Typography>
              <Box sx={{ borderTop: "1px solid #e8e8e8", mb: 1 }} />
              <Stack spacing={0}>
                {copyBridge.archives.length === 0 ? (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#999",
                      textAlign: "center",
                      py: 1,
                      whiteSpace: "pre-line",
                      lineHeight: 1.5,
                    }}
                  >
                    {"保存済みテンプレートはありません。\n過去の申請から保存してください。"}
                  </Typography>
                ) : (
                  copyBridge.archives.map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #8cb9c8",
                        backgroundColor: "#d3e8ef",
                        mt: "-1px",
                      }}
                    >
                      <Button
                        type="button"
                        size="small"
                        aria-label={`${a.kind === "lending" ? "貸与" : "返却"}テンプレート「${a.label}」を再利用（申請者社員番号 ${a.applicantEmployeeNumber}）`}
                        onClick={() =>
                          void copyBridge.applyFromNamedArchive(a).catch((err: unknown) => {
                            const msg = err instanceof Error ? err.message : "取得に失敗しました。";
                            window.alert(msg);
                          })
                        }
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          justifyContent: "center",
                          textTransform: "none",
                          fontSize: 13,
                          lineHeight: 1.35,
                          color: "#333",
                          py: 0.75,
                        }}
                      >
                        {a.label}から再利用
                      </Button>
                      <IconButton
                        type="button"
                        size="small"
                        aria-label="テンプレートを削除"
                        onClick={() => {
                          removeNamedRequestArchive(a.id);
                          copyBridge.refreshArchives();
                        }}
                        sx={{
                          color: "#666",
                          backgroundColor: "#ffffff",
                          borderRadius: 0,
                          "&:hover": { backgroundColor: "#f5f5f5" },
                        }}
                      >
                        <SvgIcon fontSize="small" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </SvgIcon>
                      </IconButton>
                    </Box>
                  ))
                )}
              </Stack>
            </Box>
          )}
        </Stack>

        <Box
          sx={{
            flex: 1,
            border: "1px solid #d8d8d8",
            backgroundColor: "#fff",
            px: 4,
            py: 3,
            minHeight: 530,
          }}
        >
          <Typography sx={{ fontSize: 24, lineHeight: 1.2 }}>{mainTitle}</Typography>
          <Box sx={{ borderTop: "1px solid #d9d9d9", mt: 1.2, mb: 3 }} />
          <Box sx={{ minWidth: 0 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
