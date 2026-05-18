"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  importDeliveryMasterAction,
  importHrMasterAction,
  importThdLocationAction,
  syncMastersFromS3Action,
  type MasterImportActionState,
} from "./actions";

function ResultAlert({ state }: { state: MasterImportActionState | null }) {
  if (!state?.message) return null;
  return (
    <Alert severity={state.ok ? "success" : "error"} sx={{ mt: 2 }}>
      {state.message}
      {state.results && (
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          {Object.entries(state.results).map(([k, r]) => (
            <li key={k}>
              <strong>{k}</strong>:{" "}
              {r.ok ? `${r.rowCount ?? 0} 件` : r.error ?? "エラー"}
            </li>
          ))}
        </Box>
      )}
    </Alert>
  );
}

export default function MasterImportClient() {
  const [secret, setSecret] = useState("");

  const [hrState, hrAction, hrPending] = useActionState(
    importHrMasterAction,
    null,
  );
  const [deliveryState, deliveryAction, deliveryPending] = useActionState(
    importDeliveryMasterAction,
    null,
  );
  const [thdState, thdAction, thdPending] = useActionState(
    importThdLocationAction,
    null,
  );
  const [syncState, syncAction, syncPending] = useActionState(
    syncMastersFromS3Action,
    null,
  );

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 4, px: 2 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          マスタ Excel 取り込み
        </Typography>
        <Typography variant="body2" color="text.secondary">
          人事データ・納品先マスタの手動アップロードと S3 同期です。申請フォームとは別画面です。
        </Typography>
        <Typography variant="body2">
          <Link href="/equipment-lending">← 機器貸与申請へ</Link>
        </Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          認証
        </Typography>
        <TextField
          fullWidth
          type="password"
          label="取込用パスワード（MASTER_IMPORT_SECRET）"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          helperText="サーバーに設定した値と同じものを入力してください。ブラウザに保存されません。"
        />
      </Paper>

      <Stack spacing={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            全社人員データ（人事 xlsx）
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            1 行目ヘッダが定義済みフォーマットと一致している必要があります。取り込み時はテーブル全件を置き換えます。
          </Typography>
          <form action={hrAction}>
            <input type="hidden" name="secret" value={secret} />
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Button component="label" variant="outlined" disabled={hrPending}>
                ファイルを選択
                <input
                  type="file"
                  name="file"
                  hidden
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                />
              </Button>
              <Button type="submit" variant="contained" disabled={hrPending}>
                {hrPending ? "取り込み中…" : "アップロードして取り込み"}
              </Button>
            </Box>
          </form>
          <ResultAlert state={hrState} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            納品先マスタ（xlsx）
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            8 列のヘッダ定義に一致している必要があります。取り込み時はテーブル全件を置き換えます。
          </Typography>
          <form action={deliveryAction}>
            <input type="hidden" name="secret" value={secret} />
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Button component="label" variant="outlined" disabled={deliveryPending}>
                ファイルを選択
                <input
                  type="file"
                  name="file"
                  hidden
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                />
              </Button>
              <Button type="submit" variant="contained" disabled={deliveryPending}>
                {deliveryPending ? "取り込み中…" : "アップロードして取り込み"}
              </Button>
            </Box>
          </form>
          <ResultAlert state={deliveryState} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            THD拠点マスタ（CSV）
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            所属部署コード⇔送付先拠点の紐づけデータです。取り込み時はテーブル全件を置き換え、納品先マスタから ThdLocation の住所を同期します。社員検索は hr_personnel_record と ThdLocation を結合して行います。
          </Typography>
          <form action={thdAction}>
            <input type="hidden" name="secret" value={secret} />
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Button component="label" variant="outlined" disabled={thdPending}>
                ファイルを選択
                <input
                  type="file"
                  name="file"
                  hidden
                  accept=".csv,text/csv"
                />
              </Button>
              <Button type="submit" variant="contained" disabled={thdPending}>
                {thdPending ? "取り込み中…" : "アップロードして取り込み"}
              </Button>
            </Box>
          </form>
          <ResultAlert state={thdState} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            S3 から同期
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            環境変数 MASTER_S3_BUCKET / MASTER_S3_HR_KEY /
            MASTER_S3_DELIVERY_KEY が設定されている場合、オブジェクトを取得して同様に全件置換します。
          </Typography>
          <form action={syncAction}>
            <input type="hidden" name="secret" value={secret} />
            <Stack spacing={2}>
              <Box sx={{ display: "flex", flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
                <FormControlLabel
                  control={
                    <Checkbox name="syncHr" defaultChecked value="on" />
                  }
                  label="人事（HR）"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="syncDelivery"
                      defaultChecked
                      value="on"
                    />
                  }
                  label="納品先（Delivery）"
                />
              </Box>
              <Button type="submit" variant="contained" disabled={syncPending}>
                {syncPending ? "同期中…" : "S3 から取り込み"}
              </Button>
            </Stack>
          </form>
          <ResultAlert state={syncState} />
        </Paper>
      </Stack>
    </Box>
  );
}
