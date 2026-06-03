from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "app/equipment-lending/page.tsx"
lines = path.read_text(encoding="utf-8").splitlines()

# types start 85, DeliveryStep 420-983, Home 984+
head = lines[:84]
tail = lines[983:]

extra_imports = [
    'import LendingDeliveryStep from "@/components/equipment-lending/LendingDeliveryStep";',
    'import {',
    '  LendingSummaryRow,',
    '  PcInitialSettingsTable,',
    '  PcInitialSettingsTitle,',
    '} from "@/components/equipment-lending/lendingFormUi";',
    'import {',
    '  APPLICANT_DETAIL_FIELDS,',
    '  initialApplicant,',
    '  initialDelivery,',
    '  initialReason,',
    '  initialUser,',
    '  LENDING_BRAND_COLOR,',
    '  LENDING_DRAFT_KEY,',
    '  lendingFormRowFieldCellSx,',
    '  lendingFormRowLabelSx,',
    '  lendingTextFieldRowSx,',
    '  USER_DETAIL_FIELDS,',
    '  type ApplicantFormData,',
    '  type DeliveryFormData,',
    '  type DraftPayload,',
    '  type EmployeeMasterOption,',
    '  type LendingEquipmentLine,',
    '  type LendingWizardStep,',
    '  type ReasonFormData,',
    '  type UserFormData,',
    '} from "@/app/equipment-lending/lendingFormTypes";',
    'import {',
    '  newAdditionalUserRow,',
    '  newApplicationCorrelationId,',
    '  newLendingEquipmentLine,',
    '  parseLendingRegisterApiJson,',
    '} from "@/app/equipment-lending/lendingFormUtils";',
    'import "@/app/equipment-lending/lendingFormDayjs";',
    'import { buildLendingRequestBody } from "@/lib/lendingBuildRequestBody";',
    'import { useLendingFormOptions } from "@/lib/hooks/useLendingFormOptions";',
]

for i, line in enumerate(extra_imports):
    head.insert(84 + i, line)

tail_text = "\n".join(tail)
repl = [
    ("EmployeeOption", "EmployeeMasterOption"),
    ('const brandColor = "#007D9E";', "const brandColor = LENDING_BRAND_COLOR;"),
    ("formRowLabelSx", "lendingFormRowLabelSx"),
    ("formRowFieldCellSx", "lendingFormRowFieldCellSx"),
    ("textFieldRowSx", "lendingTextFieldRowSx"),
    ('const DRAFT_KEY = "equipment-request-draft";', ""),
    ("DRAFT_KEY", "LENDING_DRAFT_KEY"),
    ("parseApiJson(response)", "parseLendingRegisterApiJson(response)"),
    ("<DeliveryStep", "<LendingDeliveryStep"),
    ("SummaryRow", "LendingSummaryRow"),
    (
        'useState<\n    "notice" | "applicant" | "user" | "equipment" | "delivery" | "reason" | "confirm"\n  >',
        "useState<LendingWizardStep>",
    ),
]
for a, b in repl:
    tail_text = tail_text.replace(a, b)

# Replace form options block only (labelsByCategory through peripheralLan - keep msOfficeMenuOptions below)
start = tail_text.find("  const { labelsByCategory, error: formOptionsError } =")
end = tail_text.find("  const msOfficeMenuOptions = useMemo", start)
if start == -1 or end == -1:
    raise SystemExit("form options markers not found")
hook = """  const { labels: employmentTypeLabels, error: employmentTypesError } = useEmploymentTypeLabels();

  const {
    formOptionsError,
    lendingRequestReasonOptions,
    lendingEquipmentTypeOptions,
    userStaffCategoryOptions,
    decisionContractTypeOptions,
    decisionWorkContentOptions,
    decisionClientEnvOptions,
    smartphoneCameraOptions,
    smartphoneUserIdentificationOptions,
    smartphoneWorkplaceOptions,
    peripheralMonitorSizeOptions,
    peripheralLanCableLengthOptions,
    msOfficeMenuOptionsPool,
  } = useLendingFormOptions();

"""
tail_text = tail_text[:start] + hook + tail_text[end:]

# Remove pickOptions if orphaned - remove duplicate employment hook inside removed block already handled

# Replace buildLendingRequestBody function
fn = "  const buildLendingRequestBody = () => {"
if fn in tail_text:
    fi = tail_text.index(fn)
    fi_end = tail_text.index("  };\n\n  const handleReasonContinue", fi)
    call = """  const lendingRequestBody = useMemo(
    () =>
      buildLendingRequestBody({
        applicantData,
        userData,
        deliveryData,
        reasonData,
        lendingLines,
        userMode,
        additionalUsers,
        userReasonByEmp,
        assignedEmployeeNumbers,
      }),
    [
      applicantData,
      userData,
      deliveryData,
      reasonData,
      lendingLines,
      userMode,
      additionalUsers,
      userReasonByEmp,
      assignedEmployeeNumbers,
    ],
  );

"""
    tail_text = tail_text[:fi] + call + tail_text[fi_end + 4 :]
    tail_text = tail_text.replace(
        "JSON.stringify(buildLendingRequestBody())",
        "JSON.stringify(lendingRequestBody)",
    )

out = "\n".join(head) + "\n\n" + tail_text + "\n"
path.write_text(out, encoding="utf-8")
print(len(out.splitlines()), "lines")
