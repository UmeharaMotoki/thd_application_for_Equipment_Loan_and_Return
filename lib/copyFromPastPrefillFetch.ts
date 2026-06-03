import type { LendingRequestPrefillPayload } from "@/lib/mapEquipmentRequestToPrefill";
import type { EquipmentReturnPrefillPayload } from "@/lib/mapEquipmentReturnRequestToPrefill";
import { deriveUserStaffCategoryFromHr } from "@/lib/userStaffCategoryFromHr";
import type { NamedArchiveKind } from "@/lib/namedRequestArchives";

type MasterEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  companyName: string;
  departmentName: string;
  departmentCode?: string | null;
  address: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  employmentType: string | null;
  employeeCategory: string | null;
  occupationName: string | null;
};

export type ResolvedArchiveApplicant = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
  applicantJobTitle: string;
  applicantEmail: string;
  applicantPhone: string;
};

async function fetchMasterEmployees(q: string): Promise<MasterEmployee[]> {
  if (!q.trim()) return [];
  try {
    const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q.trim())}`);
    const data = (await res.json()) as { employees?: MasterEmployee[] };
    if (!res.ok) return [];
    return data.employees ?? [];
  } catch {
    return [];
  }
}

async function findMasterByEmployeeNumber(employeeNumber: string): Promise<MasterEmployee | null> {
  const emp = employeeNumber.trim();
  if (!emp) return null;
  const rows = await fetchMasterEmployees(emp);
  return rows.find((e) => e.employeeNumber.trim() === emp) ?? null;
}

async function findMasterByName(name: string, employeeNumber?: string): Promise<MasterEmployee | null> {
  const rows = await fetchMasterEmployees(name);
  const num = employeeNumber?.trim();
  if (num) {
    const byNum = rows.find((e) => e.employeeNumber.trim() === num);
    if (byNum) return byNum;
  }
  const normalized = name.trim();
  if (!normalized) return null;
  const exact = rows.filter((e) => e.fullName.trim() === normalized);
  return exact.length === 1 ? exact[0] : null;
}

export async function fetchPastRequestPrefill(
  kind: NamedArchiveKind,
  requestId: string,
  applicantEmployeeNumber: string,
): Promise<LendingRequestPrefillPayload | EquipmentReturnPrefillPayload> {
  const q = new URLSearchParams({ applicantEmployeeNumber: applicantEmployeeNumber.trim() });
  if (kind === "lending") {
    const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}?${q.toString()}`);
    const data = (await res.json()) as { prefill?: LendingRequestPrefillPayload; error?: string };
    if (!res.ok || !data.prefill) {
      throw new Error(data.error ?? "申請の取得に失敗しました。");
    }
    return data.prefill;
  }

  const res = await fetch(`/api/equipment-returns/${encodeURIComponent(requestId)}?${q.toString()}`);
  const data = (await res.json()) as { prefill?: EquipmentReturnPrefillPayload; error?: string };
  if (!res.ok || !data.prefill) {
    throw new Error(data.error ?? "申請の取得に失敗しました。");
  }
  return data.prefill;
}

export async function resolveApplicantFromMaster(
  applicantName: string,
  applicantEmployeeNumber: string,
): Promise<ResolvedArchiveApplicant> {
  const emp = applicantEmployeeNumber.trim();
  const fallback: ResolvedArchiveApplicant = {
    applicantName: applicantName.trim(),
    employeeNumber: emp,
    companyName: "",
    departmentName: "",
    address: "",
    applicantJobTitle: "",
    applicantEmail: "",
    applicantPhone: "",
  };
  const match = await findMasterByEmployeeNumber(emp);
  if (!match) return fallback;
  return {
    applicantName: match.fullName,
    employeeNumber: match.employeeNumber,
    companyName: match.companyName,
    departmentName: match.departmentName,
    address: match.address,
    applicantJobTitle: match.jobTitle ?? "",
    applicantEmail: match.email ?? "",
    applicantPhone: match.phone ?? "",
  };
}

function mergeApplicantIntoLendingPrefill(
  prefill: LendingRequestPrefillPayload,
  applicant: ResolvedArchiveApplicant,
): LendingRequestPrefillPayload {
  return {
    ...prefill,
    applicant: {
      ...prefill.applicant,
      ...applicant,
    },
  };
}

function mergeApplicantIntoReturnPrefill(
  prefill: EquipmentReturnPrefillPayload,
  applicant: ResolvedArchiveApplicant,
): EquipmentReturnPrefillPayload {
  return {
    ...prefill,
    applicant: {
      applicantName: applicant.applicantName,
      employeeNumber: applicant.employeeNumber,
      companyName: applicant.companyName,
      departmentName: applicant.departmentName,
      address: applicant.address,
    },
  };
}

