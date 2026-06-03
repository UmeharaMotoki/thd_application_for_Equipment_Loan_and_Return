from pathlib import Path

src = Path(__file__).resolve().parents[1] / "app/equipment-lending/page.tsx"
lines = src.read_text(encoding="utf-8").splitlines()
chunk = lines[440:1224]
header = Path(__file__).resolve().parent / "LendingDeliveryStep.header.tsx"
# inline header
header_text = '''"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";
import { normalizeEmployeeSearchInput } from "@/lib/employeeSearchNormalize";
import { EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE } from "@/lib/hrPersonnelRetired";
import {
  deliveryPatchFromEmployeeSearch,
  fetchDeliveryAddressPatch,
  patchFromThdLocationRow,
} from "@/lib/resolveDeliveryAddressForEmployee";
import {
  DELIVERY_DETAIL_FIELDS,
  DELIVERY_DETAIL_FIELDS_WITHOUT_LOCATION,
  type DeliveryFormData,
  type EmployeeMasterOption,
  type ThdLocationDept,
  type UserFormData,
  lendingFormRowFieldCellSx,
  lendingFormRowLabelSx,
  lendingTextFieldRowSx,
} from "@/app/equipment-lending/lendingFormTypes";

'''
body = "\n".join(chunk)
body = body.replace("function DeliveryStep", "export default function LendingDeliveryStep")
body = body.replace("EmployeeOption", "EmployeeMasterOption")
body = body.replace("formRowLabelSx", "lendingFormRowLabelSx")
body = body.replace("formRowFieldCellSx", "lendingFormRowFieldCellSx")
body = body.replace("textFieldRowSx", "lendingTextFieldRowSx")
out = Path(__file__).resolve().parents[1] / "components/equipment-lending/LendingDeliveryStep.tsx"
out.write_text(header_text + body + "\n", encoding="utf-8")
print(f"wrote {out} ({len(header_text.splitlines()) + len(chunk)} lines)")
