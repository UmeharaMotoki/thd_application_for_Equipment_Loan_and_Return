import {
  lendingLinesIncludeEquipment,
  lendingLinesIncludePc,
  lendingLinesIncludeSmartphone,
  LENDING_NON_PC_STAFF_CATEGORY,
} from "@/lib/lendingEquipmentOptions";
import type { DerivedLicenseFields, StoredLicenseSpecCode } from "@/lib/resolvePcSpecDecision";
import {
  decisionResolutionToLicenseFields,
  isMsOfficeEditionAllowedForPcDecision,
  resolvePcSpecDecision,
} from "@/lib/resolvePcSpecDecision";
import type { CreateLendingBody } from "@/lib/lendingUserPool";
import {
  assignedEmployeeNumbersFromLines,
  isPcEquipmentType,
  linesForAssignee,
} from "@/lib/lendingUserPool";

export type ResolvedUserLicense = {
  userEmployeeNumber: string;
  userStaffCategory: string;
  decisionContractType: string;
  decisionWorkContent: string;
  decisionClientEnv: string;
  msOfficeEdition: string;
  licenseTechnoProApply: string;
  licenseUserSoftwareInstall: string;
  licenseTechnoProNetwork: string;
  licenseSpecCode: string;
  lendingStartDate: string;
  expectedReturnDate: string;
  smartphoneCameraPresence: string;
  smartphoneUserIdentification: string;
  smartphoneWorkplaceUse: string;
  peripheralMonitorSize: string;
  peripheralMonitorSizeCustom: string;
  peripheralLanCableLength: string;
  peripheralLanCableLengthCustom: string;
};

export type ResolveUserLicensesResult =
  | {
      ok: true;
      licenses: ResolvedUserLicense[];
      representative: ResolvedUserLicense;
    }
  | { ok: false; error: string };

const NON_PC: DerivedLicenseFields = {
  licenseTechnoProApply: "-",
  licenseUserSoftwareInstall: "-",
  licenseTechnoProNetwork: "-",
  licenseSpecCode: "-" as StoredLicenseSpecCode,
};

type UserLicenseInput = NonNullable<CreateLendingBody["userLicenses"]>[number];

function licenseFromDerived(
  row: UserLicenseInput,
  derived: DerivedLicenseFields,
  staffCategory: string,
): ResolvedUserLicense {
  return {
    userEmployeeNumber: row.userEmployeeNumber.trim(),
    userStaffCategory: staffCategory,
    decisionContractType: (row.decisionContractType ?? "").trim(),
    decisionWorkContent: (row.decisionWorkContent ?? "").trim(),
    decisionClientEnv: (row.decisionClientEnv ?? "").trim(),
    msOfficeEdition: (row.msOfficeEdition ?? "").trim(),
    licenseTechnoProApply: derived.licenseTechnoProApply,
    licenseUserSoftwareInstall: derived.licenseUserSoftwareInstall,
    licenseTechnoProNetwork: derived.licenseTechnoProNetwork,
    licenseSpecCode: derived.licenseSpecCode,
    lendingStartDate: row.lendingStartDate.trim(),
    expectedReturnDate: row.expectedReturnDate.trim(),
    smartphoneCameraPresence: (row.smartphoneCameraPresence ?? "").trim(),
    smartphoneUserIdentification: (row.smartphoneUserIdentification ?? "").trim(),
    smartphoneWorkplaceUse: (row.smartphoneWorkplaceUse ?? "").trim(),
    peripheralMonitorSize: (row.peripheralMonitorSize ?? "").trim(),
    peripheralMonitorSizeCustom: (row.peripheralMonitorSizeCustom ?? "").trim(),
    peripheralLanCableLength: (row.peripheralLanCableLength ?? "").trim(),
    peripheralLanCableLengthCustom: (row.peripheralLanCableLengthCustom ?? "").trim(),
  };
}

function nonPcLicense(row: UserLicenseInput): ResolvedUserLicense {
  return licenseFromDerived(row, NON_PC, LENDING_NON_PC_STAFF_CATEGORY);
}

function resolvePcLicense(row: UserLicenseInput): ResolveUserLicensesResult {
  const ms = (row.msOfficeEdition ?? "").trim();
  if (!ms) {
    return { ok: false, error: "MicrosoftOfficeのエディションを選択してください。" };
  }
  const staff = (row.userStaffCategory ?? "").trim();
  if (!staff) {
    return { ok: false, error: "利用者区分を選択してください。" };
  }
  const resolution = resolvePcSpecDecision(
    staff,
    (row.decisionContractType ?? "").trim(),
    (row.decisionWorkContent ?? "").trim(),
    (row.decisionClientEnv ?? "").trim(),
    ms,
  );
  if (resolution.kind === "incomplete") {
    return {
      ok: false,
      error:
        "利用者区分・判定プロセス（客先契約形態・業務内容・客先ネットワーク接続）および MicrosoftOfficeのエディションを正しく選択してください。",
    };
  }
  if (resolution.kind === "lending_denied") {
    return { ok: false, error: resolution.message };
  }
  const d = decisionResolutionToLicenseFields(resolution);
  if (!d) {
    return { ok: false, error: "判定結果を確定できませんでした。" };
  }
  if (
    !isMsOfficeEditionAllowedForPcDecision(
      staff,
      (row.decisionContractType ?? "").trim(),
      (row.decisionWorkContent ?? "").trim(),
      (row.decisionClientEnv ?? "").trim(),
      ms,
    )
  ) {
    return {
      ok: false,
      error:
        "MicrosoftOfficeのエディションが、利用者区分・客先契約形態・業務内容・客先ネットワーク接続の組み合わせと一致しません。画面を確認してください。",
    };
  }
  return { ok: true, licenses: [], representative: licenseFromDerived(row, d, staff) };
}

