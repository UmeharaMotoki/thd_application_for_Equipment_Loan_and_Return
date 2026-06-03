"use client";

import { useMemo } from "react";
import {
  Alert,
  Box,
  Divider,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { brandDatePickerSlotProps } from "@/lib/brandDatePicker";
import { LICENSE_SPEC_ROWS } from "@/lib/licenseSpecTree";
import { EQUIPMENT_CATEGORY_LABEL } from "@/lib/lendingEquipmentOptions";
import type { LendingUserReasonBlock } from "@/lib/lendingUserReason";
import {
  type UserReasonFormState,
  userLinesIncludeCommunication,
  userLinesIncludeEquipment,
  userLinesIncludePc,
  userLinesIncludePeripheral,
  userLinesIncludeSmartphone,
  userLinesIncludeWifiRouter,
} from "@/lib/lendingUserReason";
import {
  DECISION_CLIENT_NO,
  DECISION_CLIENT_YES,
  DECISION_CONTRACT_DISPATCH,
  DECISION_CONTRACT_QUASI,
  DECISION_WORK_DEVELOPMENT,
  MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED,
  decisionResolutionToLicenseFields,
  isMsOfficeEditionAllowedForPcDecision,
  resolvePcSpecDecision,
  STAFF_MANAGEMENT,
  STAFF_TECHNICAL,
} from "@/lib/resolvePcSpecDecision";

const pcInitialTableThSx = {
  fontWeight: 600,
  border: "1px solid #e0e0e0",
  bgcolor: "#f5f5f5",
  width: "58%",
} as const;
const pcInitialTableTdSx = { border: "1px solid #e0e0e0", fontSize: 18 } as const;

function PcInitialSettingsTitle() {
  return (
    <Typography sx={{ fontWeight: 600, mb: 0.5 }} component="div">
      PC初期設定
      <Box component="span" sx={{ fontWeight: 400, fontSize: 16 }}>
        （
        <Link href="/pc-spec-flow" target="_blank" rel="noopener noreferrer" sx={{ fontSize: "inherit", fontWeight: 600 }}>
          判定フローはこちら
        </Link>
        ）
      </Box>
    </Typography>
  );
}

function PcInitialSettingsTable({
  userInstall,
  network,
  licenseApply,
}: {
  userInstall: string;
  network: string;
  licenseApply: string;
}) {
  return (
    <TableContainer component={Box} sx={{ mt: 1 }}>
      <Table size="small" sx={{ borderCollapse: "collapse" }}>
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              ユーザーによるソフトウェアのインストール
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{userInstall}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              テクノプロネットワークへの接続
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{network}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" sx={pcInitialTableThSx}>
              テクノプロ保有ライセンスの適用
            </TableCell>
            <TableCell sx={pcInitialTableTdSx}>{licenseApply}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

type Props = {
  block: LendingUserReasonBlock;
  reason: UserReasonFormState;
  onChange: (patch: Partial<UserReasonFormState>) => void;
  formRowLabelSx: Record<string, unknown>;
  formRowFieldCellSx: Record<string, unknown>;
  textFieldRowSx: Record<string, unknown>;
  userStaffCategoryOptions: string[];
  decisionContractTypeOptions: string[];
  decisionWorkContentOptions: string[];
  decisionClientEnvOptions: string[];
  msOfficeMenuOptionsPool: string[];
  smartphoneCameraOptions: string[];
  smartphoneUserIdentificationOptions: string[];
  smartphoneWorkplaceOptions: string[];
  peripheralMonitorSizeOptions: string[];
  peripheralLanCableLengthOptions: string[];
  minSelectableDate: Dayjs;
  isSelectableBusinessDate: (value: Dayjs | null | undefined) => boolean;
};

export default function LendingUserReasonBlock({
  block,
  reason,
  onChange,
  formRowLabelSx,
  formRowFieldCellSx,
  textFieldRowSx,
  userStaffCategoryOptions,
  decisionContractTypeOptions,
  decisionWorkContentOptions,
  decisionClientEnvOptions,
  msOfficeMenuOptionsPool,
  smartphoneCameraOptions,
  smartphoneUserIdentificationOptions,
  smartphoneWorkplaceOptions,
  peripheralMonitorSizeOptions,
  peripheralLanCableLengthOptions,
  minSelectableDate,
  isSelectableBusinessDate,
}: Props) {
  const userLines = useMemo(
    () => block.equipmentTypes.map((equipmentType) => ({ equipmentType })),
    [block.equipmentTypes],
  );

  const includesPc = userLinesIncludePc(userLines);
  const includesCommunication = userLinesIncludeCommunication(userLines);
  const includesSmartphone = userLinesIncludeSmartphone(userLines);
  const includesWifiRouter = userLinesIncludeWifiRouter(userLines);
  const includesPeripheral = userLinesIncludePeripheral(userLines);
  const includesMonitor = userLinesIncludeEquipment(userLines, "モニター");
  const includesLanCable = userLinesIncludeEquipment(userLines, "LANケーブル");
  const includesMouse = userLinesIncludeEquipment(userLines, "マウス");
  const includesHeadset = userLinesIncludeEquipment(userLines, "ヘッドセット");

  const msOfficeMenuOptions = useMemo((): string[] => {
    if (!includesPc) return [];
    const cl = reason.decisionClientEnv.trim();
    const c = reason.decisionContractType.trim();
    const w = reason.decisionWorkContent.trim();
    if (reason.userStaffCategory === STAFF_MANAGEMENT) return [...msOfficeMenuOptionsPool];
    if (reason.userStaffCategory !== STAFF_TECHNICAL) return [];
    if (!cl) return [];
    if (cl === DECISION_CLIENT_NO) return [...msOfficeMenuOptionsPool];
    if (cl === DECISION_CLIENT_YES) {
      if (c === DECISION_CONTRACT_QUASI && w === DECISION_WORK_DEVELOPMENT) {
        return [...msOfficeMenuOptionsPool, MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED];
      }
      if (c === DECISION_CONTRACT_DISPATCH && w === DECISION_WORK_DEVELOPMENT) {
        return [...msOfficeMenuOptionsPool];
      }
      return [];
    }
    return [];
  }, [
    includesPc,
    msOfficeMenuOptionsPool,
    reason.userStaffCategory,
    reason.decisionContractType,
    reason.decisionWorkContent,
    reason.decisionClientEnv,
  ]);

  const decisionResolution = useMemo(
    () =>
      resolvePcSpecDecision(
        reason.userStaffCategory,
        reason.decisionContractType,
        reason.decisionWorkContent,
        reason.decisionClientEnv,
        reason.msOfficeEdition,
      ),
    [
      reason.userStaffCategory,
      reason.decisionContractType,
      reason.decisionWorkContent,
      reason.decisionClientEnv,
      reason.msOfficeEdition,
    ],
  );

  const derivedLicense = useMemo(
    () => decisionResolutionToLicenseFields(decisionResolution),
    [decisionResolution],
  );

  const technicalSpecCode = decisionResolution.kind === "spec" ? decisionResolution.code : null;

  const returnMinSelectableDate = useMemo(() => {
    if (!reason.lendingStartDate.trim()) return minSelectableDate;
    const lendingStart = dayjs(reason.lendingStartDate).startOf("day");
    if (!lendingStart.isValid()) return minSelectableDate;
    return lendingStart.isAfter(minSelectableDate) ? lendingStart : minSelectableDate;
  }, [reason.lendingStartDate, minSelectableDate]);

  return (
    <Box sx={{ border: "2px solid #007D9E", borderRadius: 1, p: 2, bgcolor: "#f8fcfd" }}>
      <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.5, color: "#007D9E" }}>
        {block.userName}
        <Typography component="span" sx={{ fontSize: 14, fontWeight: 400, color: "#555", ml: 1 }}>
          （{block.roleLabel}） {block.employeeNumber}
        </Typography>
      </Typography>
      <Typography sx={{ fontSize: 13, color: "#666", mb: 1.5 }}>
        貸与機器: {block.equipmentTypes.join("、")}
      </Typography>

      <Stack spacing={2.2}>
        {includesPc && (
          <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#007D9E" }}>
              {EQUIPMENT_CATEGORY_LABEL.pc}
            </Typography>
            <Stack spacing={2.2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={formRowLabelSx}>利用者区分</Typography>
                <Box sx={formRowFieldCellSx}>
                  <TextField
                    select
                    value={reason.userStaffCategory}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange({
                        userStaffCategory: v,
                        ...(v === STAFF_MANAGEMENT
                          ? {
                              decisionContractType: "",
                              decisionWorkContent: "",
                              decisionClientEnv: "",
                            }
                          : {}),
                      });
                    }}
                    required
                    fullWidth
                    size="small"
                    sx={textFieldRowSx}
                  >
                    <MenuItem value="" disabled>
                      選択してください
                    </MenuItem>
                    {userStaffCategoryOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
              {reason.userStaffCategory === STAFF_TECHNICAL && (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>客先契約形態</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={reason.decisionContractType}
                        onChange={(e) => onChange({ decisionContractType: e.target.value })}
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          選択してください
                        </MenuItem>
                        {decisionContractTypeOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>業務内容</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={reason.decisionWorkContent}
                        onChange={(e) => onChange({ decisionWorkContent: e.target.value })}
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          選択してください
                        </MenuItem>
                        {decisionWorkContentOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>客先ネットワーク接続の有無</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={reason.decisionClientEnv}
                        onChange={(e) => onChange({ decisionClientEnv: e.target.value })}
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          選択してください
                        </MenuItem>
                        {decisionClientEnvOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                </>
              )}
              {(reason.userStaffCategory === STAFF_MANAGEMENT ||
                reason.userStaffCategory === STAFF_TECHNICAL) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={formRowLabelSx}>MicrosoftOfficeのエディション</Typography>
                  <Box sx={formRowFieldCellSx}>
                    <TextField
                      select
                      value={reason.msOfficeEdition}
                      onChange={(e) => onChange({ msOfficeEdition: e.target.value })}
                      required
                      fullWidth
                      size="small"
                      disabled={msOfficeMenuOptions.length === 0}
                      sx={textFieldRowSx}
                    >
                      <MenuItem value="" disabled>
                        選択してください
                      </MenuItem>
                      {msOfficeMenuOptions.map((edition) => (
                        <MenuItem key={edition} value={edition}>
                          {edition}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Box>
              )}
              {decisionResolution.kind === "lending_denied" && (
                <Alert severity="error">{decisionResolution.message}</Alert>
              )}
              {derivedLicense && decisionResolution.kind === "management_internal" && (
                <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
                  <PcInitialSettingsTitle />
                  <PcInitialSettingsTable userInstall="×" network="○" licenseApply="○" />
                </Alert>
              )}
              {derivedLicense && technicalSpecCode !== null && (
                <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
                  <PcInitialSettingsTitle />
                  <PcInitialSettingsTable
                    userInstall={LICENSE_SPEC_ROWS[technicalSpecCode].userInstall}
                    network={LICENSE_SPEC_ROWS[technicalSpecCode].network}
                    licenseApply={LICENSE_SPEC_ROWS[technicalSpecCode].licenseApply}
                  />
                </Alert>
              )}
            </Stack>
          </Box>
        )}

        {includesCommunication && (
          <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#007D9E" }}>
              {EQUIPMENT_CATEGORY_LABEL.communication}
            </Typography>
            <Stack spacing={2}>
              {includesSmartphone && (
                <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>スマホ</Typography>
                  <Stack spacing={2.2}>
                    {(
                      [
                        ["smartphoneCameraPresence", "カメラ利用の有無", smartphoneCameraOptions],
                        [
                          "smartphoneUserIdentification",
                          "スマホの利用者の特定の有無",
                          smartphoneUserIdentificationOptions,
                        ],
                        [
                          "smartphoneWorkplaceUse",
                          "スマホの事業場での利用",
                          smartphoneWorkplaceOptions,
                        ],
                      ] as const
                    ).map(([key, label, opts]) => (
                      <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={formRowLabelSx}>{label}</Typography>
                        <Box sx={formRowFieldCellSx}>
                          <TextField
                            select
                            value={reason[key]}
                            onChange={(e) => onChange({ [key]: e.target.value })}
                            required
                            fullWidth
                            size="small"
                            sx={textFieldRowSx}
                          >
                            <MenuItem value="" disabled>
                              選択してください
                            </MenuItem>
                            {opts.map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              {includesWifiRouter && (
                <Alert severity="info">Wifiルーターに関する追加の入力事項はありません。</Alert>
              )}
            </Stack>
          </Box>
        )}

        {includesPeripheral && (
          <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#007D9E" }}>
              {EQUIPMENT_CATEGORY_LABEL.peripheral}
            </Typography>
            <Stack spacing={2}>
              {includesMonitor && (
                <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>モニター</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>サイズ</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={reason.peripheralMonitorSize}
                        onChange={(e) =>
                          onChange({
                            peripheralMonitorSize: e.target.value,
                            ...(e.target.value !== "その他"
                              ? { peripheralMonitorSizeCustom: "" }
                              : {}),
                          })
                        }
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          選択してください
                        </MenuItem>
                        {peripheralMonitorSizeOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                  {reason.peripheralMonitorSize === "その他" && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>サイズ（詳細）</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          value={reason.peripheralMonitorSizeCustom}
                          onChange={(e) =>
                            onChange({ peripheralMonitorSizeCustom: e.target.value })
                          }
                          required
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
              {includesLanCable && (
                <Box sx={{ border: "1px solid #e8e8e8", borderRadius: 1, p: 2, bgcolor: "#fff" }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5 }}>LANケーブル</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>最低限の長さ</Typography>
                    <Box sx={formRowFieldCellSx}>
                      <TextField
                        select
                        value={reason.peripheralLanCableLength}
                        onChange={(e) =>
                          onChange({
                            peripheralLanCableLength: e.target.value,
                            ...(e.target.value !== "その他"
                              ? { peripheralLanCableLengthCustom: "" }
                              : {}),
                          })
                        }
                        required
                        fullWidth
                        size="small"
                        sx={textFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          選択してください
                        </MenuItem>
                        {peripheralLanCableLengthOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                  {reason.peripheralLanCableLength === "その他" && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={formRowLabelSx}>長さ（詳細）</Typography>
                      <Box sx={formRowFieldCellSx}>
                        <TextField
                          value={reason.peripheralLanCableLengthCustom}
                          onChange={(e) =>
                            onChange({ peripheralLanCableLengthCustom: e.target.value })
                          }
                          required
                          fullWidth
                          size="small"
                          sx={textFieldRowSx}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
              {includesMouse && (
                <Alert severity="info">マウスに関する追加の入力事項はありません。</Alert>
              )}
              {includesHeadset && (
                <Alert severity="info">ヘッドセットに関する追加の入力事項はありません。</Alert>
              )}
            </Stack>
          </Box>
        )}

        <Divider />
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography sx={formRowLabelSx}>貸与開始日</Typography>
          <Box sx={formRowFieldCellSx}>
            <DatePicker
              format="YYYY-MM-DD"
              minDate={minSelectableDate}
              shouldDisableDate={(date) => !isSelectableBusinessDate(date)}
              value={reason.lendingStartDate ? dayjs(reason.lendingStartDate) : null}
              onChange={(v) =>
                onChange({
                  lendingStartDate: v != null && v.isValid() ? v.format("YYYY-MM-DD") : "",
                })
              }
              views={["year", "month", "day"]}
              slotProps={brandDatePickerSlotProps}
              sx={{ width: "100%", maxWidth: "100%" }}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography sx={formRowLabelSx}>返却予定日</Typography>
          <Box sx={formRowFieldCellSx}>
            <DatePicker
              format="YYYY-MM-DD"
              minDate={returnMinSelectableDate}
              shouldDisableDate={(date) => {
                if (!isSelectableBusinessDate(date)) return true;
                return date.startOf("day").isBefore(returnMinSelectableDate);
              }}
              value={reason.expectedReturnDate ? dayjs(reason.expectedReturnDate) : null}
              onChange={(v) =>
                onChange({
                  expectedReturnDate: v != null && v.isValid() ? v.format("YYYY-MM-DD") : "",
                })
              }
              views={["year", "month", "day"]}
              slotProps={brandDatePickerSlotProps}
              sx={{ width: "100%", maxWidth: "100%" }}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
