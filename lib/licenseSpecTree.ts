/**
 * 仕様表（①〜④）に基づくライセンス関連の分岐。
 * 列: ユーザーによるソフトウェアのインストール / テクノプロネットワークへの接続 / テクノプロ保有ライセンスの適用
 */

export type LicenseSpecCode = "1" | "2" | "3" | "4";

/** 画面上の表記（①〜④） */
export const LICENSE_SPEC_MARK: Record<LicenseSpecCode, string> = {
  "1": "①",
  "2": "②",
  "3": "③",
  "4": "④",
};

export type SpecTreeNode = {
  label: string;
  children?: SpecTreeNode[];
};

export const LICENSE_APPLY_YES = "適用する";
export const LICENSE_APPLY_NO = "適用しない";
export const USER_INSTALL_YES = "許可する";
export const USER_INSTALL_NO = "許可しない";
export const NETWORK_YES = "接続する";
export const NETWORK_NO = "接続しない";

export const LICENSE_SPEC_ROWS: Record<
  LicenseSpecCode,
  { userInstall: string; network: string; licenseApply: string }
> = {
  "1": {
    userInstall: "○（※）",
    network: "○",
    licenseApply: "○",
  },
  "2": {
    userInstall: "○",
    network: "×",
    licenseApply: "○",
  },
  "3": {
    userInstall: "×",
    network: "○",
    licenseApply: "×",
  },
  "4": {
    userInstall: "○",
    network: "×",
    licenseApply: "×",
  },
};

/**
 * 画像の仕様①〜④の能力表に載る4通りのみ有効。
 * （管理社員の固定社内仕様は ×／○／○ で、①〜④のいずれとも異なるため、属性連動の選択に切り替える予定）
 */
export function resolveLicenseSpec(
  licenseTechnoProApply: string,
  licenseUserSoftwareInstall: string,
  licenseTechnoProNetwork: string,
): { code: LicenseSpecCode } | { error: string } {
  const L = licenseTechnoProApply === LICENSE_APPLY_YES;
  const I = licenseUserSoftwareInstall === USER_INSTALL_YES;
  const N = licenseTechnoProNetwork === NETWORK_YES;

  if (I && N && L) return { code: "1" };
  if (I && !N && L) return { code: "2" };
  if (!I && N && !L) return { code: "3" };
  if (I && !N && !L) return { code: "4" };

  return {
    error:
      "選択の組合せは仕様①〜④のいずれにも該当しません。利用者属性（管理／技術）と客先契約形態・業務・客先ネットワーク接続の分岐を確認してください。",
  };
}
