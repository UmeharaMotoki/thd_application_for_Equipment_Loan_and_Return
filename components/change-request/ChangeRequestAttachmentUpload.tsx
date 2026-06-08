"use client";

import { useRef } from "react";
import { Alert, Box, Button, IconButton, Stack, SvgIcon, Typography } from "@mui/material";
import {
  CHANGE_REQUEST_ATTACHMENT_MAX_BYTES,
  CHANGE_REQUEST_ATTACHMENT_MAX_FILES,
  validateChangeRequestAttachmentFile,
} from "@/lib/changeRequestAttachmentValidation";
import { ACCOUNTING_ATTACHMENT_LABEL } from "@/lib/changeRequestConstants";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  required?: boolean;
};

export default function ChangeRequestAttachmentUpload({ files, onChange, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= CHANGE_REQUEST_ATTACHMENT_MAX_FILES) {
        window.alert(`添付ファイルは最大 ${CHANGE_REQUEST_ATTACHMENT_MAX_FILES} 件までです。`);
        break;
      }
      const err = validateChangeRequestAttachmentFile(file.name, file.size);
      if (err) {
        window.alert(err);
        continue;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ mb: 3, p: 2.5, bgcolor: "#fff8f0", border: "1px solid #e8c9a0", borderRadius: 1 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 1 }}>
        {ACCOUNTING_ATTACHMENT_LABEL}
        {required ? "（必須）" : ""}
      </Typography>
      <Typography sx={{ fontSize: 16, color: "#444", mb: 2, lineHeight: 1.65 }}>
        経理部から発行された資産登録変更の資料（PDF / Excel / Word / 画像）を添付してください。1ファイル10MB以内、最大
        {CHANGE_REQUEST_ATTACHMENT_MAX_FILES}件まで。
      </Typography>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,application/pdf,image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outlined"
        onClick={() => inputRef.current?.click()}
        disabled={files.length >= CHANGE_REQUEST_ATTACHMENT_MAX_FILES}
        sx={{ borderColor: "#007D9E", color: "#007D9E", mb: 2 }}
      >
        ファイルを選択
      </Button>

      {files.length === 0 ? (
        <Alert severity={required ? "warning" : "info"}>
          {required
            ? "資産金額が10万円以上のため、資料の添付が必須です。"
            : "必要に応じて資料を添付できます。"}
        </Alert>
      ) : (
        <Stack spacing={1}>
          {files.map((file, index) => (
            <Box
              key={`${file.name}-${file.size}-${index}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.75,
                px: 1.5,
                border: "1px solid #ddd",
                borderRadius: 1,
                bgcolor: "#fff",
              }}
            >
              <Typography sx={{ flex: 1, fontSize: 15 }}>
                {file.name}{" "}
                <Box component="span" sx={{ color: "#888", fontSize: 13 }}>
                  ({(file.size / 1024).toFixed(1)} KB
                  {file.size > CHANGE_REQUEST_ATTACHMENT_MAX_BYTES ? " — サイズ超過" : ""})
                </Box>
              </Typography>
              <IconButton
                type="button"
                size="small"
                aria-label="添付を削除"
                onClick={() => removeAt(index)}
              >
                <SvgIcon fontSize="small" viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </SvgIcon>
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
