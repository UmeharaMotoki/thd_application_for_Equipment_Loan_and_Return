import ChangeRequestApplication from "@/components/change-request/ChangeRequestApplication";
import ItServiceShell from "@/components/it-service/ItServiceShell";

export default function ChangeRequestPage() {
  return (
    <ItServiceShell activeMenu="change-request" mainTitle="ITサービス依頼　変更依頼 申請">
      <ChangeRequestApplication />
    </ItServiceShell>
  );
}
