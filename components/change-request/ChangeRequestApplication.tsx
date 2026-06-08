"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ChangeRequestApplicantStep from "@/components/change-request/ChangeRequestApplicantStep";
import ChangeRequestUserSection from "@/components/change-request/ChangeRequestUserSection";
import ChangeRequestAttachmentUpload from "@/components/change-request/ChangeRequestAttachmentUpload";
import ChangeRequestConfirmSummary from "@/components/change-request/ChangeRequestConfirmSummary";
import ChangeRequestEquipmentSelection from "@/components/change-request/ChangeRequestEquipmentSelection";
import ChangeRequestPcConfirmationPanel from "@/components/change-request/ChangeRequestPcConfirmationPanel";
import {
  changeRequestBrandColor,
  changeRequestFormBodySx,
  changeRequestFormRowFieldCellSx,
  changeRequestFormRowLabelSx,
  changeRequestSectionTitleSx,
  changeRequestTextFieldRowSx,
} from "@/components/change-request/changeRequestFormUi";
import NoticeBulletList from "@/components/it-service/NoticeBulletList";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { Dayjs } from "dayjs";
import "dayjs/locale/ja";
import { brandDatePickerSlotProps } from "@/lib/brandDatePicker";
import {
  ACCOUNTING_APPROVAL_NOTICE,
  CHANGE_REQUEST_NOTICES,
  DEPT_AND_COST_DEPT_WARNING,
  requiresAccountingAttachment,
  type ChangeRequestKind,
} from "@/lib/changeRequestConstants";
import {
  emptyChangeRequestApplicant,
  emptyChangeRequestUserProfile,
  type ChangeRequestApplicantData,
  type ChangeRequestUserProfile,
} from "@/lib/changeRequestFormTypes";
import { getChangeRequestDetailsInputIncompleteReason, getChangeRequestDetailsIncompleteReason } from "@/lib/changeRequestDetailsValidation";
import { shouldShowDeptAndCostDeptWarning, getChangeRequestDetailsBlockReason } from "@/lib/changeRequestWarnings";
import { parseChangeRequestKind, resolveChangeKindLabel } from "@/lib/changeRequestKind";
import { useChangeRequestKindOptions } from "@/lib/hooks/useChangeRequestKindOptions";
import { useChangeRequestEquipmentOptions } from "@/lib/hooks/useChangeRequestEquipmentOptions";

type Step = "notice" | "applicant" | "details" | "confirm" | "done";

function newApplicationCorrelationId() {
  return crypto.randomUUID();
}

const brandColor = changeRequestBrandColor;

const nextButtonSx = {
  width: 210,
  height: 46,
  borderRadius: 999,
  backgroundColor: brandColor,
  fontSize: 18,
  "&:hover": { backgroundColor: "#006c88" },
} as const;

