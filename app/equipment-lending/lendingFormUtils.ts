import type { Dayjs } from "dayjs";
import { emptyLendingUserProfile } from "@/lib/lendingUserProfile";
import type { AdditionalUserRow } from "@/components/equipment-lending/LendingAdditionalUsersBlock";
import type { LendingEquipmentLine } from "./lendingFormTypes";

export function newLendingEquipmentLine(): LendingEquipmentLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lend-line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    equipmentType: "",
    assignedUserEmployeeNumber: "",
  };
}

export function newAdditionalUserRow(): AdditionalUserRow {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `add-user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...emptyLendingUserProfile(),
  };
}

export function newApplicationCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isWeekday(date: Dayjs): boolean {
  const d = date.day();
  return d >= 1 && d <= 5;
}

export type LendingRegisterApiResponse = {
  id?: string;
  applicationCorrelationId?: string;
  salesforcePayloadsByLine?: unknown;
  export?: {
    fileName?: string;
    absolutePath?: string;
    downloadPath?: string;
  } | null;
  error?: string;
};

export async function parseLendingRegisterApiJson(
  response: Response,
): Promise<LendingRegisterApiResponse> {
  const text = await response.text();
  if (!text.trim()) {
    return {
      error:
        response.status >= 500
          ? "サーバーから空の応答がありました（HTTP 500）。開発サーバーを一度停止し、`npx prisma migrate deploy` と `npx prisma generate` の後に `npm run dev` を再開し、ターミナルのエラーログを確認してください。"
          : `通信に失敗しました（HTTP ${response.status}）。`,
    };
  }
  try {
    return JSON.parse(text) as LendingRegisterApiResponse;
  } catch {
    return {
      error: `サーバー応答を解釈できませんでした: ${text.slice(0, 240)}`,
    };
  }
}
