import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";
import type { EmployeeMasterFields } from "@/lib/lendingUserProfile";

export type ChangeRequestUserProfile = {
  userName: string;
  userEmployeeNumber: string;
  userCompanyName: string;
  userDepartmentName: string;
  userDepartmentCode: string;
  userCostDeptName: string;
  userCostDeptCode: string;
};

export function emptyChangeRequestUserProfile(): ChangeRequestUserProfile {
  return {
    userName: "",
    userEmployeeNumber: "",
    userCompanyName: "",
    userDepartmentName: "",
    userDepartmentCode: "",
    userCostDeptName: "",
    userCostDeptCode: "",
  };
}

export function changeRequestUserFromEmployee(emp: EmployeeMasterFields): ChangeRequestUserProfile {
  const deptCode = normalizeDepartmentCode(emp.departmentCode) ?? emp.departmentCode ?? "";
  return {
    userName: emp.fullName,
    userEmployeeNumber: emp.employeeNumber,
    userCompanyName: emp.companyName,
    userDepartmentName: emp.departmentName,
    userDepartmentCode: deptCode,
    userCostDeptName: emp.departmentName,
    userCostDeptCode: deptCode,
  };
}

export type ChangeRequestApplicantData = {
  applicantName: string;
  employeeNumber: string;
  companyName: string;
  departmentName: string;
  address: string;
  applicantJobTitle: string;
  applicantEmail: string;
  applicantPhone: string;
};

export function emptyChangeRequestApplicant(): ChangeRequestApplicantData {
  return {
    applicantName: "",
    employeeNumber: "",
    companyName: "",
    departmentName: "",
    address: "",
    applicantJobTitle: "",
    applicantEmail: "",
    applicantPhone: "",
  };
}

export function applicantFromEmployee(
  emp: EmployeeMasterFields & { jobTitle?: string | null },
): ChangeRequestApplicantData {
  return {
    applicantName: emp.fullName,
    employeeNumber: emp.employeeNumber,
    companyName: emp.companyName,
    departmentName: emp.departmentName,
    address: emp.address ?? "",
    applicantJobTitle: emp.jobTitle ?? "",
    applicantEmail: emp.email ?? "",
    applicantPhone: emp.phone ?? "",
  };
}
