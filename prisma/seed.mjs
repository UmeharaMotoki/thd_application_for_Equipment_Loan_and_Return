import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PC_ASSIST_HQ_ADDRESS = "東京都港区六本木6丁目10番1号 六本木ヒルズ森タワー35階";

/** THD拠点マスタ（部署コード→エリア等）。送付先「利用者と同じ」時のエリア自動出力用 */
const dummyThdLocations = [
  {
    id: randomUUID(),
    departmentCode: "45600107",
    companyName: "テクノプロ株式会社",
    departmentName: "情報システム部",
    area: "首都圏",
    postalCode: "106-6108",
    address: PC_ASSIST_HQ_ADDRESS,
    buildingName: "森タワー",
  },
  {
    id: randomUUID(),
    departmentCode: "45800201",
    companyName: "テクノプロソリューションズ株式会社",
    departmentName: "開発センター",
    area: "首都圏",
    postalCode: "106-6108",
    address: PC_ASSIST_HQ_ADDRESS,
    buildingName: "森タワー",
  },
  {
    id: randomUUID(),
    departmentCode: "45600111",
    companyName: "テクノプロ株式会社",
    departmentName: "本社管理部門",
    area: "首都圏",
    postalCode: "106-6108",
    address: PC_ASSIST_HQ_ADDRESS,
    buildingName: "森タワー",
  },
  {
    id: randomUUID(),
    departmentCode: "45900301",
    companyName: "テクノプロデザイン株式会社",
    departmentName: "UX設計室",
    area: "首都圏",
    postalCode: "106-6108",
    address: PC_ASSIST_HQ_ADDRESS,
    buildingName: "森タワー",
  },
];

/** 人事正本（hr_personnel_record）。社員検索は本テーブル＋ thd_location */
const dummyHrPersonnel = [
  {
    id: randomUUID(),
    employeeNumber: "E10001",
    employeeName: "山田 太郎",
    companyName: "テクノプロ株式会社",
    departmentName: "情報システム部",
    departmentCode: "45600107",
    jobTitleName: "主任",
    systemEmail: "yamada.taro@technopro.com",
    employmentType: "正社員",
    employmentTypeCode: "01",
    employeeCategory: "技術社員",
    occupationName: "システムエンジニア",
  },
  {
    id: randomUUID(),
    employeeNumber: "E10002",
    employeeName: "山田 太郎",
    companyName: "テクノプロソリューションズ株式会社",
    departmentName: "開発センター",
    departmentCode: "45800201",
    jobTitleName: "エンジニア",
    systemEmail: "yamada.taro2@technopro.com",
    employmentType: "正社員",
    employmentTypeCode: "01",
    employeeCategory: "技術社員",
    occupationName: "アプリケーション開発",
  },
  {
    id: randomUUID(),
    employeeNumber: "E10003",
    employeeName: "佐藤 花子",
    companyName: "テクノプロ株式会社",
    departmentName: "人事部",
    departmentCode: "45600111",
    jobTitleName: "課長",
    systemEmail: "sato.hanako@technopro.com",
    employmentType: "正社員",
    employmentTypeCode: "01",
    employeeCategory: "管理社員",
    occupationName: "人事",
  },
  {
    id: randomUUID(),
    employeeNumber: "E10004",
    employeeName: "鈴木 一郎",
    companyName: "テクノプロ株式会社",
    departmentName: "営業本部",
    departmentCode: "45600111",
    jobTitleName: "部長",
    systemEmail: "suzuki.ichiro@technopro.com",
    employmentType: "契約社員（期間の定めあり）",
    employmentTypeCode: "02",
    employeeCategory: "管理社員",
    occupationName: "営業企画",
  },
  {
    id: randomUUID(),
    employeeNumber: "E10005",
    employeeName: "高橋 美咲",
    companyName: "テクノプロデザイン株式会社",
    departmentName: "UX設計室",
    departmentCode: "45900301",
    jobTitleName: "デザイナー",
    systemEmail: "takahashi.misaki@technopro.com",
    employmentType: "派遣社員",
    employmentTypeCode: "03",
    employeeCategory: "技術社員",
    occupationName: "UX設計",
  },
];

