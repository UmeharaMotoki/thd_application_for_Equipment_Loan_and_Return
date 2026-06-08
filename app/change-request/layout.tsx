import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "変更依頼 申請",
  description: "使用者変更・経費負担部門変更の申請",
};

export default function ChangeRequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
