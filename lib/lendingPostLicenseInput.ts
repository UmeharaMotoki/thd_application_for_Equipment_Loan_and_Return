import type { z } from "zod";
import type { createLendingRequestSchema } from "@/lib/validators";
import type { CreateLendingBody } from "@/lib/lendingUserPool";

type LendingBody = z.infer<typeof createLendingRequestSchema>;
export type UserLicenseInput = NonNullable<LendingBody["userLicenses"]>[number];

/** POST の利用者別ライセンス行。userLicenses 優先、代表のみ body 先頭へフォールバック。 */
export function licenseInputForEmployee(
  body: CreateLendingBody,
  employeeNumber: string,
): UserLicenseInput | null {
  const key = employeeNumber.trim();
  const fromLicenses = (body.userLicenses ?? []).find(
    (l) => l.userEmployeeNumber.trim() === key,
  );
  if (fromLicenses) return fromLicenses;

  const rep = body.userEmployeeNumber.trim();
  if (key !== rep) return null;

  return {
    userEmployeeNumber: rep,
    userStaffCategory: body.userStaffCategory,
    decisionContractType: body.decisionContractType ?? "",
    decisionWorkContent: body.decisionWorkContent ?? "",
    decisionClientEnv: body.decisionClientEnv ?? "",
    msOfficeEdition: body.msOfficeEdition ?? "",
    lendingStartDate: body.lendingStartDate,
    expectedReturnDate: body.expectedReturnDate,
    smartphoneCameraPresence: body.smartphoneCameraPresence ?? "",
    smartphoneUserIdentification: body.smartphoneUserIdentification ?? "",
    smartphoneWorkplaceUse: body.smartphoneWorkplaceUse ?? "",
    peripheralMonitorSize: body.peripheralMonitorSize ?? "",
    peripheralMonitorSizeCustom: body.peripheralMonitorSizeCustom ?? "",
    peripheralLanCableLength: body.peripheralLanCableLength ?? "",
    peripheralLanCableLengthCustom: body.peripheralLanCableLengthCustom ?? "",
  };
}

export function displayNameForLendingEmployee(body: CreateLendingBody, employeeNumber: string): string {
  const key = employeeNumber.trim();
  const rep = body.userEmployeeNumber.trim();
  if (key === rep) return body.userName.trim() || "代表利用者";
  const add = (body.additionalUsers ?? []).find((u) => u.userEmployeeNumber.trim() === key);
  if (add?.userName.trim()) return add.userName.trim();
  return `社員番号 ${key}`;
}
