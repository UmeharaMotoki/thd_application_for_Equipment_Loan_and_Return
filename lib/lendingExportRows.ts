import type {
  EquipmentLendingAdditionalUser,
  EquipmentLendingLine,
  EquipmentLendingUserLicense,
  EquipmentRequest,
} from "@prisma/client";
import { formatDateOnlyUtc } from "@/lib/mapEquipmentRequestToPrefill";
import type { CreateLendingBody } from "@/lib/lendingUserPool";

const BASE_HEADERS = [
  "区分",
  "氏名",
  "社員番号",
  "所属会社",
  "所属部署",
  "住所",
  "メールアドレス",
  "電話番号",
] as const;

const DATE_HEADERS = ["貸与開始日", "返却予定日"] as const;

export type LendingPersonExportRow = {
  kubun: "申請者情報" | "送付先情報" | "代表利用者情報" | "追加利用者情報";
  name: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
  email: string;
  phone: string;
  /** 割当機器名（sortOrder 昇順） */
  equipmentTypes: string[];
  lendingStartDate: string;
  expectedReturnDate: string;
};

export type LendingExportLine = Pick<
  EquipmentLendingLine,
  "equipmentType" | "sortOrder" | "assignedUserEmployeeNumber"
>;

export type LendingExportUserLicense = Pick<
  EquipmentLendingUserLicense,
  "userEmployeeNumber" | "lendingStartDate" | "expectedReturnDate"
>;

export type LendingExportSource = EquipmentRequest & {
  additionalUsers?: EquipmentLendingAdditionalUser[];
  lines?: LendingExportLine[];
  userLicenses?: LendingExportUserLicense[];
};

export type LendingPersonExportSheet = {
  headers: string[];
  rows: LendingPersonExportRow[];
  maxEquipmentSlots: number;
};

