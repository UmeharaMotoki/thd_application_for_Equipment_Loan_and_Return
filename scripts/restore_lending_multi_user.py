"""Restore multi-user equipment lending wizard in page.tsx."""
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app" / "equipment-lending" / "page.tsx"
text = p.read_text(encoding="utf-8")

# --- imports ---
import_anchor = '} from "@/lib/lendingEquipmentOptions";'
if import_anchor not in text:
    raise SystemExit("import anchor missing")
extra_imports = '''
import LendingAdditionalUsersBlock, {
  type AdditionalUserRow,
} from "@/components/equipment-lending/LendingAdditionalUsersBlock";
import LendingEquipmentByUserBlock from "@/components/equipment-lending/LendingEquipmentByUserBlock";
import LendingUserReasonBlock from "@/components/equipment-lending/LendingUserReasonBlock";
import { buildLendingRequestBody } from "@/lib/lendingBuildRequestBody";
import {
  buildLendingEquipmentUserBlocks,
  newLendingEquipmentLineForUser,
  syncLendingLinesForUserPool,
  validateEquipmentStep,
} from "@/lib/lendingEquipmentUserBlocks";
import {
  assignedEmployeeNumbersFromLines,
  buildLendingUserReasonBlocks,
  emptyUserReasonFormState,
  validateUserReasonForBlock,
  type UserReasonFormState,
} from "@/lib/lendingUserReason";
import {
  getLendingProfileForEmployee,
  resolveStaffCategoryForProfile,
} from "@/lib/lendingUserProfile";
import { newAdditionalUserRow } from "@/app/equipment-lending/lendingFormUtils";
'''
if "LendingAdditionalUsersBlock" not in text:
    text = text.replace(import_anchor, import_anchor + extra_imports, 1)

mui_import = "} from \"@mui/material\";"
if "FormControl," not in text:
    text = text.replace(
        mui_import,
        "  FormControl,\n  FormControlLabel,\n  FormLabel,\n  Radio,\n  RadioGroup,\n} from \"@mui/material\";".replace(
            "FormControlLabel,\n  FormLabel,", "FormControlLabel,\n  Link,\n  MenuItem,\n  FormLabel,"
        ),
        1,
    )
# Fix duplicate Link/MenuItem if we broke imports
if text.count("import {\n  Alert,") == 1 and "  Link,\n  MenuItem," in text:
    pass
elif "  Radio,\n  RadioGroup,\n} from \"@mui/material\";" in text:
    # already patched with wrong pattern - use simpler patch
    text = p.read_text(encoding="utf-8")
    if "RadioGroup" not in text:
        text = text.replace(
            "  Link,\n  MenuItem,\n  Stack,",
            "  FormControl,\n  FormLabel,\n  Link,\n  MenuItem,\n  Radio,\n  RadioGroup,\n  Stack,",
            1,
        )

# --- LendingEquipmentLine type ---
text = text.replace(
    "type LendingEquipmentLine = {\n  id: string;\n  equipmentType: string;\n};",
    "type LendingEquipmentLine = {\n  id: string;\n  equipmentType: string;\n  assignedUserEmployeeNumber: string;\n};",
    1,
)

text = text.replace(
    """function newLendingEquipmentLine(): LendingEquipmentLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lend-line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    equipmentType: "",
  };
}""",
    """function newLendingEquipmentLine(): LendingEquipmentLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lend-line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    equipmentType: "",
    assignedUserEmployeeNumber: "",
  };
}""",
    1,
)

text = text.replace(
    "type DraftPayload = {\n  applicant: ApplicantFormData;\n  user: UserFormData;\n  delivery?: DeliveryFormData;\n  lendingLines?: LendingEquipmentLine[];\n  reason?: ReasonFormData;\n};",
    """type DraftPayload = {
  applicant: ApplicantFormData;
  user: UserFormData;
  delivery?: DeliveryFormData;
  lendingLines?: LendingEquipmentLine[];
  reason?: ReasonFormData;
  userMode?: "single" | "multiple";
  additionalUsers?: AdditionalUserRow[];
  userReasonByEmp?: Record<string, UserReasonFormState>;
};""",
    1,
)

