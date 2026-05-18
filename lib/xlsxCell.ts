/** Excel セルを DB 保存用の文字列へ（日付は YYYY-MM-DD） */
export function cellToString(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    if (Number.isInteger(value) && value > 59 && value < 1000000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + value * 86400000);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return String(value);
  }
  const s = String(value).trim();
  return s.length ? s : undefined;
}
