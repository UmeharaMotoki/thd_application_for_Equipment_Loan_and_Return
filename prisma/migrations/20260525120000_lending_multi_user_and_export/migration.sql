-- AlterTable
ALTER TABLE "EquipmentRequest" ADD COLUMN "userMode" TEXT NOT NULL DEFAULT 'single';

-- AlterTable
ALTER TABLE "EquipmentLendingLine" ADD COLUMN "assignedUserEmployeeNumber" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "EquipmentLendingAdditionalUser" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userName" TEXT NOT NULL,
    "userEmployeeNumber" TEXT NOT NULL,
    "userCompanyName" TEXT NOT NULL DEFAULT '',
    "userDepartmentName" TEXT NOT NULL DEFAULT '',
    "userContractType" TEXT NOT NULL DEFAULT '',
    "userCostDeptName" TEXT NOT NULL DEFAULT '',
    "userCostDeptCode" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "userPhone" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EquipmentLendingAdditionalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentLendingUserLicense" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userEmployeeNumber" TEXT NOT NULL,
    "userStaffCategory" TEXT NOT NULL,
    "decisionContractType" TEXT NOT NULL DEFAULT '',
    "decisionWorkContent" TEXT NOT NULL DEFAULT '',
    "decisionClientEnv" TEXT NOT NULL DEFAULT '',
    "msOfficeEdition" TEXT NOT NULL DEFAULT '',
    "licenseTechnoProApply" TEXT NOT NULL,
    "licenseUserSoftwareInstall" TEXT NOT NULL,
    "licenseTechnoProNetwork" TEXT NOT NULL,
    "licenseSpecCode" TEXT NOT NULL,

    CONSTRAINT "EquipmentLendingUserLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentLendingAdditionalUser_requestId_idx" ON "EquipmentLendingAdditionalUser"("requestId");

-- CreateIndex
CREATE INDEX "EquipmentLendingUserLicense_requestId_idx" ON "EquipmentLendingUserLicense"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentLendingUserLicense_requestId_userEmployeeNumber_key" ON "EquipmentLendingUserLicense"("requestId", "userEmployeeNumber");

-- AddForeignKey
ALTER TABLE "EquipmentLendingAdditionalUser" ADD CONSTRAINT "EquipmentLendingAdditionalUser_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EquipmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLendingUserLicense" ADD CONSTRAINT "EquipmentLendingUserLicense_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EquipmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