# --- state ---
state_anchor = "  const [lendingLines, setLendingLines] = useState<LendingEquipmentLine[]>(() => [\n    newLendingEquipmentLine(),\n  ]);"
if "userMode" not in text:
    text = text.replace(
        state_anchor,
        state_anchor
        + '\n  const [userMode, setUserMode] = useState<"single" | "multiple">("single");\n'
        + "  const [additionalUsers, setAdditionalUsers] = useState<AdditionalUserRow[]>([]);\n"
        + "  const [userReasonByEmp, setUserReasonByEmp] = useState<Record<string, UserReasonFormState>>({});",
        1,
    )

# --- msOffice pool ---
if "msOfficeMenuOptionsPool" not in text:
    text = text.replace(
        "  const peripheralLanCableLengthOptions = useMemo(\n    () => pickOptions(APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength, LAN_CABLE_LENGTH_OPTIONS),\n    [pickOptions],\n  );",
        """  const peripheralLanCableLengthOptions = useMemo(
    () => pickOptions(APPLICATION_SELECT_CATEGORIES.peripheralLanCableLength, LAN_CABLE_LENGTH_OPTIONS),
    [pickOptions],
  );
  const msOfficeMenuOptionsPool = useMemo(
    () =>
      pickOptions(
        APPLICATION_SELECT_CATEGORIES.msOfficeEdition,
        MS_OFFICE_EDITION_STANDARD_OPTIONS,
      ),
    [pickOptions],
  );

  const lendingEquipmentUserBlocks = useMemo(
    () =>
      buildLendingEquipmentUserBlocks(
        {
          userName: userData.userName,
          userEmployeeNumber: userData.userEmployeeNumber,
          userCompanyName: userData.userCompanyName,
          userDepartmentName: userData.userDepartmentName,
        },
        userMode,
        additionalUsers,
      ),
    [userData, userMode, additionalUsers],
  );

  const assignedEmployeeNumbers = useMemo(
    () => assignedEmployeeNumbersFromLines(lendingLines, userData.userEmployeeNumber),
    [lendingLines, userData.userEmployeeNumber],
  );

  const lendingUserReasonBlocks = useMemo(
    () =>
      buildLendingUserReasonBlocks(
        lendingEquipmentUserBlocks,
        lendingLines,
        userData.userEmployeeNumber,
      ),
    [lendingEquipmentUserBlocks, lendingLines, userData.userEmployeeNumber],
  );

  const lendingRequestBody = useMemo(
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
  );""",
        1,
    )

# --- draft load assignedUserEmployeeNumber ---
text = text.replace(
    """              equipmentType:
                typeof row.equipmentType === "string" ? row.equipmentType : "",
            })),""",
    """              equipmentType:
                typeof row.equipmentType === "string" ? row.equipmentType : "",
              assignedUserEmployeeNumber:
                typeof (row as LendingEquipmentLine).assignedUserEmployeeNumber === "string"
                  ? (row as LendingEquipmentLine).assignedUserEmployeeNumber
                  : "",
            })),""",
    1,
)

if 'parsed.userMode' not in text:
    text = text.replace(
        """        if (reasonDraft) {
          const r = reasonDraft as ReasonFormData & Record<string, unknown>;""",
        """        if ("userMode" in parsed && (parsed.userMode === "single" || parsed.userMode === "multiple")) {
          setUserMode(parsed.userMode);
        }
        if (Array.isArray(parsed.additionalUsers)) {
          setAdditionalUsers(parsed.additionalUsers as AdditionalUserRow[]);
        }
        if (parsed.userReasonByEmp && typeof parsed.userReasonByEmp === "object") {
          setUserReasonByEmp(parsed.userReasonByEmp as Record<string, UserReasonFormState>);
        }
        if (reasonDraft) {
          const r = reasonDraft as ReasonFormData & Record<string, unknown>;""",
        1,
    )

text = text.replace(
    """    const payload: DraftPayload = {
      applicant: applicantData,
      user: userData,
      delivery: deliveryData,
      lendingLines,
      reason: reasonData,
    };""",
    """    const payload: DraftPayload = {
      applicant: applicantData,
      user: userData,
      delivery: deliveryData,
      lendingLines,
      reason: reasonData,
      userMode,
      additionalUsers,
      userReasonByEmp,
    };""",
    1,
)

text = text.replace(
    "  }, [applicantData, userData, deliveryData, lendingLines, reasonData]);",
    "  }, [applicantData, userData, deliveryData, lendingLines, reasonData, userMode, additionalUsers, userReasonByEmp]);",
    1,
)

