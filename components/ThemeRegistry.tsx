"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { CopyFromPastProvider } from "@/components/it-service/CopyFromPastProvider";
import { ItServiceTabProvider } from "@/components/it-service/ItServiceTabContext";
import theme from "@/theme";

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ItServiceTabProvider>
          <CopyFromPastProvider>{children}</CopyFromPastProvider>
        </ItServiceTabProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
