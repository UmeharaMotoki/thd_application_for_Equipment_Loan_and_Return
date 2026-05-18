-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "departmentCode" TEXT,
    "address" TEXT NOT NULL,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentRequest" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "applicantJobTitle" TEXT NOT NULL DEFAULT '',
    "applicantEmail" TEXT NOT NULL DEFAULT '',
    "applicantPhone" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL,
    "userEmployeeNumber" TEXT NOT NULL,
    "userCompanyName" TEXT NOT NULL,
    "userDepartmentName" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "userContractType" TEXT NOT NULL,
    "userCostDeptName" TEXT NOT NULL DEFAULT '',
    "userCostDeptCode" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "userPhone" TEXT NOT NULL DEFAULT '',
    "deliveryName" TEXT NOT NULL DEFAULT '',
    "deliveryCompanyName" TEXT NOT NULL DEFAULT '',
    "deliveryDepartment" TEXT NOT NULL DEFAULT '',
    "deliveryArea" TEXT NOT NULL DEFAULT '',
    "deliveryPostalCode" TEXT NOT NULL DEFAULT '',
    "deliveryAddress" TEXT NOT NULL DEFAULT '',
    "deliveryBuilding" TEXT NOT NULL DEFAULT '',
    "deliveryEmail" TEXT NOT NULL DEFAULT '',
    "deliveryPhone" TEXT NOT NULL DEFAULT '',
    "userStaffCategory" TEXT NOT NULL,
    "decisionContractType" TEXT NOT NULL DEFAULT '',
    "decisionWorkContent" TEXT NOT NULL DEFAULT '',
    "decisionClientEnv" TEXT NOT NULL DEFAULT '',
    "licenseTechnoProApply" TEXT NOT NULL,
    "licenseUserSoftwareInstall" TEXT NOT NULL,
    "licenseTechnoProNetwork" TEXT NOT NULL,
    "licenseSpecCode" TEXT NOT NULL,
    "smartphoneCameraPresence" TEXT NOT NULL DEFAULT '',
    "smartphoneUserIdentification" TEXT NOT NULL DEFAULT '',
    "smartphoneWorkplaceUse" TEXT NOT NULL DEFAULT '',
    "peripheralMonitorSize" TEXT NOT NULL DEFAULT '',
    "peripheralMonitorSizeCustom" TEXT NOT NULL DEFAULT '',
    "peripheralLanCableLength" TEXT NOT NULL DEFAULT '',
    "peripheralLanCableLengthCustom" TEXT NOT NULL DEFAULT '',
    "requestReason" TEXT NOT NULL,
    "requestDetail" TEXT NOT NULL DEFAULT '',
    "lendingStartDate" DATE NOT NULL,
    "expectedReturnDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentLendingLine" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EquipmentLendingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentReturnRequest" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "applicantJobTitle" TEXT NOT NULL DEFAULT '',
    "applicantEmail" TEXT NOT NULL DEFAULT '',
    "applicantPhone" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL,
    "userEmployeeNumber" TEXT NOT NULL,
    "userCompanyName" TEXT NOT NULL,
    "userDepartmentName" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "userContractType" TEXT NOT NULL,
    "userCostDeptName" TEXT NOT NULL DEFAULT '',
    "userCostDeptCode" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "userPhone" TEXT NOT NULL DEFAULT '',
    "deliveryName" TEXT NOT NULL DEFAULT '',
    "deliveryCompanyName" TEXT NOT NULL DEFAULT '',
    "deliveryDepartment" TEXT NOT NULL DEFAULT '',
    "deliveryArea" TEXT NOT NULL DEFAULT '',
    "deliveryPostalCode" TEXT NOT NULL DEFAULT '',
    "deliveryAddress" TEXT NOT NULL DEFAULT '',
    "deliveryBuilding" TEXT NOT NULL DEFAULT '',
    "deliveryEmail" TEXT NOT NULL DEFAULT '',
    "deliveryPhone" TEXT NOT NULL DEFAULT '',
    "requestReason" TEXT NOT NULL,
    "requestDetail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentReturnLine" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "equipmentName" TEXT NOT NULL,
    "lendingDueDate" DATE NOT NULL,
    "expectedReturnDate" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EquipmentReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_personnel_record" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "employeeName" TEXT,
    "employeeNameKana" TEXT,
    "companyCode" TEXT,
    "companyName" TEXT,
    "departmentCode" TEXT,
    "departmentName" TEXT,
    "jobTitleCode" TEXT,
    "jobTitleName" TEXT,
    "employeeCategoryCode" TEXT,
    "employeeCategory" TEXT,
    "positionCode" TEXT,
    "positionName" TEXT,
    "occupationCode" TEXT,
    "occupationName" TEXT,
    "employmentTypeCode" TEXT,
    "employmentType" TEXT,
    "groupJoinDate" TEXT,
    "hireDate" TEXT,
    "secondmentCompanyCode" TEXT,
    "secondmentCompanyName" TEXT,
    "secondmentDeptCode" TEXT,
    "secondmentDeptName" TEXT,
    "retirementCategoryCode" TEXT,
    "retirementCategory" TEXT,
    "retirementOrderName" TEXT,
    "retirementDate" TEXT,
    "birthDate" TEXT,
    "businessCompanyCode" TEXT,
    "businessCompanyShort" TEXT,
    "legalNameKanji" TEXT,
    "adAccount" TEXT,
    "systemEmail" TEXT,
    "leaveCategory" TEXT,
    "leaveDate" TEXT,
    "returnScheduledDate" TEXT,
    "recruitmentCategory" TEXT,
    "previousCompany" TEXT,
    "residentSiteCode" TEXT,
    "residentSiteName" TEXT,
    "tentativeHireCategory" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_personnel_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_site_master" (
    "id" TEXT NOT NULL,
    "deliveryCompanyName" TEXT,
    "deliverySite" TEXT,
    "searchKey" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "building" TEXT,
    "phone" TEXT,
    "itamLocation" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_site_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thd_location" (
    "id" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "companyName" TEXT,
    "departmentName" TEXT,
    "residentSiteName" TEXT,
    "deliverySite" TEXT,
    "area" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "buildingName" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thd_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_import_log" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "rowCount" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_import_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Employee_fullName_idx" ON "Employee"("fullName");