# --- seed userReasonByEmp on reason step ---
seed_effect = """
  useEffect(() => {
    if (step !== "reason") return;
    const repEmp = userData.userEmployeeNumber.trim();
    setUserReasonByEmp((prev) => {
      let next = { ...prev };
      let changed = false;
      for (const emp of assignedEmployeeNumbers) {
        if (next[emp]) continue;
        const profile = getLendingProfileForEmployee(emp, userData, additionalUsers);
        const staff = resolveStaffCategoryForProfile(profile);
        const repReason = repEmp && next[repEmp] ? next[repEmp] : null;
        next[emp] = {
          ...emptyUserReasonFormState(),
          userStaffCategory: staff,
          ...(repReason
            ? {
                lendingStartDate: repReason.lendingStartDate,
                expectedReturnDate: repReason.expectedReturnDate,
              }
            : {}),
        };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [step, assignedEmployeeNumbers, userData, additionalUsers]);

"""
if "getLendingProfileForEmployee" in text and "seed userReason" not in text:
    text = text.replace(
        "  useEffect(() => {\n    if (step !== \"reason\") return;\n    setReasonData((prev) => {",
        seed_effect
        + "  useEffect(() => {\n    if (step !== \"reason\") return;\n    setReasonData((prev) => {",
        1,
    )

# --- equipmentStepOk / reasonStepCanProceed ---
text = text.replace(
    """  const equipmentStepOk = useMemo(
    () => lendingLines.length > 0 && lendingLines.every((l) => l.equipmentType.trim() !== ""),
    [lendingLines],
  );""",
    """  const equipmentStepOk = useMemo(() => {
    const result = validateEquipmentStep(lendingLines, lendingEquipmentUserBlocks);
    return result.ok;
  }, [lendingLines, lendingEquipmentUserBlocks]);""",
    1,
)

text = text.replace(
    """  const reasonStepCanProceed = useMemo(() => {
    if (!reasonData.requestReason.trim()) return false;
    if (!lendingDatesOk) return false;
    if (includesPc) {
      const staff = userData.userStaffCategory.trim();
      if (staff !== STAFF_MANAGEMENT && staff !== STAFF_TECHNICAL) return false;
      if (
        !reasonData.msOfficeEdition.trim() ||
        !isMsOfficeEditionAllowedForPcDecision(
          userData.userStaffCategory,
          reasonData.decisionContractType,
          reasonData.decisionWorkContent,
          reasonData.decisionClientEnv,
          reasonData.msOfficeEdition,
        )
      ) {
        return false;
      }
      if (!derivedLicense || decisionResolution.kind === "lending_denied") return false;
    }
    if (includesSmartphone) {
      if (
        !reasonData.smartphoneCameraPresence.trim() ||
        !reasonData.smartphoneUserIdentification.trim() ||
        !reasonData.smartphoneWorkplaceUse.trim()
      )
        return false;
    }
    if (includesMonitor) {
      if (!reasonData.peripheralMonitorSize.trim()) return false;
      if (
        reasonData.peripheralMonitorSize === "その他" &&
        !reasonData.peripheralMonitorSizeCustom.trim()
      )
        return false;
    }
    if (includesLanCable) {
      if (!reasonData.peripheralLanCableLength.trim()) return false;
      if (
        reasonData.peripheralLanCableLength === "その他" &&
        !reasonData.peripheralLanCableLengthCustom.trim()
      )
        return false;
    }
    return true;
  }, [
    reasonData.requestReason,
    lendingDatesOk,
    includesPc,
    userData.userStaffCategory,
    reasonData.msOfficeEdition,
    reasonData.decisionContractType,
    reasonData.decisionWorkContent,
    reasonData.decisionClientEnv,
    includesSmartphone,
    includesMonitor,
    includesLanCable,
    derivedLicense,
    decisionResolution.kind,
    reasonData.smartphoneCameraPresence,
    reasonData.smartphoneUserIdentification,
    reasonData.smartphoneWorkplaceUse,
    reasonData.peripheralMonitorSize,
    reasonData.peripheralMonitorSizeCustom,
    reasonData.peripheralLanCableLength,
    reasonData.peripheralLanCableLengthCustom,
  ]);""",
    """  const reasonStepCanProceed = useMemo(() => {
    if (!reasonData.requestReason.trim()) return false;
    if (lendingUserReasonBlocks.length === 0) return false;
    return lendingUserReasonBlocks.every((block) =>
      validateUserReasonForBlock(
        block,
        userReasonByEmp[block.employeeNumber] ?? emptyUserReasonFormState(),
        minSelectableDate,
        isSelectableBusinessDate,
      ),
    );
  }, [
    reasonData.requestReason,
    lendingUserReasonBlocks,
    userReasonByEmp,
    minSelectableDate,
    isSelectableBusinessDate,
  ]);""",
    1,
)