/** 利用者・送付先の社員番号など、DB に無い項目をマスタで補完する */
export async function enrichLendingPrefillForCopy(
  prefill: LendingRequestPrefillPayload,
): Promise<LendingRequestPrefillPayload> {
  let next: LendingRequestPrefillPayload = { ...prefill };

  if (next.user.userEmployeeNumber.trim()) {
    const userMaster = await findMasterByEmployeeNumber(next.user.userEmployeeNumber);
    if (userMaster) {
      const suggested =
        deriveUserStaffCategoryFromHr(userMaster.employeeCategory, userMaster.occupationName) ||
        next.user.userStaffCategory;
      next = {
        ...next,
        user: {
          ...next.user,
          userName: userMaster.fullName || next.user.userName,
          userEmployeeNumber: userMaster.employeeNumber,
          userCompanyName: userMaster.companyName || next.user.userCompanyName,
          userDepartmentName: userMaster.departmentName || next.user.userDepartmentName,
          userAddress: userMaster.address || next.user.userAddress,
          userContractType: userMaster.employmentType ?? next.user.userContractType,
          userStaffCategory: suggested || next.user.userStaffCategory,
          userCostDeptName: userMaster.departmentName || next.user.userCostDeptName,
          userCostDeptCode: userMaster.departmentCode?.trim() || next.user.userCostDeptCode,
          userEmail: userMaster.email ?? next.user.userEmail,
          userPhone: userMaster.phone ?? next.user.userPhone,
          userHrEmployeeCategory: userMaster.employeeCategory ?? "",
          userHrOccupationName: userMaster.occupationName ?? "",
        },
      };
    }
  }

  if (next.delivery.deliverySameAsUser) {
    next = {
      ...next,
      delivery: {
        ...next.delivery,
        deliverySameAsUser: true,
        deliveryName: next.user.userName,
        deliveryEmployeeNumber: next.user.userEmployeeNumber,
        deliveryCompanyName: next.user.userCompanyName,
        deliveryDepartment: next.user.userDepartmentName,
        deliveryAddress: next.user.userAddress || next.delivery.deliveryAddress,
        deliveryEmail: next.user.userEmail,
        deliveryPhone: next.user.userPhone,
      },
    };
  } else if (!next.delivery.deliveryEmployeeNumber.trim() && next.delivery.deliveryName.trim()) {
    let deliveryEmp = "";
    if (next.delivery.deliveryName.trim() === next.user.userName.trim()) {
      deliveryEmp = next.user.userEmployeeNumber;
    } else {
      const deliveryMaster = await findMasterByName(next.delivery.deliveryName);
      deliveryEmp = deliveryMaster?.employeeNumber ?? "";
    }
    if (deliveryEmp) {
      next = {
        ...next,
        delivery: {
          ...next.delivery,
          deliveryEmployeeNumber: deliveryEmp,
        },
      };
    }
  }

  return next;
}

/** 返却申請: 申請者・利用者をマスタで補完する */
export async function enrichReturnPrefillForCopy(
  prefill: EquipmentReturnPrefillPayload,
): Promise<EquipmentReturnPrefillPayload> {
  let next: EquipmentReturnPrefillPayload = { ...prefill };

  const applicantMaster = await findMasterByEmployeeNumber(next.applicant.employeeNumber);
  if (applicantMaster) {
    next = {
      ...next,
      applicant: {
        applicantName: applicantMaster.fullName || next.applicant.applicantName,
        employeeNumber: applicantMaster.employeeNumber,
        companyName: applicantMaster.companyName || next.applicant.companyName,
        departmentName: applicantMaster.departmentName || next.applicant.departmentName,
        address: applicantMaster.address || next.applicant.address,
      },
    };
  }

  const userMaster = await findMasterByEmployeeNumber(next.user.userEmployeeNumber);
  if (userMaster) {
    next = {
      ...next,
      user: {
        userName: userMaster.fullName || next.user.userName,
        userEmployeeNumber: userMaster.employeeNumber,
        userCompanyName: userMaster.companyName || next.user.userCompanyName,
        userDepartmentName: userMaster.departmentName || next.user.userDepartmentName,
        userAddress: userMaster.address || next.user.userAddress,
        userContractType: userMaster.employmentType ?? next.user.userContractType,
      },
    };
  }

  return next;
}

/** テンプレ保存・再利用: 申請内容に申請者情報を反映し、マスタで不足項目を補完したプリフィル */
export async function buildArchivePrefill(
  kind: NamedArchiveKind,
  requestId: string,
  applicantName: string,
  applicantEmployeeNumber: string,
): Promise<LendingRequestPrefillPayload | EquipmentReturnPrefillPayload> {
  const prefill = await fetchPastRequestPrefill(kind, requestId, applicantEmployeeNumber);
  const applicant = await resolveApplicantFromMaster(applicantName, applicantEmployeeNumber);
  if (kind === "lending") {
    const merged = mergeApplicantIntoLendingPrefill(prefill as LendingRequestPrefillPayload, applicant);
    return enrichLendingPrefillForCopy(merged);
  }
  const merged = mergeApplicantIntoReturnPrefill(prefill as EquipmentReturnPrefillPayload, applicant);
  return enrichReturnPrefillForCopy(merged);
}
