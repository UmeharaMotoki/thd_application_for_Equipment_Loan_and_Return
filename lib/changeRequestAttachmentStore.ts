import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateChangeRequestAttachmentFile } from "@/lib/changeRequestAttachmentValidation";

export type StoredChangeRequestAttachment = {
  storedFileName: string;
  originalFileName: string;
  relativePath: string;
  sizeBytes: number;
  mimeType: string;
};

export { CHANGE_REQUEST_ATTACHMENT_MAX_FILES } from "@/lib/changeRequestAttachmentValidation";

function safeBaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export function getChangeRequestAttachmentDirectory(): string {
  const override = process.env.THD_CHANGE_REQUEST_ATTACHMENT_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.resolve(process.cwd(), "..", "JSON", "変更依頼", "添付");
}

export async function saveChangeRequestAttachments(args: {
  changeRequestId: string;
  files: Array<{ fileName: string; buffer: Buffer; mimeType: string }>;
}): Promise<StoredChangeRequestAttachment[]> {
  const baseDir = getChangeRequestAttachmentDirectory();
  const requestDir = path.join(baseDir, args.changeRequestId);
  await mkdir(requestDir, { recursive: true });

  const saved: StoredChangeRequestAttachment[] = [];
  for (const file of args.files) {
    const err = validateChangeRequestAttachmentFile(file.fileName, file.buffer.length);
    if (err) {
      throw new Error(err);
    }
    const stamp = Date.now();
    const storedFileName = `${stamp}_${safeBaseName(file.fileName)}`;
    const absolutePath = path.join(requestDir, storedFileName);
    await writeFile(absolutePath, file.buffer);
    saved.push({
      storedFileName,
      originalFileName: file.fileName,
      relativePath: path.join(args.changeRequestId, storedFileName),
      sizeBytes: file.buffer.length,
      mimeType: file.mimeType,
    });
  }
  return saved;
}
