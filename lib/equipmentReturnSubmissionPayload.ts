import type { z } from "zod";
import type { createEquipmentReturnRequestSchema } from "@/lib/validators";
import type { ReturnShippingBoxSubmissionPayload } from "@/lib/returnShippingBoxSubmissionPayload";
import type { EquipmentReturnLineWithId } from "@/lib/returnShippingBoxSubmissionPayload";

export const EQUIPMENT_RETURN_JSON_SCHEMA_VERSION = 2;

type CreateReturnBody = z.infer<typeof createEquipmentReturnRequestSchema>;

export type EquipmentReturnSubmissionPayload = {
  schemaVersion: typeof EQUIPMENT_RETURN_JSON_SCHEMA_VERSION;
  kind: "equipment-return";
  savedAt: string;
  applicationCorrelationId: string;
  requestId: string;
  persistReason?: "json-mode" | "db-fallback" | "db-with-json-audit";
  storageNote?: string;
  clientRequest: CreateReturnBody;
  lines: EquipmentReturnLineWithId[];
  linkedShippingBoxRequest: {
    shippingBoxRequestId: string;
    lineCount: number;
    jsonFileName?: string;
  } | null;
};

export function buildEquipmentReturnSubmissionPayload(args: {
  body: CreateReturnBody;
  requestId: string;
  applicationCorrelationId: string;
  lines: EquipmentReturnLineWithId[];
  persistReason?: EquipmentReturnSubmissionPayload["persistReason"];
  storageNote?: string;
  linkedShippingBoxRequest: EquipmentReturnSubmissionPayload["linkedShippingBoxRequest"];
}): EquipmentReturnSubmissionPayload {
  return {
    schemaVersion: EQUIPMENT_RETURN_JSON_SCHEMA_VERSION,
    kind: "equipment-return",
    savedAt: new Date().toISOString(),
    applicationCorrelationId: args.applicationCorrelationId,
    requestId: args.requestId,
    persistReason: args.persistReason,
    storageNote: args.storageNote,
    clientRequest: args.body,
    lines: args.lines,
    linkedShippingBoxRequest: args.linkedShippingBoxRequest,
  };
}

export function shippingBoxSummaryFromPayload(
  payload: ReturnShippingBoxSubmissionPayload | null,
  jsonFileName?: string,
): EquipmentReturnSubmissionPayload["linkedShippingBoxRequest"] {
  if (!payload) return null;
  return {
    shippingBoxRequestId: payload.shippingBoxRequestId,
    lineCount: payload.lines.length,
    jsonFileName,
  };
}
