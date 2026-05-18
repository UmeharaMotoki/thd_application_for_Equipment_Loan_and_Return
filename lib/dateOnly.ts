/** YYYY-MM-DD をローカル日付として解釈（不正・存在しない日は null） */
export function parseIsoDateOnly(value: string): Date | null {
  const t = value.trim();
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function compareIsoDateOnly(a: string, b: string): number {
  const da = parseIsoDateOnly(a);
  const db = parseIsoDateOnly(b);
  if (!da || !db) return NaN;
  return da.getTime() - db.getTime();
}
