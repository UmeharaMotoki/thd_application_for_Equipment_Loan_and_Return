import type { Metadata } from "next";
import MasterImportClient from "./MasterImportClient";

export const metadata: Metadata = {
  title: "マスタ Excel 取り込み",
  description: "人事・納品先マスタの手動アップロードと S3 同期",
};

export default function MasterImportPage() {
  return <MasterImportClient />;
}
