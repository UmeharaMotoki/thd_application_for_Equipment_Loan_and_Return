const STORAGE_KEY = "thd-named-request-archives";

export type NamedArchiveKind = "lending" | "return";

export type NamedRequestArchive = {
  id: string;
  /** ユーザーが付けた表示名 */
  label: string;
  kind: NamedArchiveKind;
  sourceRequestId: string;
  /** 一覧・詳細 API 認可用の申請者社員番号 */
  applicantEmployeeNumber: string;
  createdAt: string;
  /** 保存時の表示用スナップショット */
  applicantNameSnapshot?: string;
  userNameSnapshot?: string;
};

function safeParse(raw: string | null): NamedRequestArchive[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is NamedRequestArchive =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as NamedRequestArchive).id === "string" &&
        typeof (x as NamedRequestArchive).label === "string" &&
        ((x as NamedRequestArchive).kind === "lending" ||
          (x as NamedRequestArchive).kind === "return"),
    );
  } catch {
    return [];
  }
}

export function loadNamedRequestArchives(): NamedRequestArchive[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveNamedRequestArchives(items: NamedRequestArchive[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addNamedRequestArchive(
  entry: Omit<NamedRequestArchive, "id" | "createdAt"> & { id?: string },
): NamedRequestArchive[] {
  const id =
    entry.id?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `arc-${Date.now()}`);
  const row: NamedRequestArchive = {
    ...entry,
    id,
    createdAt: new Date().toISOString(),
  };
  const next = [row, ...loadNamedRequestArchives()];
  saveNamedRequestArchives(next);
  return next;
}

export function removeNamedRequestArchive(id: string): NamedRequestArchive[] {
  const next = loadNamedRequestArchives().filter((a) => a.id !== id);
  saveNamedRequestArchives(next);
  return next;
}
