"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  CopyFromPastApplicantMasterFields,
  useCopyFromPastApplicantMaster,
} from "@/components/it-service/copyFromPastApplicantMaster";
import { buildArchivePrefill } from "@/lib/copyFromPastPrefillFetch";
import type { LendingRequestPrefillPayload } from "@/lib/mapEquipmentRequestToPrefill";
import type { EquipmentReturnPrefillPayload } from "@/lib/mapEquipmentReturnRequestToPrefill";
import { addNamedRequestArchive, type NamedArchiveKind } from "@/lib/namedRequestArchives";

type SourceKind = "lending" | "return";

type ListItem = {
  id: string;
  sourceKind: SourceKind;
  createdAt: string;
  applicantName: string;
  userName: string;
  userEmployeeNumber: string;
  requestReason: string;
  lendingStartDate: string | null;
  expectedReturnDate: string | null;
  lineCount: number;
  isArchived: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  brandColor: string;
  onLendingPrefill: (prefill: LendingRequestPrefillPayload) => void;
  onReturnPrefill: (prefill: EquipmentReturnPrefillPayload) => void;
  onArchivesUpdated?: () => void;
};

export default function CopyFromPastReturnRequestsDialog({
  open,
  onClose,
  brandColor,
  onLendingPrefill,
  onReturnPrefill,
  onArchivesUpdated,
}: Props) {
  const {
    applicantName,
    applicantEmployeeNumber,
    selectedApplicantEmployeeId,
    candidates,
    loading: applicantSearchLoading,
    showApplicantEmployeeField,
    showSelect,
    handleApplicantNameInput,
    applyApplicantFromEmployee,
    setApplicantEmployeeNumber,
  } = useCopyFromPastApplicantMaster(open);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<{ kind: SourceKind; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLabel, setArchiveLabel] = useState("");
  const [templateSavedNotice, setTemplateSavedNotice] = useState(false);
  const [archiveSaving, setArchiveSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setArchiveOpen(false);
      setArchiveLabel("");
    }
  }, [open]);

  const fetchList = useCallback(async () => {
    const emp = applicantEmployeeNumber.trim();
    if (!emp) {
      setError("申請者の社員番号を入力するか、氏名を検索してマスタから選択してください。");
      return;
    }
    setError(null);
    setListLoading(true);
    setItems([]);
    setSelected(null);
    setArchiveOpen(false);
    try {
      const q = new URLSearchParams({
        applicantEmployeeNumber: emp,
        includeArchived: includeArchived ? "1" : "0",
        limit: "50",
        offset: "0",
      });
      const name = applicantName.trim();
      if (name) q.set("filterApplicantName", name);
      const res = await fetch(`/api/past-requests?${q.toString()}`);
      const data = (await res.json()) as {
        total?: number;
        items?: ListItem[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "一覧の取得に失敗しました。");
      }
      setTotal(data.total ?? 0);
      setItems(data.items ?? []);
      if ((data.items?.length ?? 0) === 0) {
        setError(
          includeArchived
            ? "該当する申請がありません。"
            : "直近3か月の申請がありません。「テンプレートを含む」を選択して、再度「一覧を表示」を押してください。",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "一覧の取得に失敗しました。");
    } finally {
      setListLoading(false);
    }
  }, [applicantEmployeeNumber, applicantName, includeArchived]);

  const applyCopy = async () => {
    const emp = applicantEmployeeNumber.trim();
    if (!selected || !emp) return;
    setError(null);
    setDetailLoading(true);
    try {
      const kind: NamedArchiveKind = selected.kind === "return" ? "return" : "lending";
      const prefill = await buildArchivePrefill(kind, selected.id, applicantName, emp);
      if (kind === "lending") {
        onLendingPrefill(prefill as LendingRequestPrefillPayload);
      } else {
        onReturnPrefill(prefill as EquipmentReturnPrefillPayload);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "申請の取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmSaveArchive = async () => {
    const emp = applicantEmployeeNumber.trim();
    if (!selected || !emp) {
      setError("申請者の社員番号と、一覧で保存する行を選んでください。");
      return;
    }
    const row = items.find((r) => r.id === selected.id && r.sourceKind === selected.kind);
    const kind: NamedArchiveKind = selected.kind === "return" ? "return" : "lending";
    const kindLabel = kind === "return" ? "返却" : "貸与";
    const label = archiveLabel.trim() || `${kindLabel} ${selected.id.slice(0, 8)}`;
    setError(null);
    setArchiveSaving(true);
    try {
      const prefill = await buildArchivePrefill(kind, selected.id, applicantName, emp);
      addNamedRequestArchive({
        label,
        kind,
        sourceRequestId: selected.id,
        applicantEmployeeNumber: emp,
        applicantNameSnapshot: applicantName.trim() || row?.applicantName,
        userNameSnapshot: row?.userName,
        prefill,
      });
      onArchivesUpdated?.();
      setArchiveOpen(false);
      setArchiveLabel("");
      setTemplateSavedNotice(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "テンプレートの保存に失敗しました。ブラウザのストレージ設定を確認してください。",
      );
    } finally {
      setArchiveSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>過去の申請から再利用</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography sx={{ fontSize: 15, color: "#555" }}>
              申請者情報を入力してください。
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <CopyFromPastApplicantMasterFields
                applicantName={applicantName}
                applicantEmployeeNumber={applicantEmployeeNumber}
                selectedApplicantEmployeeId={selectedApplicantEmployeeId}
                candidates={candidates}
                loading={applicantSearchLoading}
                showApplicantEmployeeField={showApplicantEmployeeField}
                showSelect={showSelect}
                onApplicantNameChange={handleApplicantNameInput}
                onSelectEmployee={applyApplicantFromEmployee}
                onManualEmployeeNumberChange={setApplicantEmployeeNumber}
              />
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                <RadioGroup
                  row
                  value={includeArchived ? "archive" : "recent"}
                  onChange={(_, v) => setIncludeArchived(v === "archive")}
                >
                  <FormControlLabel value="recent" control={<Radio size="small" />} label="直近3か月" />
                  <FormControlLabel
                    value="archive"
                    control={<Radio size="small" />}
                    label="テンプレートを含む"
                  />
                </RadioGroup>
                <Button
                  variant="outlined"
                  onClick={() => void fetchList()}
                  disabled={listLoading}
                  sx={{ borderColor: "#c9c9c9", color: "#333" }}
                >
                  {listLoading ? <CircularProgress size={22} /> : "一覧を表示"}
                </Button>
              </Box>
            </Box>
            {total > 0 && (
              <Typography sx={{ fontSize: 14, color: "#666" }}>
                {total} 件中 {items.length} 件を表示
              </Typography>
            )}
            {items.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={40} />
                    <TableCell>区分</TableCell>
                    <TableCell>申請日時</TableCell>
                    <TableCell>申請者</TableCell>
                    <TableCell>利用者</TableCell>
                    <TableCell>利用者社員番号</TableCell>
                    <TableCell>申請理由</TableCell>
                    <TableCell>元の貸与期間</TableCell>
                    <TableCell align="right">行数</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => {
                    const isSel = selected?.id === row.id && selected?.kind === row.sourceKind;
                    return (
                      <TableRow
                        key={`${row.sourceKind}-${row.id}`}
                        hover
                        selected={isSel}
                        onClick={() => setSelected({ kind: row.sourceKind, id: row.id })}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Radio
                            checked={isSel}
                            onChange={() => setSelected({ kind: row.sourceKind, id: row.id })}
                            value={`${row.sourceKind}:${row.id}`}
                          />
                        </TableCell>
                        <TableCell>{row.sourceKind === "lending" ? "貸与" : "返却"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {new Date(row.createdAt).toLocaleString("ja-JP")}
                          {row.isArchived ? "（それ以前）" : ""}
                        </TableCell>
                        <TableCell>{row.applicantName}</TableCell>
                        <TableCell>{row.userName}</TableCell>
                        <TableCell>{row.userEmployeeNumber}</TableCell>
                        <TableCell>{row.requestReason}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {row.lendingStartDate && row.expectedReturnDate
                            ? `${row.lendingStartDate} 〜 ${row.expectedReturnDate}`
                            : "—"}
                        </TableCell>
                        <TableCell align="right">{row.lineCount}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {archiveOpen && selected && (
              <Box
                sx={{
                  border: "1px solid #b8d4df",
                  borderRadius: 1,
                  p: 2,
                  mt: 1,
                  bgcolor: "#f4fafc",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#333" }} component="h4">
                    テンプレートに保存
                  </Typography>
                  <IconButton
                    type="button"
                    size="small"
                    aria-label="入力を閉じる"
                    onClick={() => setArchiveOpen(false)}
                    sx={{ color: "#666", mr: -0.5, mt: -0.5 }}
                  >
                    <SvgIcon fontSize="small" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </SvgIcon>
                  </IconButton>
                </Box>
                <TextField
                  autoFocus
                  margin="dense"
                  label="表示名"
                  fullWidth
                  value={archiveLabel}
                  onChange={(e) => setArchiveLabel(e.target.value)}
                  placeholder="例: 返却テンプレA"
                  helperText="保存後は左の申請一覧に表示されます。表示名をクリックするとフォームに取り込めます。"
                />
                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    variant="contained"
                    disabled={archiveSaving}
                    onClick={() => void confirmSaveArchive()}
                    sx={{ bgcolor: brandColor }}
                  >
                    {archiveSaving ? <CircularProgress size={22} color="inherit" /> : "保存"}
                  </Button>
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          <Button type="button" onClick={onClose} sx={{ color: "#333", minWidth: 200, height: 42 }}>
            終了する
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={!selected}
            onClick={() => {
              if (!archiveOpen) {
                setArchiveLabel("");
                setArchiveOpen(true);
              }
            }}
            sx={{ borderColor: "#c9c9c9", color: "#333", minWidth: 200, height: 42 }}
          >
            テンプレートに保存
          </Button>
          <Button
            type="button"
            variant="contained"
            disabled={!selected || detailLoading}
            onClick={() => void applyCopy()}
            sx={{
              minWidth: 200,
              height: 42,
              backgroundColor: brandColor,
              "&:hover": { backgroundColor: "#006c88" },
            }}
          >
            {detailLoading ? <CircularProgress size={22} color="inherit" /> : "この内容で再利用"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={templateSavedNotice}
        autoHideDuration={4500}
        onClose={() => setTemplateSavedNotice(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      >
        <Alert
          onClose={() => setTemplateSavedNotice(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%", alignItems: "center" }}
        >
          テンプレートを保存しました。
        </Alert>
      </Snackbar>
    </>
  );
}