# --- handlers ---
text = text.replace('    setStep("equipment");\n  };\n\n  const handleUserNext', '    setStep("user");\n  };\n\n  const handleUserNext', 1)

text = text.replace(
    """    if (lendingLinesIncludePc(lendingLines) && !userData.userStaffCategory.trim()) {
      setMessage({
        type: "error",
        text: "PC を含む申請では、利用者区分（管理社員／技術社員）を選択してください。",
      });
      return;
    }
    if (deliveryData.deliverySameAsUser) {""",
    """    if (userMode === "multiple") {
      for (const row of additionalUsers) {
        if (!row.userEmployeeNumber.trim()) {
          setMessage({
            type: "error",
            text: "追加利用者の社員番号をすべて入力してください。",
          });
          return;
        }
      }
    }
    const pool = buildLendingEquipmentUserBlocks(
      {
        userName: userData.userName,
        userEmployeeNumber: userData.userEmployeeNumber,
        userCompanyName: userData.userCompanyName,
        userDepartmentName: userData.userDepartmentName,
      },
      userMode,
      additionalUsers,
    );
    setLendingLines((prev) => syncLendingLinesForUserPool(prev, pool));
    if (deliveryData.deliverySameAsUser) {""",
    1,
)

text = text.replace(
    '    setStep("delivery");\n  };\n\n  const handleDeliveryNext',
    '    setStep("equipment");\n  };\n\n  const handleDeliveryNext',
    1,
)

text = text.replace(
    """  const handleEquipmentNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!equipmentStepOk) {
      setMessage({
        type: "error",
        text: "各行で貸与機器の種類を選択してください。追加する場合は「機器を追加」から行を増やせます。",
      });
      return;
    }
  setStep("user");
  };""",
    """  const handleEquipmentNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const pool = buildLendingEquipmentUserBlocks(
      {
        userName: userData.userName,
        userEmployeeNumber: userData.userEmployeeNumber,
        userCompanyName: userData.userCompanyName,
        userDepartmentName: userData.userDepartmentName,
      },
      userMode,
      additionalUsers,
    );
    const validation = validateEquipmentStep(lendingLines, pool);
    if (!validation.ok) {
      setMessage({ type: "error", text: validation.message });
      return;
    }
    setStep("delivery");
  };""",
    1,
)

# remove inline buildLendingRequestBody
fn = "  const buildLendingRequestBody = () => {"
if fn in text:
    fi = text.index(fn)
    fi_end = text.index("  };\n\n  const handleReasonContinue", fi)
    text = text[:fi] + text[fi_end + 4 :]

text = text.replace(
    "body: JSON.stringify(buildLendingRequestBody()),",
    "body: JSON.stringify(lendingRequestBody),",
    1,
)

# handleReasonContinue - simplify PC validation (per-block handles it)
old_reason_continue_start = """  const handleReasonContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const deliveryRecipientBlocked = deliveryData.deliverySameAsUser
      ? userRetired
      : deliveryRecipientRetired;
    if (applicantRetired || userRetired || deliveryRecipientBlocked) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }

    if (includesPc) {"""
# Replace the big validation block with simpler per-block check
if old_reason_continue_start in text:
    i = text.index(old_reason_continue_start)
    j = text.index('    if (!lendingDatesOk) {', i)
    replacement = """  const handleReasonContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const deliveryRecipientBlocked = deliveryData.deliverySameAsUser
      ? userRetired
      : deliveryRecipientRetired;
    if (applicantRetired || userRetired || deliveryRecipientBlocked) {
      setMessage({ type: "error", text: EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE });
      return;
    }

    if (!reasonData.requestReason.trim()) {
      setMessage({ type: "error", text: "申請理由を選択してください。" });
      return;
    }

    for (const block of lendingUserReasonBlocks) {
      const reason = userReasonByEmp[block.employeeNumber] ?? emptyUserReasonFormState();
      if (
        !validateUserReasonForBlock(
          block,
          reason,
          minSelectableDate,
          isSelectableBusinessDate,
        )
      ) {
        setMessage({
          type: "error",
          text: `「${block.userName}」の申請理由・貸与期間・機器別設定を確認してください。`,
        });
        return;
      }
    }

"""
    # find end of old lendingDatesOk block through setStep confirm
    k = text.index('    setStep("confirm");', j)
    lend_block_end = text.index('\n  };', k) + 4
    text = text[:i] + replacement + text[k:lend_block_end] + text[lend_block_end:]

