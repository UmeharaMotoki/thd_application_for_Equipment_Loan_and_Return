import {
  CHANGE_KIND_LABELS,
  CHANGE_REQUEST_KINDS,
  type ChangeRequestKind,
} from "@/lib/changeRequestConstants";

export type ChangeRequestKindOption = { label: string; code: string | null };

export function parseChangeRequestKind(code: string | null | undefined): ChangeRequestKind | "" {
  if (!code) return "";
  return (CHANGE_REQUEST_KINDS as readonly string[]).includes(code)
    ? (code as ChangeRequestKind)
    : "";
}

export function resolveChangeKindLabel(
  kind: ChangeRequestKind | "",
  options: ChangeRequestKindOption[],
): string {
  if (!kind) return "";
  const fromDb = options.find((o) => o.code === kind)?.label;
  return fromDb ?? CHANGE_KIND_LABELS[kind];
}
