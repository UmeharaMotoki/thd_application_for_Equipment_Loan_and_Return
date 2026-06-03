import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";
import { deriveUserStaffCategoryFromHr } from "@/lib/userStaffCategoryFromHr";

/** 代表・追加いずれの利用者も同型で保持するプロフィール（画面の userData と同等） */
export type LendingUserProfile = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userAddress: string;
  userContractType: string;
  userStaffCategory: string;
  userCostDeptName: string;
  userCostDeptCode: string;
  userEmail: string;
  userPhone: string;
  userHrEmployeeCategory: string;
  userHrOccupationName: string;
};

export type EmployeeMasterFields = {
  fullName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  departmentCode?: string | null;
  address?: string;
  employmentType?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeCategory?: string | null;
  occupationName?: string | null;
};

export function emptyLendingUserProfile(): LendingUserProfile {
  return {
    userName: "",
    userEmployeeNumber: "",
    userCompanyName: "",
    userDepartmentName: "",
    userAddress: "",
    userContractType: "",
    userStaffCategory: "",
    userCostDeptName: "",
    userCostDeptCode: "",
    userEmail: "",
    userPhone: "",
    userHrEmployeeCategory: "",
    userHrOccupationName: "",
  };
}

export function lendingUserProfileFromEmployee(emp: EmployeeMasterFields): LendingUserProfile {
  const suggested =
    deriveUserStaffCategoryFromHr(emp.employeeCategory, emp.occupationName) || "";
  return {
    userName: emp.fullName,
    userEmployeeNumber: emp.employeeNumber,
    userCompanyName: emp.companyName,
    userDepartmentName: emp.departmentName,
    userAddress: emp.address ?? "",
    userContractType: emp.employmentType ?? "",
    userStaffCategory: suggested,
    userCostDeptName: emp.departmentName,
    userCostDeptCode: normalizeDepartmentCode(emp.departmentCode) ?? emp.departmentCode ?? "",
    userEmail: emp.email ?? "",
    userPhone: emp.phone ?? "",
    userHrEmployeeCategory: emp.employeeCategory ?? "",
    userHrOccupationName: emp.occupationName ?? "",
  };
}

export function resolveStaffCategoryForProfile(profile: LendingUserProfile): string {
  const existing = profile.userStaffCategory.trim();
  if (existing) return existing;
  return (
    deriveUserStaffCategoryFromHr(
      profile.userHrEmployeeCategory,
      profile.userHrOccupationName,
    ) || ""
  );
}

export function getLendingProfileForEmployee(
  employeeNumber: string,
  representative: LendingUserProfile,
  additionalUsers: Array<LendingUserProfile & { userEmployeeNumber: string }>,
): LendingUserProfile {
  const key = employeeNumber.trim();
  if (!key) return emptyLendingUserProfile();
  if (key === representative.userEmployeeNumber.trim()) return representative;
  const add = additionalUsers.find((u) => u.userEmployeeNumber.trim() === key);
  return add ?? emptyLendingUserProfile();
}