# prefill
text = text.replace(
    """    setLendingLines(
      prefill.lendingLines.length > 0 ? prefill.lendingLines : [newLendingEquipmentLine()],
    );
    setReasonData(prefill.reason);""",
    """    const pre = prefill as LendingRequestPrefillPayload & {
      userMode?: "single" | "multiple";
      additionalUsers?: AdditionalUserRow[];
      userLicenses?: Array<UserReasonFormState & { userEmployeeNumber: string }>;
    };
    setUserMode(pre.userMode === "multiple" ? "multiple" : "single");
    setAdditionalUsers(pre.additionalUsers ?? []);
    const lines =
      prefill.lendingLines.length > 0
        ? prefill.lendingLines.map((row) => ({
            id: row.id,
            equipmentType: row.equipmentType,
            assignedUserEmployeeNumber: row.assignedUserEmployeeNumber ?? "",
          }))
        : [newLendingEquipmentLine()];
    setLendingLines(lines);
    const byEmp: Record<string, UserReasonFormState> = {};
    for (const lic of pre.userLicenses ?? []) {
      const emp = lic.userEmployeeNumber?.trim();
      if (!emp) continue;
      const { userEmployeeNumber: _u, ...rest } = lic;
      byEmp[emp] = { ...emptyUserReasonFormState(), ...rest };
    }
    setUserReasonByEmp(byEmp);
    setReasonData(prefill.reason);""",
    1,
)

# reset on success
text = text.replace(
    "      setLendingLines([newLendingEquipmentLine()]);\n      setApplicantCandidates([]);",
    """      setLendingLines([newLendingEquipmentLine()]);
      setUserMode("single");
      setAdditionalUsers([]);
      setUserReasonByEmp({});
      setApplicantCandidates([]);""",
    1,
)

# delivery onBack
text = text.replace('onBack={() => setStep("user")}', 'onBack={() => setStep("equipment")}', 1)

# swap user/equipment step blocks in JSX
equip_marker = ') : step === "equipment" ? ('
user_marker = ') : step === "user" ? ('
delivery_marker = ') : step === "delivery" ? ('
if text.index(equip_marker) < text.index(user_marker):
    es = text.index(equip_marker)
    us = text.index(user_marker)
    ds = text.index(delivery_marker)
    equip_block = text[es:us]
    user_block = text[us:ds]
    text = text[:es] + user_block + equip_block + text[ds:]

# user step: back button applicant, add mode toggle after title
text = text.replace(
    """              <Box>
                <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
                  Q. 利用者情報を入力してください
                </Typography>
              </Box>
              <Box component="form" onSubmit={handleUserNext}""",
    """              <Box>
                <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
                  Q. 利用者情報を入力してください
                </Typography>
              </Box>
              <Box sx={{ width: "90%", margin: "0 auto", mb: 2 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: 16, mb: 1 }}>
                    利用者の人数
                  </FormLabel>
                  <RadioGroup
                    row
                    value={userMode}
                    onChange={(_, v) => {
                      const mode = v === "multiple" ? "multiple" : "single";
                      setUserMode(mode);
                      if (mode === "single") setAdditionalUsers([]);
                    }}
                  >
                    <FormControlLabel value="single" control={<Radio />} label="1人" />
                    <FormControlLabel value="multiple" control={<Radio />} label="複数" />
                  </RadioGroup>
                </FormControl>
              </Box>
              <Box component="form" onSubmit={handleUserNext}""",
    1,
)

text = text.replace(
    'onClick={() => setStep("equipment")}\n                      sx={{\n                        borderRadius: 999,\n                        width: 180,\n                        height: 46,\n                        fontSize: 18,\n                        borderColor: "#c9c9c9",\n                        color: "#333",\n                      }}\n                    >\n                      戻る',
    'onClick={() => setStep("applicant")}\n                      sx={{\n                        borderRadius: 999,\n                        width: 180,\n                        height: 46,\n                        fontSize: 18,\n                        borderColor: "#c9c9c9",\n                        color: "#333",\n                      }}\n                    >\n                      戻る',
    1,
)

