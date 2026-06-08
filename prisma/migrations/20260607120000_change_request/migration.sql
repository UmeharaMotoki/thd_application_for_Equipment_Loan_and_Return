-- CreateTable
CREATE TABLE "change_request" (
    "id" TEXT NOT NULL,
    "applicationCorrelationId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "applicantJobTitle" TEXT NOT NULL DEFAULT '',
    "applicantEmail" TEXT NOT NULL DEFAULT '',
    "applicantPhone" TEXT NOT NULL DEFAULT '',
    "changeKind" TEXT NOT NULL,
    "currentUserName" TEXT NOT NULL,
    "currentUserEmployeeNumber" TEXT NOT NULL,
    "currentUserCompanyName" TEXT NOT NULL DEFAULT '',
    "currentUserDepartmentName" TEXT NOT NULL DEFAULT '',
    "currentUserDepartmentCode" TEXT NOT NULL DEFAULT '',
    "currentUserCostDeptName" TEXT NOT NULL DEFAULT '',
    "currentUserCostDeptCode" TEXT NOT NULL DEFAULT '',
    "newUserName" TEXT NOT NULL,
    "newUserEmployeeNumber" TEXT NOT NULL,
    "newUserCompanyName" TEXT NOT NULL DEFAULT '',
    "newUserDepartmentName" TEXT NOT NULL DEFAULT '',
    "newUserDepartmentCode" TEXT NOT NULL DEFAULT '',
    "newUserCostDeptName" TEXT NOT NULL DEFAULT '',
    "newUserCostDeptCode" TEXT NOT NULL DEFAULT '',
    "equipmentTypesJson" TEXT NOT NULL DEFAULT '[]',
    "assetAmountYen" INTEGER,
    "requiresAccountingApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "change_request_applicationCorrelationId_key" ON "change_request"("applicationCorrelationId");

-- CreateIndex
CREATE INDEX "change_request_employeeNumber_createdAt_idx" ON "change_request"("employeeNumber", "createdAt");