function validateUserEquipmentFields(
  body: CreateLendingBody,
  emp: string,
  row: UserLicenseInput,
  displayName: string,
): string | null {
  const userLines = linesForAssignee(body, emp);
  if (lendingLinesIncludeSmartphone(userLines)) {
    if (!(row.smartphoneCameraPresence ?? "").trim()) {
      return `${displayName}：スマホのカメラ利用の有無を選択してください。`;
    }
    if (!(row.smartphoneUserIdentification ?? "").trim()) {
      return `${displayName}：スマホの利用者の特定の有無を選択してください。`;
    }
    if (!(row.smartphoneWorkplaceUse ?? "").trim()) {
      return `${displayName}：スマホの事業場での利用を選択してください。`;
    }
  }
  if (lendingLinesIncludeEquipment(userLines, "モニター")) {
    if (!(row.peripheralMonitorSize ?? "").trim()) {
      return `${displayName}：モニターのサイズを選択してください。`;
    }
    if (
      row.peripheralMonitorSize.trim() === "その他" &&
      !(row.peripheralMonitorSizeCustom ?? "").trim()
    ) {
      return `${displayName}：モニターのサイズ（詳細）を入力してください。`;
    }
  }
  if (lendingLinesIncludeEquipment(userLines, "LANケーブル")) {
    if (!(row.peripheralLanCableLength ?? "").trim()) {
      return `${displayName}：LANケーブルの長さを選択してください。`;
    }
    if (
      row.peripheralLanCableLength.trim() === "その他" &&
      !(row.peripheralLanCableLengthCustom ?? "").trim()
    ) {
      return `${displayName}：LANケーブルの長さ（詳細）を入力してください。`;
    }
  }
  return null;
}

export function resolveUserLicensesForLendingPost(
  body: CreateLendingBody,
): ResolveUserLicensesResult {
  const repEmp = body.userEmployeeNumber.trim();
  const assigned = assignedEmployeeNumbersFromLines(body);
  if (assigned.length === 0) {
    return { ok: false, error: "貸与機器の割当利用者を特定できません。" };
  }

  let inputLicenses = body.userLicenses ?? [];
  const includesPc = lendingLinesIncludePc(body.lines);

  if (inputLicenses.length === 0 && includesPc) {
    inputLicenses = assigned.map((emp) => ({
      userEmployeeNumber: emp,
      userStaffCategory: body.userStaffCategory.trim(),
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
    }));
  }

  const resolved: ResolvedUserLicense[] = [];

  for (const emp of assigned) {
    const row = inputLicenses.find((l) => l.userEmployeeNumber.trim() === emp);
    if (!row) {
      return {
        ok: false,
        error: `利用者（社員番号: ${emp}）の申請内容が未入力です。申請理由画面で各利用者の設定を入力してください。`,
      };
    }
    if (!row.lendingStartDate?.trim() || !row.expectedReturnDate?.trim()) {
      return {
        ok: false,
        error: `利用者（社員番号: ${emp}）の貸与開始日・返却予定日を入力してください。`,
      };
    }

    const displayName =
      emp === repEmp ? body.userName.trim() || "代表利用者" : `社員番号 ${emp}`;
    const equipErr = validateUserEquipmentFields(body, emp, row, displayName);
    if (equipErr) return { ok: false, error: equipErr };

    const userLines = linesForAssignee(body, emp);
    const userHasPc = userLines.some((l) => isPcEquipmentType(l.equipmentType));

    if (userHasPc) {
      const pcResult = resolvePcLicense(row);
      if (!pcResult.ok) {
        return {
          ok: false,
          error: `${displayName}：${pcResult.error}`,
        };
      }
      resolved.push(pcResult.representative);
    } else {
      resolved.push(nonPcLicense(row));
    }
  }

  const representative =
    resolved.find((l) => l.userEmployeeNumber === repEmp) ??
    nonPcLicense(
      inputLicenses.find((l) => l.userEmployeeNumber.trim() === repEmp) ?? {
        userEmployeeNumber: repEmp,
        userStaffCategory: "",
        decisionContractType: "",
        decisionWorkContent: "",
        decisionClientEnv: "",
        msOfficeEdition: "",
        lendingStartDate: body.lendingStartDate,
        expectedReturnDate: body.expectedReturnDate,
        smartphoneCameraPresence: "",
        smartphoneUserIdentification: "",
        smartphoneWorkplaceUse: "",
        peripheralMonitorSize: "",
        peripheralMonitorSizeCustom: "",
        peripheralLanCableLength: "",
        peripheralLanCableLengthCustom: "",
      },
    );

  if (!includesPc) {
    if (body.userStaffCategory.trim() !== LENDING_NON_PC_STAFF_CATEGORY) {
      return { ok: false, error: "貸与機器のデータが不正です。画面を再読み込みしてやり直してください。" };
    }
  }

  return { ok: true, licenses: resolved, representative };
}