# additional users block before user retired alert in user form - insert before userRetired
user_add_anchor = "                  {userRetired && (\n                    <Alert severity=\"warning\""
if "LendingAdditionalUsersBlock" not in text[text.index(user_marker) if user_marker in text else 0 :]:
    text = text.replace(
        user_add_anchor,
        """                  {userMode === "multiple" && (
                    <LendingAdditionalUsersBlock
                      rows={additionalUsers}
                      representative={{
                        userCompanyName: userData.userCompanyName,
                        userDepartmentName: userData.userDepartmentName,
                      }}
                      onAdd={() => setAdditionalUsers((prev) => [...prev, newAdditionalUserRow()])}
                      onRemove={(id) =>
                        setAdditionalUsers((prev) => prev.filter((r) => r.id !== id))
                      }
                      onChange={(id, patch) =>
                        setAdditionalUsers((prev) =>
                          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
                        )
                      }
                      textFieldRowSx={textFieldRowSx}
                      formRowLabelSx={formRowLabelSx}
                      formRowFieldCellSx={formRowFieldCellSx}
                    />
                  )}
                  {userRetired && (
                    <Alert severity="warning\"""",
        1,
    )

# equipment step UI replacement
equip_title = """            <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 12px 0" }}>
              Q. 貸与する機器の種類を選択してください（複数ある場合は「機器を追加」で行を増やせます）
            </Typography>"""
new_equip_title = """            <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 12px 0" }}>
              Q. 利用者ごとに貸与する機器を選択してください
            </Typography>"""
text = text.replace(equip_title, new_equip_title, 1)

# replace equipment form inner content (lines map) with LendingEquipmentByUserBlock
equip_form_start = '<Box component="form" onSubmit={handleEquipmentNext}'
if equip_form_start in text:
    ef = text.index(equip_form_start)
    # find closing of equipment section - delivery marker
    dm = text.index(delivery_marker, ef)
    equip_section = text[ef:dm]
    if "LendingEquipmentByUserBlock" not in equip_section:
        new_equip_form = """<Box component="form" onSubmit={handleEquipmentNext} sx={{ width: "95%", margin: "0 auto" }}>
              <Stack spacing={2.5}>
                <LendingEquipmentByUserBlock
                  blocks={lendingEquipmentUserBlocks}
                  lendingLines={lendingLines}
                  representativeEmployeeNumber={userData.userEmployeeNumber}
                  equipmentTypeOptions={lendingEquipmentTypeOptions}
                  onAddLine={(employeeNumber) =>
                    setLendingLines((prev) => [
                      ...prev,
                      newLendingEquipmentLineForUser(employeeNumber),
                    ])
                  }
                  onRemoveLine={removeLendingLine}
                  onUpdateLine={updateLendingLine}
                  textFieldRowSx={textFieldRowSx}
                  formRowLabelSx={formRowLabelSx}
                  formRowFieldCellSx={formRowFieldCellSx}
                />
                {message && <Alert severity={message.type}>{message.text}</Alert>}
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setStep("user")}
                    sx={{
                      borderRadius: 999,
                      width: 180,
                      height: 46,
                      fontSize: 18,
                      borderColor: "#c9c9c9",
                      color: "#333",
                    }}
                  >
                    戻る
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!equipmentStepOk}
                    sx={{
                      width: 180,
                      height: 46,
                      borderRadius: 999,
                      backgroundColor: brandColor,
                      fontSize: 18,
                      "&:hover": { backgroundColor: "#006c88" },
                    }}
                  >
                    次へ
                  </Button>
                </Box>
              </Stack>
            </Box>
          """
        # replace from equip form to before delivery
        text = text[:ef] + new_equip_form + text[dm:]

