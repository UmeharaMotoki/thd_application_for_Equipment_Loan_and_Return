from pathlib import Path

path = Path(__file__).resolve().parents[1] / "app/equipment-lending/page.tsx"
lines = path.read_text(encoding="utf-8").splitlines()

# Keep lines 1-104 (imports, 0-indexed 0:104), skip 105-1224, keep 1225-end
head = lines[:104]
tail = lines[1225:]

new_imports = '''import LendingDeliveryStep from "@/components/equipment-lending/LendingDeliveryStep";
import {
  LendingSummaryRow,
  PcInitialSettingsTable,
  PcInitialSettingsTitle,
} from "@/components/equipment-lending/lendingFormUi";
import {
  APPLICANT_DETAIL_FIELDS,
  initialApplicant,
  initialDelivery,
  initialReason,
  initialUser,
  LENDING_BRAND_COLOR,
  LENDING_DRAFT_KEY,
  lendingFormRowFieldCellSx,
  lendingFormRowLabelSx,
  lendingTextFieldRowSx,
  USER_DETAIL_FIELDS,
  type ApplicantFormData,
  type DeliveryFormData,
  type DraftPayload,
  type EmployeeMasterOption,
  type LendingEquipmentLine,
  type LendingWizardStep,
  type ReasonFormData,
  type UserFormData,
} from "@/app/equipment-lending/lendingFormTypes";
import {
  newAdditionalUserRow,
  newApplicationCorrelationId,
  newLendingEquipmentLine,
  parseLendingRegisterApiJson,
} from "@/app/equipment-lending/lendingFormUtils";
import { buildLendingRequestBody } from "@/lib/lendingBuildRequestBody";
import { useLendingFormOptions } from "@/lib/hooks/useLendingFormOptions";'''

# Insert new imports after LendingUserReasonBlock import (line 33 area)
insert_at = None
for i, line in enumerate(head):
    if 'LendingUserReasonBlock' in line:
        insert_at = i + 1
        break
if insert_at is None:
    raise SystemExit('insert point not found')

# Remove duplicate imports from head that are only for extracted code
skip_prefixes = (
    'import { STATIC_LENDING',
    'import { useApplicationSelectOptions',
    'import { APPLICATION_SELECT_CATEGORIES',
    'import { LAN_CABLE',
    'import { DECISION_',
    'import { MS_OFFICE',
    'import { STAFF_',
)
head = [l for l in head if not any(l.startswith(p) for p in skip_prefixes)]

for extra in reversed(new_imports.split('\n')):
    head.insert(insert_at, extra)

# Fix tail replacements
tail_text = '\n'.join(tail)
replacements = [
    ('EmployeeOption', 'EmployeeMasterOption'),
    ('const brandColor = "#007D9E";', 'const brandColor = LENDING_BRAND_COLOR;'),
    ('formRowLabelSx', 'lendingFormRowLabelSx'),
    ('formRowFieldCellSx', 'lendingFormRowFieldCellSx'),
    ('textFieldRowSx', 'lendingTextFieldRowSx'),
    ('const DRAFT_KEY = "equipment-request-draft";', ''),
    ('parseApiJson(response)', 'parseLendingRegisterApiJson(response)'),
    ('buildLendingRequestBody()', 'buildLendingRequestBody({\n      applicantData,\n      userData,\n      deliveryData,\n      reasonData,\n      lendingLines,\n      userMode,\n      additionalUsers,\n      userReasonByEmp,\n      assignedEmployeeNumbers,\n    })'),
    ('<DeliveryStep', '<LendingDeliveryStep'),
    ('SummaryRow', 'LendingSummaryRow'),
    ('"notice" | "applicant"', 'LendingWizardStep'),
    ('useState<\n    "notice" | "applicant" | "user" | "equipment" | "delivery" | "reason" | "confirm"\n  >', 'useState<LendingWizardStep>'),
]
for old, new in replacements:
    tail_text = tail_text.replace(old, new)

# Remove old form options block - find and replace with hook
marker_start = '  const { labelsByCategory, error: formOptionsError } ='
marker_end = '  const peripheralLanCableLengthOptions = useMemo('
if marker_start in tail_text:
    idx = tail_text.index(marker_start)
    idx2 = tail_text.index('  );\n', tail_text.index(marker_end))
    idx2 = tail_text.index('\n', idx2 + 5) + 1  # after peripheralLanCableLength closing
    # find msOfficeMenuOptionsPool block too
    idx3 = tail_text.index('  const msOfficeMenuOptionsPool = useMemo', idx2)
    idx4 = tail_text.index('  );\n', idx3) + 5
    hook_block = '''  const {
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

'''
    tail_text = tail_text[:idx] + hook_block + tail_text[idx4:]

# Remove buildLendingRequestBody function definition
fn_start = '  const buildLendingRequestBody = () => {'
if fn_start in tail_text:
    fi = tail_text.index(fn_start)
    fi_end = tail_text.index('  };\n\n  const handleReasonContinue', fi)
    tail_text = tail_text[:fi] + tail_text[fi_end:]

out = '\n'.join(head) + '\n\n' + tail_text + '\n'
path.write_text(out, encoding='utf-8')
print(f'page.tsx now {len(out.splitlines())} lines')
