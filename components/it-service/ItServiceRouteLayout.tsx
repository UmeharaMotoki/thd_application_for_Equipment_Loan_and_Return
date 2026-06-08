"use client";

import ItServiceKeepAliveLayout from "@/components/it-service/ItServiceKeepAliveLayout";

/** 機器貸与・返却ルート用の共通レイアウト（page は null、本体は KeepAlive が描画） */
export default function ItServiceRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ItServiceKeepAliveLayout />
      {children}
    </>
  );
}