# reason UI - replace PC through peripheral sections
reason_start = "                  {/* ── PC セクション ── */}"
reason_end = "                  <Divider />\n                  <Box sx={{ display: \"flex\", alignItems: \"center\", gap: 2 }}>\n                    <Typography sx={formRowLabelSx}>貸与開始日</Typography>"
if reason_start in text and "lendingUserReasonBlocks.map" not in text:
    i = text.index(reason_start)
    j = text.index(reason_end, i)
    replacement = """                  <Stack spacing={3}>
                    {lendingUserReasonBlocks.map((block) => (
                      <LendingUserReasonBlock
                        key={block.employeeNumber}
                        block={block}
                        reason={
                          userReasonByEmp[block.employeeNumber] ?? emptyUserReasonFormState()
                        }
                        onChange={(patch) =>
                          setUserReasonByEmp((prev) => ({
                            ...prev,
                            [block.employeeNumber]: {
                              ...(prev[block.employeeNumber] ?? emptyUserReasonFormState()),
                              ...patch,
                            },
                          }))
                        }
                        formRowLabelSx={formRowLabelSx}
                        formRowFieldCellSx={formRowFieldCellSx}
                        textFieldRowSx={textFieldRowSx}
                        userStaffCategoryOptions={userStaffCategoryOptions}
                        decisionContractTypeOptions={decisionContractTypeOptions}
                        decisionWorkContentOptions={decisionWorkContentOptions}
                        decisionClientEnvOptions={decisionClientEnvOptions}
                        msOfficeMenuOptionsPool={msOfficeMenuOptionsPool}
                        smartphoneCameraOptions={smartphoneCameraOptions}
                        smartphoneUserIdentificationOptions={
                          smartphoneUserIdentificationOptions
                        }
                        smartphoneWorkplaceOptions={smartphoneWorkplaceOptions}
                        peripheralMonitorSizeOptions={peripheralMonitorSizeOptions}
                        peripheralLanCableLengthOptions={peripheralLanCableLengthOptions}
                        minSelectableDate={minSelectableDate}
                        isSelectableBusinessDate={isSelectableBusinessDate}
                      />
                    ))}
                  </Stack>

"""
    text = text[:i] + replacement + text[j:]

# remove duplicate date pickers after reason blocks (keep applicationCorrelationId section)
dup_dates = """                  <Divider />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={formRowLabelSx}>貸与開始日</Typography>"""
if text.count(dup_dates) >= 1:
    # remove first occurrence block through expectedReturnDate picker
    i = text.index(dup_dates)
    corr_marker = '                    <Typography sx={formRowLabelSx}>申請連携ID</Typography>'
    j = text.index(corr_marker, i)
    text = text[:i] + text[j:]

# confirm - group by user
confirm_equip = """                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>貸与機器</Typography>
                  {lendingLines.map((line, index) => {"""
if confirm_equip in text and "lendingEquipmentUserBlocks.map" not in text[text.index(confirm_equip):]:
    i = text.index(confirm_equip)
    # find end of lendingLines.map - Typography 貸与期間
    period_marker = '                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>貸与期間・詳細</Typography>'
    j = text.index(period_marker, i)
    new_confirm = """                  <Typography sx={{ fontWeight: 700, fontSize: 18, pt: 2 }}>貸与機器（利用者別）</Typography>
                  {userMode === "multiple" && (
                    <SummaryRow label="利用者モード" value="複数" />
                  )}
                  {lendingEquipmentUserBlocks.map((block) => {
                    const userLines = linesForUser(
                      lendingLines,
                      block.employeeNumber,
                      userData.userEmployeeNumber,
                    );
                    if (userLines.length === 0) return null;
                    const ur = userReasonByEmp[block.employeeNumber] ?? emptyUserReasonFormState();
                    return (
                      <Box
                        key={block.employeeNumber}
                        sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, bgcolor: "#fafafa", mb: 2 }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1, color: "#007D9E" }}>
                          {block.userName}（{block.roleLabel}） {block.employeeNumber}
                        </Typography>
                        <Stack spacing={1}>
                          {userLines.map((line, index) => (
                            <SummaryRow
                              key={line.id}
                              label={`機器 ${index + 1}`}
                              value={line.equipmentType}
                            />
                          ))}
                          <SummaryRow label="貸与開始日" value={ur.lendingStartDate} />
                          <SummaryRow label="返却予定日" value={ur.expectedReturnDate} />
                        </Stack>
                      </Box>
                    );
                  })}
"""
    text = text[:i] + new_confirm + text[j:]

# linesForUser import
if "linesForUser" not in text:
    text = text.replace(
        "  validateEquipmentStep,\n} from \"@/lib/lendingEquipmentUserBlocks\";",
        "  linesForUser,\n  validateEquipmentStep,\n} from \"@/lib/lendingEquipmentUserBlocks\";",
        1,
    )

p.write_text(text, encoding="utf-8")
print(f"restored: {len(text.splitlines())} lines")