export default function ChangeRequestApplication() {
  const [step, setStep] = useState<Step>("notice");
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [applicantData, setApplicantData] = useState<ChangeRequestApplicantData>(
    emptyChangeRequestApplicant(),
  );
  const [applicantStepKey, setApplicantStepKey] = useState(0);

  const [changeKind, setChangeKind] = useState<ChangeRequestKind | "">("");
  const [currentUser, setCurrentUser] = useState<ChangeRequestUserProfile>(emptyChangeRequestUserProfile());
  const [newUser, setNewUser] = useState<ChangeRequestUserProfile>(emptyChangeRequestUserProfile());
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [assetAmountYen, setAssetAmountYen] = useState<string>("");
  const [periodCurrentEnd, setPeriodCurrentEnd] = useState<Dayjs | null>(null);
  const [periodNewEnd, setPeriodNewEnd] = useState<Dayjs | null>(null);
  const [accountingAttachments, setAccountingAttachments] = useState<File[]>([]);
  const [applicationCorrelationId, setApplicationCorrelationId] = useState("");

  const { options: equipmentOptions, loading: equipmentLoading, error: equipmentError } =
    useChangeRequestEquipmentOptions();
  const {
    options: changeKindOptions,
    loading: changeKindLoading,
    error: changeKindError,
  } = useChangeRequestKindOptions();

  const selectedChangeKindLabel = resolveChangeKindLabel(changeKind, changeKindOptions);

  const isPeriodExtension = changeKind === "period_extension";
  const includesCostDeptChange = changeKind === "cost_dept_change" || changeKind === "both";
  const includesUserChange = changeKind === "user_change" || changeKind === "both";
  const showNewUserSection = !isPeriodExtension;

  const parsedAssetAmount = useMemo(() => {
    const trimmed = assetAmountYen.replace(/,/g, "").trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  }, [assetAmountYen]);

  const requiresAccountingApproval = requiresAccountingAttachment(parsedAssetAmount);
  const requiresAttachment = includesCostDeptChange && requiresAccountingApproval;

  const showDeptWarning = useMemo(() => {
    if (!changeKind || changeKind === "cost_dept_change") return false;
    return shouldShowDeptAndCostDeptWarning(currentUser, newUser, changeKind);
  }, [changeKind, currentUser, newUser]);

  const detailsBlockReason = useMemo(() => {
    if (!changeKind || step !== "details") return null;
    return getChangeRequestDetailsBlockReason(currentUser, newUser, changeKind);
  }, [step, changeKind, currentUser, newUser]);

  const detailsValidationInput = useMemo(
    () => ({
      changeKind: changeKind as ChangeRequestKind,
      currentUser,
      newUser,
      showNewUserSection,
      includesUserChange,
      includesCostDeptChange,
      isPeriodExtension,
      periodCurrentEnd,
      periodNewEnd,
      selectedEquipment,
      parsedAssetAmount,
      requiresAttachment,
      accountingAttachmentCount: accountingAttachments.length,
    }),
    [
      changeKind,
      currentUser,
      newUser,
      showNewUserSection,
      includesUserChange,
      includesCostDeptChange,
      isPeriodExtension,
      periodCurrentEnd,
      periodNewEnd,
      selectedEquipment,
      parsedAssetAmount,
      requiresAttachment,
      accountingAttachments.length,
    ],
  );

  const detailsIncompleteReason = useMemo((): string | null => {
    if (step !== "details") return null;
    if (!changeKind) return "変更内容の種別を選択してください。";
    return getChangeRequestDetailsInputIncompleteReason(detailsValidationInput);
  }, [step, changeKind, detailsValidationInput]);

  const detailsNextDisabled = Boolean(detailsBlockReason || detailsIncompleteReason || !changeKind);

  const handleChangeKindSelect = (code: string) => {
    const nextKind = parseChangeRequestKind(code);
    setChangeKind(nextKind);
    setMessage(null);
    if (nextKind !== "period_extension") {
      setPeriodCurrentEnd(null);
      setPeriodNewEnd(null);
    }
    if (nextKind !== "cost_dept_change" && nextKind !== "both") {
      setAssetAmountYen("");
      setAccountingAttachments([]);
    }
  };

  useEffect(() => {
    if (step !== "confirm") return;
    setApplicationCorrelationId((prev) => prev || newApplicationCorrelationId());
  }, [step]);

  const effectiveNewUser = showNewUserSection ? newUser : currentUser;

  const validateDetails = (): string | null => {
    if (!changeKind) return "変更内容の種別を選択してください。";
    return getChangeRequestDetailsIncompleteReason(detailsValidationInput);
  };

  const buildSubmitPayload = () => ({
    ...applicantData,
    changeKind,
    currentUser: {
      userName: currentUser.userName,
      userEmployeeNumber: currentUser.userEmployeeNumber,
      userCompanyName: currentUser.userCompanyName,
      userDepartmentName: currentUser.userDepartmentName,
      userDepartmentCode: currentUser.userDepartmentCode,
      userCostDeptName: currentUser.userCostDeptName,
      userCostDeptCode: currentUser.userCostDeptCode,
    },
    newUser: {
      userName: effectiveNewUser.userName,
      userEmployeeNumber: effectiveNewUser.userEmployeeNumber,
      userCompanyName: effectiveNewUser.userCompanyName,
      userDepartmentName: effectiveNewUser.userDepartmentName,
      userDepartmentCode: effectiveNewUser.userDepartmentCode,
      userCostDeptName: effectiveNewUser.userCostDeptName,
      userCostDeptCode: effectiveNewUser.userCostDeptCode,
    },
    equipmentTypes: selectedEquipment,
    assetAmountYen: includesCostDeptChange ? parsedAssetAmount : null,
    periodExtensionCurrentEndDate: isPeriodExtension
      ? (periodCurrentEnd?.format("YYYY-MM-DD") ?? "")
      : "",
    periodExtensionNewEndDate: isPeriodExtension ? (periodNewEnd?.format("YYYY-MM-DD") ?? "") : "",
    applicationCorrelationId: applicationCorrelationId || undefined,
    flags: {
      deptAndCostDeptWarning: showDeptWarning,
    },
  });

  const handleSubmit = async () => {
    const err = validateDetails();
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = buildSubmitPayload();
      let res: Response;
      if (accountingAttachments.length > 0) {
        const form = new FormData();
        form.append("payload", JSON.stringify(payload));
        for (const file of accountingAttachments) {
          form.append("accountingAttachments", file);
        }
        res = await fetch("/api/change-requests", { method: "POST", body: form });
      } else {
        res = await fetch("/api/change-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = (await res.json()) as {
        error?: string;
        requiresAccountingApproval?: boolean;
        applicationCorrelationId?: string;
        jsonAuditPath?: string;
        persistedTo?: "db" | "json";
      };
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "登録に失敗しました。" });
        return;
      }
      const correlationNote = data.applicationCorrelationId
        ? ` 申請連携ID: ${data.applicationCorrelationId}`
        : "";
      const suffix = data.requiresAccountingApproval
        ? " 資産金額が10万円以上のため、経理部の承認が必要です。"
        : "";
      setMessage({
        type: "success",
        text: `変更依頼を受け付けました。${correlationNote}${suffix}`,
      });
      setStep("done");
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました。" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderNavButtons = (onBack: () => void, onNext: () => void, nextDisabled = false) => (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 2, flexWrap: "wrap" }}>
      <Button variant="outlined" onClick={onBack} sx={{ width: 210, height: 46, borderRadius: 999, fontSize: 18 }}>
        戻る
      </Button>
      <Button variant="contained" disabled={nextDisabled} onClick={onNext} sx={nextButtonSx}>
        次へ
      </Button>
    </Box>
  );

  return (
    <>
      {message && step !== "notice" && step !== "details" && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}
      {detailsBlockReason && step === "details" && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {detailsBlockReason}
        </Alert>
      )}
      {detailsIncompleteReason && step === "details" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {detailsIncompleteReason}
        </Alert>
      )}

      {step === "notice" && (
        <Stack spacing="20px">
          <Typography sx={{ fontSize: 24, mb: 1.2, padding: "20px 0" }}>
            Q. 以下の注意事項をご確認のうえ、変更依頼にお進みください。
          </Typography>
          <NoticeBulletList items={CHANGE_REQUEST_NOTICES} />
          <Box sx={{ pt: "15px", mt: "40px", display: "flex", justifyContent: "center" }}>
            <FormControlLabel
              sx={{ ml: 0, mr: 0, ".MuiFormControlLabel-label": { fontSize: 16, color: "#333" } }}
              control={
                <Checkbox
                  checked={noticeAgreed}
                  onChange={(_, checked) => setNoticeAgreed(checked)}
                  sx={{ mr: 1, p: 0.4, color: "#bdbdbd", "&.Mui-checked": { color: brandColor } }}
                />
              }
              label="上記の注意事項に同意し、変更依頼を続ける"
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
            <Button
              variant="contained"
              disabled={!noticeAgreed}
              onClick={() => {
                setMessage(null);
                setStep("applicant");
              }}
              sx={nextButtonSx}
            >
              次へ
            </Button>
          </Box>
        </Stack>
      )}

      {step === "applicant" && (
        <ChangeRequestApplicantStep
          key={applicantStepKey}
          applicantData={applicantData}
          setApplicantData={setApplicantData}
          isActive
          onBack={() => setStep("notice")}
          onNext={() => {
            setMessage(null);
            setStep("details");
          }}
          onError={(text) => setMessage({ type: "error", text })}
        />
      )}

      {step === "details" && (
        <>
          <Typography sx={{ fontSize: 24, mb: 2, padding: "20px 0 10px" }}>
            Q. 変更内容の種別と詳細を入力してください
          </Typography>

          <Box sx={changeRequestFormBodySx}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={changeRequestFormRowLabelSx}>変更依頼の種別</Typography>
                <Box sx={changeRequestFormRowFieldCellSx}>
                  {changeKindLoading ? (
                    <CircularProgress size={28} sx={{ color: brandColor }} />
                  ) : (
                    <TextField
                      select
                      value={changeKind}
                      onChange={(e) => handleChangeKindSelect(e.target.value)}
                      required
                      fullWidth
                      size="small"
                      sx={changeRequestTextFieldRowSx}
                      slotProps={{
                        select: { displayEmpty: true },
                      }}
                    >
                      <MenuItem value="" disabled>
                        選択してください
                      </MenuItem>
                      {changeKindOptions.map((opt) => (
                        <MenuItem key={opt.code ?? opt.label} value={opt.code ?? ""}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
              </Box>
              {changeKindError && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {changeKindError}
                </Alert>
              )}
            </Box>

            <ChangeRequestEquipmentSelection
              options={equipmentOptions}
              selected={selectedEquipment}
              onChange={setSelectedEquipment}
              loading={equipmentLoading}
              error={equipmentError}
              disabled={!changeKind}
            />

            {!changeKind && !equipmentLoading && (
              <Alert severity="info" sx={{ mb: 2 }}>
                対象機器を選ぶ前に、上の「変更依頼の種別」を選択してください。
              </Alert>
            )}

            {changeKind && (
              <>
                {showDeptWarning && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {DEPT_AND_COST_DEPT_WARNING}
                  </Alert>
                )}

                <ChangeRequestUserSection
                  sectionTitle={isPeriodExtension ? "利用者" : "現利用者"}
                  profile={currentUser}
                  onChange={setCurrentUser}
                />
                {showNewUserSection && (
                  <ChangeRequestUserSection
                    sectionTitle="変更後利用者"
                    profile={newUser}
                    onChange={setNewUser}
                    allowCostDeptEdit={includesCostDeptChange}
                  />
                )}

                {isPeriodExtension && (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                    <Box sx={{ mb: 3 }}>
                      <Typography sx={changeRequestSectionTitleSx}>期間延長</Typography>
                      <Stack spacing={2.2}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography sx={changeRequestFormRowLabelSx}>現在の返却予定日</Typography>
                          <Box sx={changeRequestFormRowFieldCellSx}>
                            <DatePicker
                              value={periodCurrentEnd}
                              onChange={(v) => setPeriodCurrentEnd(v)}
                              format="YYYY/MM/DD"
                              slotProps={brandDatePickerSlotProps}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography sx={changeRequestFormRowLabelSx}>延長後の返却予定日</Typography>
                          <Box sx={changeRequestFormRowFieldCellSx}>
                            <DatePicker
                              value={periodNewEnd}
                              onChange={(v) => setPeriodNewEnd(v)}
                              minDate={periodCurrentEnd?.add(1, "day") ?? undefined}
                              format="YYYY/MM/DD"
                              slotProps={brandDatePickerSlotProps}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </Box>
                  </LocalizationProvider>
                )}

                <ChangeRequestPcConfirmationPanel selectedEquipment={selectedEquipment} />

                {includesCostDeptChange && (
                  <Box sx={{ mb: 3 }}>
                    <Typography sx={changeRequestSectionTitleSx}>
                      経費負担部門の変更 — 資産金額
                    </Typography>
                    <Typography sx={{ fontSize: 16, color: "#444", mb: 2, lineHeight: 1.65 }}>
                      {ACCOUNTING_APPROVAL_NOTICE}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={changeRequestFormRowLabelSx}>資産金額（円）</Typography>
                      <Box sx={changeRequestFormRowFieldCellSx}>
                        <TextField
                          value={assetAmountYen}
                          onChange={(e) => setAssetAmountYen(e.target.value.replace(/[^\d,]/g, ""))}
                          placeholder="例: 150000"
                          required
                          fullWidth
                          size="small"
                          sx={changeRequestTextFieldRowSx}
                        />
                      </Box>
                    </Box>
                    {requiresAccountingApproval && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        入力金額は {parsedAssetAmount?.toLocaleString()} 円です。10万円以上のため経理部の承認および資料添付が必要です。
                      </Alert>
                    )}
                  </Box>
                )}

                {(requiresAttachment || (includesCostDeptChange && accountingAttachments.length > 0)) && (
                  <ChangeRequestAttachmentUpload
                    files={accountingAttachments}
                    onChange={setAccountingAttachments}
                    required={requiresAttachment}
                  />
                )}
              </>
            )}
          </Box>

          {renderNavButtons(
            () => {
              setMessage(null);
              setStep("applicant");
            },
            () => {
              if (detailsNextDisabled) return;
              setMessage(null);
              setStep("confirm");
            },
            detailsNextDisabled,
          )}
          {detailsNextDisabled && (
            <Typography sx={{ textAlign: "center", color: "#666", fontSize: 12, mt: 1.5 }}>
              上記のアラート内容をご確認ください。入力が完了すると「次へ」が有効になります。
            </Typography>
          )}
        </>
      )}

      {step === "confirm" && changeKind && (
        <>
          <Typography sx={{ fontSize: 24, mb: 2, padding: "20px 0" }}>
            入力内容の確認
          </Typography>
          <ChangeRequestConfirmSummary
            changeKind={changeKind}
            changeKindLabel={selectedChangeKindLabel}
            applicant={applicantData}
            currentUser={currentUser}
            newUser={effectiveNewUser}
            showNewUserSection={showNewUserSection}
            isPeriodExtension={isPeriodExtension}
            periodCurrentEndLabel={periodCurrentEnd?.format("YYYY/MM/DD") ?? ""}
            periodNewEndLabel={periodNewEnd?.format("YYYY/MM/DD") ?? ""}
            selectedEquipment={selectedEquipment}
            includesCostDeptChange={includesCostDeptChange}
            assetAmountLabel={
              parsedAssetAmount != null
                ? `${parsedAssetAmount.toLocaleString()} 円${
                    requiresAccountingApproval ? "（経理部承認・資料添付要）" : ""
                  }`
                : ""
            }
            requiresAccountingApproval={requiresAccountingApproval}
            attachmentNames={accountingAttachments.map((f) => f.name)}
            showDeptWarning={showDeptWarning}
            applicationCorrelationId={applicationCorrelationId}
          />
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={() => setStep("details")}
              sx={{ width: 210, height: 46, borderRadius: 999, fontSize: 18 }}
            >
              戻る
            </Button>
            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              sx={nextButtonSx}
            >
              {submitting ? "送信中…" : "申請する"}
            </Button>
          </Box>
        </>
      )}

      {step === "done" && (
        <Stack spacing={2} sx={{ py: 4, alignItems: "center" }}>
          <Alert severity="success" sx={{ width: "100%" }}>
            {message?.text ?? "変更依頼を受け付けました。"}
          </Alert>
          <Button
            variant="contained"
            href="/change-request"
            onClick={() => {
              setStep("notice");
              setNoticeAgreed(false);
              setChangeKind("");
              setCurrentUser(emptyChangeRequestUserProfile());
              setNewUser(emptyChangeRequestUserProfile());
              setSelectedEquipment([]);
              setAssetAmountYen("");
              setPeriodCurrentEnd(null);
              setPeriodNewEnd(null);
              setAccountingAttachments([]);
              setApplicantData(emptyChangeRequestApplicant());
              setApplicantStepKey((k) => k + 1);
              setApplicationCorrelationId("");
              setMessage(null);
            }}
            sx={nextButtonSx}
          >
            新しい変更依頼
          </Button>
        </Stack>
      )}
    </>
  );
}
