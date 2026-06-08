"use client";

import { Box, Divider, Typography } from "@mui/material";
import { LendingSummaryRow } from "@/components/equipment-lending/lendingFormUi";
import {
  CHANGE_KIND_LABELS,
  DEPT_AND_COST_DEPT_WARNING,
  type ChangeRequestKind,
} from "@/lib/changeRequestConstants";
import type { ChangeRequestApplicantData, ChangeRequestUserProfile } from "@/lib/changeRequestFormTypes";

type Props = {
  changeKind: ChangeRequestKind;
  changeKindLabel: string;
  applicant: ChangeRequestApplicantData;
  currentUser: ChangeRequestUserProfile;
  newUser: ChangeRequestUserProfile;
  showNewUserSection: boolean;
  isPeriodExtension: boolean;
  periodCurrentEndLabel: string;
  periodNewEndLabel: string;
  selectedEquipment: string[];
  includesCostDeptChange: boolean;
  assetAmountLabel: string;
  requiresAccountingApproval: boolean;
  attachmentNames: string[];
  showDeptWarning: boolean;
  applicationCorrelationId: string;
};

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#007D9E", mt: 2, mb: 0.5 }}>
      {children}
    </Typography>
  );
}

export default function ChangeRequestConfirmSummary({
  changeKind,
  changeKindLabel,
  applicant,
  currentUser,
  newUser,
  showNewUserSection,
  isPeriodExtension,
  periodCurrentEndLabel,
  periodNewEndLabel,
  selectedEquipment,
  includesCostDeptChange,
  assetAmountLabel,
  requiresAccountingApproval,
  attachmentNames,
  showDeptWarning,
  applicationCorrelationId,
}: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>変更種別</SectionTitle>
      <LendingSummaryRow label="種別" value={changeKindLabel || CHANGE_KIND_LABELS[changeKind]} />
      <LendingSummaryRow label="申請連携ID" value={applicationCorrelationId} />

      <SectionTitle>申請者</SectionTitle>
      <LendingSummaryRow label="氏名" value={applicant.applicantName} />
      <LendingSummaryRow label="社員番号" value={applicant.employeeNumber} />
      <LendingSummaryRow label="所属企業名" value={applicant.companyName} />
      <LendingSummaryRow label="部署名" value={applicant.departmentName} />
      <LendingSummaryRow label="住所" value={applicant.address} />
      <LendingSummaryRow label="役職" value={applicant.applicantJobTitle} />
      <LendingSummaryRow label="Eメール" value={applicant.applicantEmail} />
      <LendingSummaryRow label="電話番号" value={applicant.applicantPhone} />

      <SectionTitle>{isPeriodExtension ? "利用者" : "現利用者"}</SectionTitle>
      <LendingSummaryRow label="氏名" value={currentUser.userName} />
      <LendingSummaryRow label="社員番号" value={currentUser.userEmployeeNumber} />
      <LendingSummaryRow label="所属企業名" value={currentUser.userCompanyName} />
      <LendingSummaryRow label="部署名" value={currentUser.userDepartmentName} />
      <LendingSummaryRow label="部署コード" value={currentUser.userDepartmentCode} />
      <LendingSummaryRow label="経費負担部署名" value={currentUser.userCostDeptName} />
      <LendingSummaryRow label="経費負担部門コード" value={currentUser.userCostDeptCode} />

      {showNewUserSection && (
        <>
          <SectionTitle>変更後利用者</SectionTitle>
          <LendingSummaryRow label="氏名" value={newUser.userName} />
          <LendingSummaryRow label="社員番号" value={newUser.userEmployeeNumber} />
          <LendingSummaryRow label="所属企業名" value={newUser.userCompanyName} />
          <LendingSummaryRow label="部署名" value={newUser.userDepartmentName} />
          <LendingSummaryRow label="部署コード" value={newUser.userDepartmentCode} />
          <LendingSummaryRow label="経費負担部署名" value={newUser.userCostDeptName} />
          <LendingSummaryRow label="経費負担部門コード" value={newUser.userCostDeptCode} />
        </>
      )}

      {isPeriodExtension && (
        <>
          <SectionTitle>期間延長</SectionTitle>
          <LendingSummaryRow label="現在の返却予定日" value={periodCurrentEndLabel} />
          <LendingSummaryRow label="延長後の返却予定日" value={periodNewEndLabel} />
        </>
      )}

      <SectionTitle>対象機器</SectionTitle>
      <LendingSummaryRow label="機器種別" value={selectedEquipment.join("、")} />

      {includesCostDeptChange && (
        <>
          <SectionTitle>経費負担部門の変更</SectionTitle>
          <LendingSummaryRow label="資産金額" value={assetAmountLabel} />
          {requiresAccountingApproval && (
            <LendingSummaryRow label="経理部承認" value="必要（10万円以上）" />
          )}
          {attachmentNames.length > 0 && (
            <LendingSummaryRow label="添付資料" value={attachmentNames.join("、")} />
          )}
        </>
      )}

      {showDeptWarning && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 15, color: "#b45309", whiteSpace: "pre-wrap" }}>
            {DEPT_AND_COST_DEPT_WARNING}
          </Typography>
        </>
      )}
    </Box>
  );
}