const applicationSelectSeedRows = [];

function seedCategory(category, labels) {
  labels.forEach((label, i) => {
    applicationSelectSeedRows.push({
      category,
      label,
      code: null,
      sortOrder: (i + 1) * 10,
    });
  });
}

function seedOption(category, code, label, sortOrder) {
  applicationSelectSeedRows.push({ category, code, label, sortOrder });
}

seedCategory("lending_request_reason", [
  "新規入社のため",
  "案件アサインのため",
  "貸与期間終了に伴う、借り換え",
  "その他",
]);
seedCategory("return_request_reason", [
  "貸与期間満了に伴う返却",
  "退職・異動に伴う返却",
  "機器の借り換えに伴う返却",
  "故障・破損による返却",
  "その他",
]);

/** 機器返却フォーム（参考フォーム準拠） */
seedCategory("return_reason", [
  "退職（管理社員・技術社員）",
  "退職（社外協力者）",
  "異動",
  "転籍",
  "休職",
  "その他",
]);
seedOption("return_main_item", "desktop_pc", "デスクトップPC", 10);
seedOption("return_main_item", "laptop_pc", "ノートPC", 20);
seedOption("return_main_item", "monitor", "モニタ", 30);
seedOption("return_main_item", "smartphone", "スマホ", 40);
seedOption("return_main_item", "feature_phone", "ガラホ", 50);
seedOption("return_main_item", "wifi_router", "Wi-Fiルータ", 60);
seedOption("return_main_item", "usb_memory", "USBメモリ", 65);
seedOption("return_main_item", "external_hdd", "外付けHDD", 66);
seedOption("return_main_item", "external_ssd", "外付けSSD", 67);
seedOption("return_main_item", "sd_card", "SD/microSDカード", 68);
seedOption("return_main_item", "optical_media", "光学メディア（CD/DVD等）", 69);
seedOption("return_main_item", "other", "その他", 70);

const returnAccessories = [
  ["desktop_pc", "デスクトップPC本体"],
  ["desktop_pc", "電源コード"],
  ["desktop_pc", "DVI変換コード"],
  ["desktop_pc", "キーボード"],
  ["desktop_pc", "マウス"],
  ["laptop_pc", "ノートPC本体"],
  ["laptop_pc", "電源コード・ACアダプタ"],
  ["monitor", "モニタ本体"],
  ["monitor", "電源コード"],
  ["monitor", "モニタケーブル (DVI)"],
  ["monitor", "モニタケーブル (VGA)"],
  ["monitor", "モニタケーブル (HDMI)"],
  ["monitor", "モニタケーブル (HDMI⇔VGA変換ケーブル)"],
  ["smartphone", "スマホ本体"],
  ["smartphone", "外箱"],
  ["smartphone", "付属品 (SIMピン等)"],
  ["smartphone", "Lightningケーブル"],
  ["smartphone", "USB電源アダプタ"],
  ["smartphone", "イヤホン"],
  ["feature_phone", "ガラホ本体"],
  ["feature_phone", "外箱・ケーブル類"],
  ["wifi_router", "Wi-Fiルータ本体"],
  ["wifi_router", "外箱・ケーブル類"],
  ["usb_memory", "USBメモリ本体"],
  ["external_hdd", "外付けHDD本体"],
  ["external_ssd", "外付けSSD本体"],
  ["sd_card", "SD/microSDカード本体"],
  ["optical_media", "光学メディア本体"],
];
returnAccessories.forEach(([code, label], i) => {
  seedOption("return_item_accessory", code, label, (i + 1) * 10);
});

seedCategory("return_shipping_box", ["有", "無"]);

