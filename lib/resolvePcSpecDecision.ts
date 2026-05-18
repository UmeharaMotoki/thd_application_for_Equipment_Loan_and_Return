import {
  LICENSE_APPLY_NO,
  LICENSE_APPLY_YES,
  NETWORK_NO,
  NETWORK_YES,
  USER_INSTALL_NO,
  USER_INSTALL_YES,
  type LicenseSpecCode,
} from "@/lib/licenseSpecTree";

/** 利用者区分（判定フロー用） */
export const STAFF_MANAGEMENT = "管理社員";
export const STAFF_TECHNICAL = "技術社員";

/** 技術社員向け・画像の第1段階 */
export const DECISION_CONTRACT_QUASI = "請負準委任";
export const DECISION_CONTRACT_DISPATCH = "派遣";

/** 第2段階 */
export const DECISION_WORK_DEVELOPMENT = "開発業務用";
export const DECISION_WORK_INTERNAL = "社内業務用";

/** 第3段階 */
export const DECISION_CLIENT_YES = "あり";
export const DECISION_CLIENT_NO = "なし";

/** 請負準委任・開発業務用・客先接続「あり」のとき、仕様④（テクノプロライセンス非適用）を選ぶための区分。 */
export const MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED = "客先ライセンス使用につき不要";

/** 表示文言変更前の値（下書き・既存データの互換用） */
const MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED_LEGACY =
  "客先ライセンス仕様につき不要";

function isMsOfficeClientLicenseNotRequiredEdition(ms: string): boolean {
  return (
    ms === MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED ||
    ms === MS_OFFICE_EDITION_CLIENT_LICENSE_NOT_REQUIRED_LEGACY
  );
}

export const MS_OFFICE_EDITION_STANDARD_OPTIONS = [
  "Standard（標準、Access無）",
  "Professional（Access有）",
  "Office無し",
  "Office(その他)",
] as const;

const standardOfficeSet = new Set<string>(MS_OFFICE_EDITION_STANDARD_OPTIONS);

/** PC 判定に対して msOfficeEdition の値が許容か（API・画面リセット用） */
export function isMsOfficeEditionAllowedForPcDecision(
  userStaffCategory: string,
  decisionContractType: string,
  decisionWorkContent: string,
  decisionClientEnv: string,
  msOfficeEdition: string,
): boolean {
  const ms = msOfficeEdition.trim();
  if (!ms) return false;
  const staff = userStaffCategory.trim();
  if (staff === STAFF_MANAGEMENT) {
    return standardOfficeSet.has(ms);
  }
  if (staff !== STAFF_TECHNICAL) return false;
  const c = decisionContractType.trim();
  const w = decisionWorkContent.trim();
  const cl = decisionClientEnv.trim();
  if (!c || !w || !cl) return false;
  if (cl === DECISION_CLIENT_NO) {
    return standardOfficeSet.has(ms);
  }
  // 客先接続「あり」
  if (c === DECISION_CONTRACT_QUASI && w === DECISION_WORK_DEVELOPMENT) {
    return standardOfficeSet.has(ms) || isMsOfficeClientLicenseNotRequiredEdition(ms);
  }
  if (c === DECISION_CONTRACT_DISPATCH && w === DECISION_WORK_DEVELOPMENT) {
    return standardOfficeSet.has(ms);
  }
  return false;
}

/** DB の licenseSpecCode。①〜④は数値文字列、管理社員は M */
export type StoredLicenseSpecCode = LicenseSpecCode | "M";

export type DecisionResolution =
  | { kind: "incomplete" }
  | { kind: "lending_denied"; message: string }
  | { kind: "management_internal" }
  | { kind: "spec"; code: LicenseSpecCode };