-- CreateIndex
CREATE INDEX "Employee_departmentCode_idx" ON "Employee"("departmentCode");

-- CreateIndex
CREATE INDEX "EquipmentLendingLine_requestId_idx" ON "EquipmentLendingLine"("requestId");

-- CreateIndex
CREATE INDEX "EquipmentReturnLine_requestId_idx" ON "EquipmentReturnLine"("requestId");

-- CreateIndex
CREATE INDEX "hr_personnel_record_employeeNumber_idx" ON "hr_personnel_record"("employeeNumber");

-- CreateIndex
CREATE INDEX "hr_personnel_record_departmentCode_idx" ON "hr_personnel_record"("departmentCode");

-- CreateIndex
CREATE INDEX "delivery_site_master_searchKey_idx" ON "delivery_site_master"("searchKey");

-- CreateIndex
CREATE INDEX "delivery_site_master_deliverySite_idx" ON "delivery_site_master"("deliverySite");

-- CreateIndex
CREATE INDEX "thd_location_departmentCode_idx" ON "thd_location"("departmentCode");

-- CreateIndex
CREATE INDEX "thd_location_deliverySite_idx" ON "thd_location"("deliverySite");

-- CreateIndex
CREATE INDEX "master_import_log_kind_createdAt_idx" ON "master_import_log"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "EquipmentLendingLine" ADD CONSTRAINT "EquipmentLendingLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EquipmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentReturnLine" ADD CONSTRAINT "EquipmentReturnLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EquipmentReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
