export const CHANGE_REQUEST_ATTACHMENT_MAX_FILES = 5;
export const CHANGE_REQUEST_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".xlsx",
  ".xls",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
]);

function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i).toLowerCase() : "";
}

export function validateChangeRequestAttachmentFile(
  fileName: string,
  sizeBytes: number,
): string | null {
  const ext = fileExtension(fileName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `許可されていないファイル形式です（${fileName}）。PDF / Excel / Word / 画像のみ添付できます。`;
  }
  if (sizeBytes <= 0) {
    return `空のファイルは添付できません（${fileName}）。`;
  }
  if (sizeBytes > CHANGE_REQUEST_ATTACHMENT_MAX_BYTES) {
    return `ファイルサイズが上限（10MB）を超えています（${fileName}）。`;
  }
  return null;
}