export function resolvePcSpecDecision(
  userStaffCategory: string,
  decisionContractType: string,
  decisionWorkContent: string,
  decisionClientEnv: string,
  msOfficeEdition: string,
): DecisionResolution {
  const staff = userStaffCategory.trim();
  if (!staff) return { kind: "incomplete" };

  if (staff === STAFF_MANAGEMENT) {
    return { kind: "management_internal" };
  }

  if (staff !== STAFF_TECHNICAL) return { kind: "incomplete" };

  const c = decisionContractType.trim();
  const w = decisionWorkContent.trim();
  const cl = decisionClientEnv.trim();
  const office = msOfficeEdition.trim();
  if (!c || !w || !cl) return { kind: "incomplete" };

  if (c === DECISION_CONTRACT_QUASI) {
    if (w === DECISION_WORK_DEVELOPMENT) {
      if (cl === DECISION_CLIENT_NO) return { kind: "spec", code: "1" };
      if (cl === DECISION_CLIENT_YES) {
        if (!office) return { kind: "incomplete" };
        if (isMsOfficeClientLicenseNotRequiredEdition(office)) {
          return { kind: "spec", code: "4" };
        }
        if (standardOfficeSet.has(office)) {
          return { kind: "spec", code: "2" };
        }
        return { kind: "incomplete" };
      }
      return { kind: "incomplete" };
    }
    if (w === DECISION_WORK_INTERNAL) {
      if (cl === DECISION_CLIENT_NO) return { kind: "spec", code: "3" };
      return {
        kind: "lending_denied",
        message:
          "請負準委任・社内業務用で客先ネットワーク接続「あり」は貸与不可です。判定フローを確認してください。",
      };
    }
    return { kind: "incomplete" };
  }

  if (c === DECISION_CONTRACT_DISPATCH) {
    if (w === DECISION_WORK_DEVELOPMENT) {
      if (cl === DECISION_CLIENT_NO) {
        return {
          kind: "lending_denied",
          message:
            "派遣・開発業務用で客先ネットワーク接続「なし」は貸与不可です。判定フローを確認してください。",
        };
      }
      return { kind: "spec", code: "4" };
    }
    if (w === DECISION_WORK_INTERNAL) {
      if (cl === DECISION_CLIENT_NO) return { kind: "spec", code: "3" };
      return {
        kind: "lending_denied",
        message:
          "派遣・社内業務用で客先ネットワーク接続「あり」は貸与不可です。判定フローを確認してください。",
      };
    }
    return { kind: "incomplete" };
  }

  return { kind: "incomplete" };
}

export type DerivedLicenseFields = {
  licenseTechnoProApply: string;
  licenseUserSoftwareInstall: string;
  licenseTechnoProNetwork: string;
  licenseSpecCode: StoredLicenseSpecCode;
};

export function decisionResolutionToLicenseFields(
  resolution: DecisionResolution,
): DerivedLicenseFields | null {
  if (resolution.kind === "incomplete" || resolution.kind === "lending_denied") return null;
  if (resolution.kind === "management_internal") {
    return {
      licenseUserSoftwareInstall: USER_INSTALL_NO,
      licenseTechnoProNetwork: NETWORK_YES,
      licenseTechnoProApply: LICENSE_APPLY_YES,
      licenseSpecCode: "M",
    };
  }
  return { ...specCodeToLicenseFields(resolution.code), licenseSpecCode: resolution.code };
}

function specCodeToLicenseFields(
  code: LicenseSpecCode,
): Omit<DerivedLicenseFields, "licenseSpecCode"> {
  switch (code) {
    case "1":
      return {
        licenseUserSoftwareInstall: USER_INSTALL_YES,
        licenseTechnoProNetwork: NETWORK_YES,
        licenseTechnoProApply: LICENSE_APPLY_YES,
      };
    case "2":
      return {
        licenseUserSoftwareInstall: USER_INSTALL_YES,
        licenseTechnoProNetwork: NETWORK_NO,
        licenseTechnoProApply: LICENSE_APPLY_YES,
      };
    case "3":
      return {
        licenseUserSoftwareInstall: USER_INSTALL_NO,
        licenseTechnoProNetwork: NETWORK_YES,
        licenseTechnoProApply: LICENSE_APPLY_NO,
      };
    case "4":
      return {
        licenseUserSoftwareInstall: USER_INSTALL_YES,
        licenseTechnoProNetwork: NETWORK_NO,
        licenseTechnoProApply: LICENSE_APPLY_NO,
      };
  }
}