seedOption("return_asset_number_label", "desktop_pc", "返却物-資産番号-デスクトップPC", 10);
seedOption("return_asset_number_label", "laptop_pc", "返却物-資産番号-ノートPC", 20);
seedOption("return_asset_number_label", "monitor", "返却物-資産番号-モニタ", 30);
seedOption("return_asset_number_label", "smartphone", "返却物-資産番号-スマホ（電話番号ハイフンなし）", 40);
seedOption("return_asset_number_label", "feature_phone", "返却物-資産番号-ガラホ（電話番号ハイフンなし）", 50);
seedOption("return_asset_number_label", "wifi_router", "返却物-資産番号-Wi-Fiルータ（電話番号ハイフンなし）", 60);
seedOption("return_asset_number_label", "usb_memory", "返却物-資産番号-USBメモリ", 65);
seedOption("return_asset_number_label", "external_hdd", "返却物-資産番号-外付けHDD", 66);
seedOption("return_asset_number_label", "external_ssd", "返却物-資産番号-外付けSSD", 67);
seedOption("return_asset_number_label", "sd_card", "返却物-資産番号-SD/microSDカード", 68);
seedOption("return_asset_number_label", "optical_media", "返却物-資産番号-光学メディア", 69);
seedCategory("decision_contract_type", ["請負準委任", "派遣"]);
seedCategory("decision_work_content", ["開発業務用", "社内業務用"]);
seedCategory("decision_client_env", ["あり", "なし"]);
seedCategory("ms_office_edition", [
  "Standard（標準、Access無）",
  "Professional（Access有）",
  "Office無し",
  "Office(その他)",
  "客先ライセンス使用につき不要",
]);
seedCategory("smartphone_camera", ["カメラあり", "カメラなし"]);
seedCategory("smartphone_user_identification", ["特定する", "特定しない"]);
seedCategory("smartphone_workplace", ["事業場で利用する", "事業場で利用しない"]);
seedCategory("peripheral_monitor_size", ["21.5インチ", "23.8インチ", "27インチ", "その他"]);
seedCategory("peripheral_lan_cable_length", ["1m", "2m", "3m", "5m", "10m", "その他"]);
seedCategory("lending_equipment_type", [
  "ノートPC",
  "デスクトップPC",
  "モニター",
  "マウス",
  "ヘッドセット",
  "LANケーブル",
  "スマホ",
  "Wifiルーター",
]);
seedCategory("user_staff_category", ["管理社員", "技術社員"]);
seedOption("change_request_kind", "user_change", "使用者変更", 10);
seedOption("change_request_kind", "cost_dept_change", "経費負担部門の変更", 20);
seedOption("change_request_kind", "both", "使用者変更と経費負担部門の変更（両方）", 30);
seedOption("change_request_kind", "period_extension", "期間延長", 40);
seedCategory("change_request_equipment_type", [
  "ノートPC",
  "デスクトップPC",
  "モニター",
  "マウス",
  "ヘッドセット",
  "LANケーブル",
  "スマホ",
  "Wifiルーター",
]);

async function main() {
  await prisma.applicationSelectOption.deleteMany({});
  await prisma.hrPersonnelRecord.deleteMany({});
  await prisma.thdLocation.deleteMany({});
  await prisma.hrPersonnelRecord.createMany({ data: dummyHrPersonnel });
  await prisma.thdLocation.createMany({ data: dummyThdLocations });
  await prisma.applicationSelectOption.createMany({
    data: applicationSelectSeedRows.map((r) => ({
      id: randomUUID(),
      category: r.category,
      code: r.code,
      label: r.label,
      sortOrder: r.sortOrder,
      isActive: true,
    })),
  });
  console.log(
    `Seeded ${dummyHrPersonnel.length} HR personnel rows, ${dummyThdLocations.length} THD locations, ${applicationSelectSeedRows.length} application select options.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