function formatExportDate(value: Date | string | null | undefined): string {
  if (value == null) return "";
  if (value instanceof Date) return formatDateOnlyUtc(value);
  const s = String(value).trim();
  if (!s) return "";
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function assigneeEmployeeNumber(
  line: { assignedUserEmployeeNumber: string },
  representativeEmployeeNumber: string,
): string {
  return line.assignedUserEmployeeNumber.trim() || representativeEmployeeNumber.trim();
}

function equipmentTypesForEmployee(
  employeeNumber: string,
  repEmp: string,
  lines: LendingExportLine[],
): string[] {
  const key = employeeNumber.trim();
  if (!key) return [];
  return [...lines]
    .filter((l) => assigneeEmployeeNumber(l, repEmp) === key && l.equipmentType.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((l) => l.equipmentType.trim());
}

function buildLicenseDateMap(
  repEmp: string,
  request: LendingExportSource,
): Map<string, { lendingStartDate: string; expectedReturnDate: string }> {
  const map = new Map<string, { lendingStartDate: string; expectedReturnDate: string }>();
  const headerStart = formatExportDate(request.lendingStartDate);
  const headerEnd = formatExportDate(request.expectedReturnDate);
  if (headerStart || headerEnd) {
    map.set(repEmp, { lendingStartDate: headerStart, expectedReturnDate: headerEnd });
  }
  for (const lic of request.userLicenses ?? []) {
    const emp = lic.userEmployeeNumber.trim();
    if (!emp) continue;
    map.set(emp, {
      lendingStartDate: formatExportDate(lic.lendingStartDate),
      expectedReturnDate: formatExportDate(lic.expectedReturnDate),
    });
  }
  return map;
}

function datesForEmployee(
  employeeNumber: string,
  licenseByEmp: Map<string, { lendingStartDate: string; expectedReturnDate: string }>,
): { lendingStartDate: string; expectedReturnDate: string } {
  return (
    licenseByEmp.get(employeeNumber.trim()) ?? {
      lendingStartDate: "",
      expectedReturnDate: "",
    }
  );
}

export function buildEquipmentExportHeaders(maxSlots: number): string[] {
  const equipmentCols = Array.from({ length: maxSlots }, (_, i) => `貸与機器${i + 1}`);
  return [...BASE_HEADERS, ...equipmentCols, ...DATE_HEADERS];
}

function personRow(
  kubun: LendingPersonExportRow["kubun"],
  base: Omit<LendingPersonExportRow, "kubun" | "equipmentTypes" | "lendingStartDate" | "expectedReturnDate">,
  equipmentTypes: string[],
  dates: { lendingStartDate: string; expectedReturnDate: string },
): LendingPersonExportRow {
  return {
    kubun,
    ...base,
    equipmentTypes,
    lendingStartDate: dates.lendingStartDate,
    expectedReturnDate: dates.expectedReturnDate,
  };
}

export function buildLendingPersonExportSheet(request: LendingExportSource): LendingPersonExportSheet {
  const repEmp = request.userEmployeeNumber.trim();
  const lines = request.lines ?? [];
  const licenseByEmp = buildLicenseDateMap(repEmp, request);

  const rows: LendingPersonExportRow[] = [
    personRow(
      "申請者情報",
      {
        name: request.applicantName.trim(),
        employeeNumber: request.employeeNumber.trim(),
        companyName: request.companyName.trim(),
        departmentName: request.departmentName.trim(),
        address: request.address.trim(),
        email: request.applicantEmail.trim(),
        phone: request.applicantPhone.trim(),
      },
      [],
      { lendingStartDate: "", expectedReturnDate: "" },
    ),
    personRow(
      "送付先情報",
      {
        name: request.deliveryName.trim(),
        employeeNumber: request.deliveryEmployeeNumber.trim(),
        companyName: request.deliveryCompanyName.trim(),
        departmentName: request.deliveryDepartment.trim(),
        address: [request.deliveryAddress.trim(), request.deliveryBuilding.trim()]
          .filter(Boolean)
          .join(" "),
        email: request.deliveryEmail.trim(),
        phone: request.deliveryPhone.trim(),
      },
      [],
      { lendingStartDate: "", expectedReturnDate: "" },
    ),
    personRow(
      "代表利用者情報",
      {
        name: request.userName.trim(),
        employeeNumber: repEmp,
        companyName: request.userCompanyName.trim(),
        departmentName: request.userDepartmentName.trim(),
        address: request.userAddress.trim(),
        email: request.userEmail.trim(),
        phone: request.userPhone.trim(),
      },
      equipmentTypesForEmployee(repEmp, repEmp, lines),
      datesForEmployee(repEmp, licenseByEmp),
    ),
  ];

  const mode = (request.userMode ?? "single").trim();
  if (mode === "multiple" && request.additionalUsers?.length) {
    const sorted = [...request.additionalUsers].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const u of sorted) {
      const emp = u.userEmployeeNumber.trim();
      rows.push(
        personRow(
          "追加利用者情報",
          {
            name: u.userName.trim(),
            employeeNumber: emp,
            companyName: u.userCompanyName.trim(),
            departmentName: u.userDepartmentName.trim(),
            address: String(
              (u as EquipmentLendingAdditionalUser & { userAddress?: string }).userAddress ?? "",
            ).trim(),
            email: u.userEmail.trim(),
            phone: u.userPhone.trim(),
          },
          equipmentTypesForEmployee(emp, repEmp, lines),
          datesForEmployee(emp, licenseByEmp),
        ),
      );
    }
  }

  const maxEquipmentSlots = rows.reduce((max, r) => Math.max(max, r.equipmentTypes.length), 0);
  return {
    headers: buildEquipmentExportHeaders(maxEquipmentSlots),
    rows,
    maxEquipmentSlots,
  };
}

/** @deprecated Use buildLendingPersonExportSheet */
export function buildLendingPersonExportRows(request: LendingExportSource): LendingPersonExportRow[] {
  return buildLendingPersonExportSheet(request).rows;
}

/** DB 未保存・フォールバック時に Excel 出力用の申請スナップショットを組み立てる */
export function buildLendingExportSourceFromPost(
  body: CreateLendingBody,
  applicationCorrelationId: string,
  lendingStart: Date,
  expectedReturn: Date,
): LendingExportSource {
  const repEmp = body.userEmployeeNumber.trim();
  return {
    applicationCorrelationId,
    applicantName: body.applicantName,
    employeeNumber: body.employeeNumber,
    companyName: body.companyName,
    departmentName: body.departmentName,
    address: body.address,
    applicantEmail: body.applicantEmail ?? "",
    applicantPhone: body.applicantPhone ?? "",
    deliveryName: body.deliveryName ?? "",
    deliveryEmployeeNumber: body.deliveryEmployeeNumber ?? "",
    deliveryCompanyName: body.deliveryCompanyName ?? "",
    deliveryDepartment: body.deliveryDepartment ?? "",
    deliveryAddress: body.deliveryAddress ?? "",
    deliveryBuilding: body.deliveryBuilding ?? "",
    deliveryEmail: body.deliveryEmail ?? "",
    deliveryPhone: body.deliveryPhone ?? "",
    userName: body.userName,
    userEmployeeNumber: repEmp,
    userCompanyName: body.userCompanyName,
    userDepartmentName: body.userDepartmentName,
    userAddress: body.userAddress,
    userEmail: body.userEmail ?? "",
    userPhone: body.userPhone ?? "",
    lendingStartDate: lendingStart,
    expectedReturnDate: expectedReturn,
    userMode: (body.userMode ?? "single").trim() === "multiple" ? "multiple" : "single",
    lines: body.lines.map((line, sortOrder) => ({
      equipmentType: line.equipmentType,
      sortOrder,
      assignedUserEmployeeNumber: line.assignedUserEmployeeNumber.trim() || repEmp,
    })),
    userLicenses: (body.userLicenses ?? []).map((lic) => ({
      userEmployeeNumber: lic.userEmployeeNumber,
      lendingStartDate: lic.lendingStartDate,
      expectedReturnDate: lic.expectedReturnDate,
    })),
    additionalUsers: (body.additionalUsers ?? []).map((u, sortOrder) => ({
      id: `export-${sortOrder}`,
      requestId: "",
      sortOrder,
      userName: u.userName,
      userEmployeeNumber: u.userEmployeeNumber,
      userCompanyName: u.userCompanyName ?? "",
      userDepartmentName: u.userDepartmentName ?? "",
      userAddress: u.userAddress ?? "",
      userContractType: u.userContractType ?? "",
      userCostDeptName: u.userCostDeptName ?? "",
      userCostDeptCode: u.userCostDeptCode ?? "",
      userEmail: u.userEmail ?? "",
      userPhone: u.userPhone ?? "",
    })),
  } as unknown as LendingExportSource;
}
