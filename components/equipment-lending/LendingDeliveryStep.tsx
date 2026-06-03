"use client";

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

export default function LendingDeliveryStep({
  brandColor,
  deliveryData,
  setDeliveryData,
  userData,
  userRetired,
  deliveryRecipientRetired,
  setDeliveryRecipientRetired,
  syncDeliveryFromUser,
  deliverySyncLoading,
  message,
  onBack,
  onNext,
  lendingFormRowLabelSx,
  lendingFormRowFieldCellSx,
  lendingTextFieldRowSx,
}: {
  brandColor: string;
  deliveryData: DeliveryFormData;
  setDeliveryData: React.Dispatch<React.SetStateAction<DeliveryFormData>>;
  userData: UserFormData;
  userRetired: boolean;
  deliveryRecipientRetired: boolean;
  setDeliveryRecipientRetired: (v: boolean) => void;
  syncDeliveryFromUser: () => Promise<void>;
  deliverySyncLoading: boolean;
  message: { type: "success" | "error"; text: string } | null;
  onBack: () => void;
  onNext: (e: FormEvent<HTMLFormElement>) => void;
  lendingFormRowLabelSx: Record<string, unknown>;
  lendingFormRowFieldCellSx: Record<string, unknown>;
  lendingTextFieldRowSx: Record<string, unknown>;
}) {
  const [delCandidates, setDelCandidates] = useState<EmployeeMasterOption[]>([]);
  const [delSearchLoading, setDelSearchLoading] = useState(false);
  const [selectedDelEmployeeId, setSelectedDelEmployeeId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [revealDelEmployeeField, setRevealDelEmployeeField] = useState(
    () => !deliveryData.deliverySameAsUser && deliveryData.deliveryName.trim().length > 0,
  );
  const [revealDelDetailFields, setRevealDelDetailFields] = useState(
    () =>
      !deliveryData.deliverySameAsUser &&
      deliveryData.deliveryEmployeeNumber.trim().length > 0,
  );

  const deliveryRetiredNotice =
    (deliveryData.deliverySameAsUser && userRetired) ||
    (!deliveryData.deliverySameAsUser && deliveryRecipientRetired);

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) {
      setDeliveryRecipientRetired(userRetired);
    }
  }, [deliveryData.deliverySameAsUser, userRetired, setDeliveryRecipientRetired]);

  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [deptOptions, setDeptOptions] = useState<ThdLocationDept[]>([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDeptCode, setSelectedDeptCode] = useState("");
  const [selectedAddressKey, setSelectedAddressKey] = useState("");

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    fetch("/api/master/locations?listAreas=true")
      .then((r) => r.json())
      .then((d: { areas?: string[] }) => setAreaOptions(d.areas ?? []))
      .catch(() => {});
  }, [deliveryData.deliverySameAsUser]);

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    fetch("/api/master/locations?listCompanies=true")
      .then((r) => r.json())
      .then((d: { companies?: string[] }) => setCompanyOptions(d.companies ?? []))
      .catch(() => {});
  }, [deliveryData.deliverySameAsUser]);

  useEffect(() => {
    if (!selectedArea || !selectedCompany) { setDeptOptions([]); return; }
    const params = new URLSearchParams({ listDepartments: "true", area: selectedArea });
    params.set("companyName", selectedCompany);
    fetch(`/api/master/locations?${params}`)
      .then((r) => r.json())
      .then((d: { departments?: ThdLocationDept[] }) => setDeptOptions(d.departments ?? []))
      .catch(() => {});
  }, [selectedArea, selectedCompany]);

  const handleDelNameInput = (value: string) => {
    const hasValue = value.trim().length > 0;
    if (!hasValue) {
      setDeliveryRecipientRetired(false);
    }
    setRevealDelEmployeeField(hasValue);
    setRevealDelDetailFields(false);
    setSelectedDelEmployeeId(null);
    setSelectedArea("");
    setSelectedCompany("");
    setSelectedDeptCode("");
    setSelectedAddressKey("");
    setDeliveryData((prev) => ({
      ...prev,
      deliveryName: value,
      deliveryEmployeeNumber: "",
      deliveryCompanyName: "",
      deliveryDepartment: "",
      deliveryArea: "",
      deliveryPostalCode: "",
      deliveryAddress: "",
      deliveryBuilding: "",
      deliveryEmail: "",
      deliveryPhone: "",
    }));
  };

  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;

    if (selectedDelEmployeeId) {
      setDelCandidates([]);
      return;
    }

    const q = normalizeEmployeeSearchInput(deliveryData.deliveryName);
    const ac = new AbortController();
    if (q.length < 1) {
      setDelCandidates([]);
      setDelSearchLoading(false);
      return () => {
        ac.abort();
      };
    }
    setDelSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeMasterOption[] };
        if (ac.signal.aborted) return;
        setDelCandidates(res.ok ? (data.employees ?? []) : []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setDelSearchLoading(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(t);
      ac.abort();
      setDelSearchLoading(false);
    };
  }, [deliveryData.deliveryName, deliveryData.deliverySameAsUser, selectedDelEmployeeId]);

  const applyDelFromEmployee = useCallback(
    async (emp: EmployeeMasterOption) => {
      setDeliveryRecipientRetired(emp.retired);
      setSelectedDelEmployeeId(emp.id);
      setRevealDelEmployeeField(true);
      setRevealDelDetailFields(true);
      setDelCandidates([]);
      setAddressLoading(true);

      const searchPatch = deliveryPatchFromEmployeeSearch({
        companyName: emp.companyName,
        departmentName: emp.departmentName,
        departmentCode: emp.departmentCode,
        address: emp.address,
        deliveryArea: emp.deliveryArea,
        deliveryPostalCode: emp.deliveryPostalCode,
        deliveryAddressLine: emp.deliveryAddressLine,
        deliveryBuilding: emp.deliveryBuilding,
      });
      setDeliveryData((prev) => ({
        ...prev,
        deliveryName: emp.fullName,
        deliveryEmployeeNumber: emp.employeeNumber,
        deliveryEmail: emp.email ?? "",
        deliveryPhone: emp.phone ?? "",
        ...searchPatch,
      }));

      try {
        const patch = await fetchDeliveryAddressPatch({
          departmentCode: emp.departmentCode,
          companyName: emp.companyName,
          departmentName: emp.departmentName,
          address: emp.address,
          deliveryArea: emp.deliveryArea,
          deliveryPostalCode: emp.deliveryPostalCode,
          deliveryAddressLine: emp.deliveryAddressLine,
          deliveryBuilding: emp.deliveryBuilding,
        });
        setDeliveryData((prev) => ({ ...prev, ...patch }));

        const deptCode = normalizeDepartmentCode(emp.departmentCode);
        if (deptCode) {
          setSelectedDeptCode(deptCode);
          setSelectedCompany(patch.deliveryCompanyName ?? emp.companyName);
          const area = patch.deliveryArea?.trim() ?? "";
          setSelectedArea(area);
          setSelectedAddressKey("");
          if (area) {
            const res = await fetch(
              `/api/master/locations?departmentCode=${encodeURIComponent(deptCode)}&withCascade=true`,
            );
            if (res.ok) {
              const d = (await res.json()) as {
                companies?: string[];
                departments?: ThdLocationDept[];
              };
              if (d.companies) setCompanyOptions(d.companies);
              if (d.departments) setDeptOptions(d.departments);
            }
          }
        }
      } finally {
        setAddressLoading(false);
      }
    },
    [setDeliveryRecipientRetired, setDeliveryData],
  );

  /** 下書き・プリフィルで社員番号のみ入っている場合、マスタ行を再確定する */
  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    if (selectedDelEmployeeId) return;
    const num = deliveryData.deliveryEmployeeNumber.trim();
    if (!num || delCandidates.length < 1) return;
    const match = delCandidates.find((c) => c.employeeNumber.trim() === num);
    if (match) {
      void applyDelFromEmployee(match);
    }
  }, [
    deliveryData.deliverySameAsUser,
    deliveryData.deliveryEmployeeNumber,
    selectedDelEmployeeId,
    delCandidates,
    applyDelFromEmployee,
  ]);

  /** プリフィルで氏名検索を経ず社員番号だけ入っている場合、番号からマスタを直接確定する */
  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    if (selectedDelEmployeeId) return;
    const num = deliveryData.deliveryEmployeeNumber.trim();
    if (!num) return;

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/employees?q=${encodeURIComponent(num)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { employees?: EmployeeMasterOption[] };
        if (ac.signal.aborted) return;
        if (!res.ok) return;
        const match = (data.employees ?? []).find((e) => e.employeeNumber.trim() === num);
        if (match) {
          void applyDelFromEmployee(match);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }, 300);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [
    deliveryData.deliverySameAsUser,
    deliveryData.deliveryEmployeeNumber,
    selectedDelEmployeeId,
    applyDelFromEmployee,
  ]);

  /** 外部プリフィル取り込み後に表示フラグを同期する */
  useEffect(() => {
    if (deliveryData.deliverySameAsUser) return;
    if (deliveryData.deliveryName.trim()) {
      setRevealDelEmployeeField(true);
    }
    if (deliveryData.deliveryEmployeeNumber.trim()) {
      setRevealDelDetailFields(true);
    }
  }, [
    deliveryData.deliverySameAsUser,
    deliveryData.deliveryName,
    deliveryData.deliveryEmployeeNumber,
  ]);

  const showDelEmployeeField =
    revealDelEmployeeField && deliveryData.deliveryName.trim().length > 0;
  const showDelDetailFields =
    revealDelDetailFields && deliveryData.deliveryEmployeeNumber.trim().length > 0;

  const deliveryNextDisabled = useMemo(() => {
    if (deliveryRetiredNotice) return true;
    if (deliveryData.deliverySameAsUser) {
      if (!userData.userEmployeeNumber.trim()) return true;
      if (!deliveryData.deliveryAddress.trim()) return true;
      return false;
    }
    if (delSearchLoading || addressLoading || deliverySyncLoading) return true;
    if (!deliveryData.deliveryName.trim()) return true;
    if (!deliveryData.deliveryEmployeeNumber.trim()) return true;
    if (!deliveryData.deliveryAddress.trim()) return true;
    return false;
  }, [
    deliveryRetiredNotice,
    deliveryData.deliverySameAsUser,
    deliveryData.deliveryName,
    deliveryData.deliveryEmployeeNumber,
    deliveryData.deliveryAddress,
    userData.userEmployeeNumber,
    delSearchLoading,
    addressLoading,
    deliverySyncLoading,
  ]);

  const applyLocationFromDept = (dept: ThdLocationDept) => {
    setSelectedDeptCode(dept.departmentCode);
    setDeliveryData((prev) => ({ ...prev, ...patchFromThdLocationRow(dept) }));
  };

  const showCompanyAsSelect = Boolean(selectedDelEmployeeId) && companyOptions.length > 0;
  const showAreaAsSelect = Boolean(selectedDelEmployeeId) && areaOptions.length > 0;
  const showDeptAsSelect =
    Boolean(selectedDelEmployeeId) &&
    Boolean(selectedCompany) &&
    Boolean(selectedArea || deliveryData.deliveryArea.trim()) &&
    deptOptions.length > 0;
  const addressCandidates = useMemo(() => {
    if (!selectedDeptCode) return [] as Array<{ key: string; label: string; dept: ThdLocationDept }>;
    const rows = deptOptions.filter((d) => d.departmentCode === selectedDeptCode);
    const seen = new Set<string>();
    const out: Array<{ key: string; label: string; dept: ThdLocationDept }> = [];
    for (const d of rows) {
      const key = `${d.departmentCode}::${d.postalCode ?? ""}::${d.address ?? ""}::${d.buildingName ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = [d.postalCode ?? "", d.address ?? "", d.buildingName ?? ""].filter(Boolean).join(" ");
      out.push({ key, label: label || d.departmentName || d.departmentCode, dept: d });
    }
    return out;
  }, [deptOptions, selectedDeptCode]);
  const showAddressAsSelect = Boolean(selectedDelEmployeeId) && addressCandidates.length > 0;

  return (
    <>
      <Box>
        <Typography sx={{ fontSize: 24, mb: 1, padding: "20px 0 20px 0" }}>
          Q. 送付先情報を入力してください
        </Typography>
      </Box>
      <Box component="form" onSubmit={onNext} sx={{ width: "90%", margin: "0 auto" }}>
        <Stack spacing={2.2}>
          {deliveryRetiredNotice && (
            <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              {EQUIPMENT_LENDING_RETIRED_BLOCKED_MESSAGE}
            </Alert>
          )}
          <FormControlLabel
            sx={{ ml: 0, ".MuiFormControlLabel-label": { fontSize: 16 } }}
            control={
              <Checkbox
                checked={deliveryData.deliverySameAsUser}
                onChange={(_, checked) => {
                  if (checked) {
                    setDeliveryRecipientRetired(userRetired);
                    setSelectedDelEmployeeId(null);
                    setRevealDelEmployeeField(false);
                    setRevealDelDetailFields(false);
                    setDelCandidates([]);
                    setSelectedAddressKey("");
                    setDeliveryData((prev) => ({ ...prev, deliverySameAsUser: true }));
                    void syncDeliveryFromUser();
                  } else {
                    setDeliveryRecipientRetired(false);
                    setSelectedDelEmployeeId(null);
                    setRevealDelEmployeeField(false);
                    setRevealDelDetailFields(false);
                    setDelCandidates([]);
                    setSelectedAddressKey("");
                    setDeliveryData({
                      deliverySameAsUser: false,
                      deliveryName: "",
                      deliveryEmployeeNumber: "",
                      deliveryCompanyName: "",
                      deliveryDepartment: "",
                      deliveryArea: "",
                      deliveryPostalCode: "",
                      deliveryAddress: "",
                      deliveryBuilding: "",
                      deliveryEmail: "",
                      deliveryPhone: "",
                    });
                  }
                }}
                sx={{ mr: 1, color: "#bdbdbd", "&.Mui-checked": { color: "#007D9E" } }}
              />
            }
            label="利用者と同じ"
          />
          {deliveryData.deliverySameAsUser && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontWeight: 600, fontSize: 15, color: "#007D9E" }}>
                送付先住所（利用者と同じ・編集可）
              </Typography>
              {(addressLoading || deliverySyncLoading) && (
                <Typography sx={{ fontSize: 14, color: "#666" }}>住所をマスタから取得しています…</Typography>
              )}
              {DELIVERY_DETAIL_FIELDS.map(({ key, label }) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={lendingFormRowLabelSx}>{label}</Typography>
                  <Box sx={lendingFormRowFieldCellSx}>
                    <TextField
                      value={deliveryData[key] as string}
                      onChange={(e) =>
                        setDeliveryData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      fullWidth
                      size="small"
                      required={key === "deliveryAddress"}
                      type={key === "deliveryEmail" ? "email" : key === "deliveryPhone" ? "tel" : "text"}
                      sx={lendingTextFieldRowSx}
                    />
                  </Box>
                </Box>
              ))}
            </>
          )}
          {!deliveryData.deliverySameAsUser && (
            <>
              {/* 氏名検索 */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={lendingFormRowLabelSx}>送付先氏名</Typography>
                <Box sx={{ ...lendingFormRowFieldCellSx, position: "relative" }}>
                  <TextField
                    value={deliveryData.deliveryName}
                    onChange={(e) => handleDelNameInput(e.target.value)}
                    placeholder="氏名の一部で検索（マスタから索引）"
                    required
                    fullWidth
                    size="small"
                    sx={lendingTextFieldRowSx}
                  />
                  {delSearchLoading && (
                    <CircularProgress size={22} sx={{ position: "absolute", right: 12, top: "50%", marginTop: "-11px" }} />
                  )}
                </Box>
              </Box>

              {showDelEmployeeField &&
                delCandidates.length >= 1 &&
                !selectedDelEmployeeId &&
                !deliveryData.deliveryEmployeeNumber.trim() && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={lendingFormRowLabelSx}>社員番号（選択）</Typography>
                    <Box sx={lendingFormRowFieldCellSx}>
                      <TextField
                        select
                        value={selectedDelEmployeeId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          const emp = delCandidates.find((c) => c.id === id);
                          if (emp) void applyDelFromEmployee(emp);
                        }}
                        required
                        fullWidth
                        size="small"
                        sx={lendingTextFieldRowSx}
                      >
                        <MenuItem value="" disabled>
                          社員番号を選択してください
                        </MenuItem>
                        {delCandidates.map((emp) => (
                          <MenuItem key={emp.id} value={emp.id}>
                            {emp.employeeNumber}　{emp.fullName}（{emp.companyName}・
                            {emp.departmentName}）
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                )}
              {showDelEmployeeField &&
                (selectedDelEmployeeId || deliveryData.deliveryEmployeeNumber.trim()) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={lendingFormRowLabelSx}>社員番号</Typography>
                  <Box sx={lendingFormRowFieldCellSx}>
                    <TextField
                      value={deliveryData.deliveryEmployeeNumber}
                      required
                      fullWidth
                      size="small"
                      sx={lendingTextFieldRowSx}
                      slotProps={{ htmlInput: { readOnly: true } }}
                    />
                  </Box>
                </Box>
              )}
              {showDelEmployeeField &&
                !delSearchLoading &&
                delCandidates.length === 0 &&
                !selectedDelEmployeeId &&
                !deliveryData.deliveryEmployeeNumber.trim() && (
                  <Typography sx={{ pl: "186px", fontSize: 14, color: "#d32f2f" }}>
                    該当する社員が見つかりません。マスタに登録された送付先のみ申請できます。
                  </Typography>
                )}

              {showDelDetailFields && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography sx={{ fontWeight: 600, fontSize: 15, color: "#007D9E" }}>
                    送付先住所・連絡先
                  </Typography>
                  {addressLoading && (
                    <Typography sx={{ fontSize: 14, color: "#666" }}>
                      マスタから住所を取得しています…
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={lendingFormRowLabelSx}>会社名</Typography>
                    <Box sx={lendingFormRowFieldCellSx}>
                      {showCompanyAsSelect ? (
                        <TextField
                          select
                          value={selectedCompany}
                          onChange={(e) => {
                            const company = e.target.value;
                            if (!company) {
                              setSelectedCompany("");
                              setSelectedArea("");
                              setSelectedDeptCode("");
                              setSelectedAddressKey("");
                              setDeliveryData((prev) => ({
                                ...prev,
                                deliveryCompanyName: "",
                              }));
                              return;
                            }
                            setSelectedCompany(company);
                            setSelectedDeptCode("");
                            setSelectedAddressKey("");
                            setDeliveryData((prev) => ({
                              ...prev,
                              deliveryCompanyName: company,
                            }));
                          }}
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        >
                          <MenuItem value="">直接入力</MenuItem>
                          {companyOptions.map((name) => (
                            <MenuItem key={name} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          value={deliveryData.deliveryCompanyName}
                          onChange={(e) =>
                            setDeliveryData((prev) => ({
                              ...prev,
                              deliveryCompanyName: e.target.value,
                            }))
                          }
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={lendingFormRowLabelSx}>エリア</Typography>
                    <Box sx={lendingFormRowFieldCellSx}>
                      {showAreaAsSelect ? (
                        <TextField
                          select
                          value={deliveryData.deliveryArea}
                          onChange={(e) => {
                            const area = e.target.value;
                            if (!area) {
                              setSelectedArea("");
                              setSelectedDeptCode("");
                              setSelectedAddressKey("");
                              setDeliveryData((prev) => ({ ...prev, deliveryArea: "" }));
                              return;
                            }
                            setSelectedArea(area);
                            setSelectedDeptCode("");
                            setSelectedAddressKey("");
                            setDeliveryData((prev) => ({ ...prev, deliveryArea: area }));
                          }}
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        >
                          <MenuItem value="">直接入力</MenuItem>
                          {deliveryData.deliveryArea &&
                            !areaOptions.includes(deliveryData.deliveryArea) && (
                              <MenuItem value={deliveryData.deliveryArea}>
                                {deliveryData.deliveryArea}
                              </MenuItem>
                            )}
                          {areaOptions.map((a) => (
                            <MenuItem key={a} value={a}>
                              {a}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          value={deliveryData.deliveryArea}
                          onChange={(e) =>
                            setDeliveryData((prev) => ({
                              ...prev,
                              deliveryArea: e.target.value,
                            }))
                          }
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={lendingFormRowLabelSx}>部署名</Typography>
                    <Box sx={lendingFormRowFieldCellSx}>
                      {showDeptAsSelect ? (
                        <TextField
                          select
                          value={selectedDeptCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            if (!code) {
                              setSelectedDeptCode("");
                              setSelectedAddressKey("");
                              return;
                            }
                            setSelectedDeptCode(code);
                            const dept = deptOptions.find((d) => d.departmentCode === code);
                            setDeliveryData((prev) => ({
                              ...prev,
                              deliveryDepartment: dept?.departmentName ?? prev.deliveryDepartment,
                            }));
                            setSelectedAddressKey("");
                          }}
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        >
                          <MenuItem value="">直接入力</MenuItem>
                          {deptOptions.map((d) => (
                            <MenuItem key={d.departmentCode} value={d.departmentCode}>
                              {d.departmentName}（{d.deliverySite ?? ""}）
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          value={deliveryData.deliveryDepartment}
                          onChange={(e) =>
                            setDeliveryData((prev) => ({
                              ...prev,
                              deliveryDepartment: e.target.value,
                            }))
                          }
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={lendingFormRowLabelSx}>住所</Typography>
                    <Box sx={lendingFormRowFieldCellSx}>
                      {showAddressAsSelect ? (
                        <TextField
                          select
                          value={selectedAddressKey}
                          onChange={(e) => {
                            const key = e.target.value;
                            if (!key) {
                              setSelectedAddressKey("");
                              return;
                            }
                            setSelectedAddressKey(key);
                            const row = addressCandidates.find((x) => x.key === key);
                            if (row) applyLocationFromDept(row.dept);
                          }}
                          fullWidth
                          size="small"
                          sx={lendingTextFieldRowSx}
                        >
                          <MenuItem value="">直接入力</MenuItem>
                          {addressCandidates.map((x) => (
                            <MenuItem key={x.key} value={x.key}>
                              {x.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField
                          value={deliveryData.deliveryAddress}
                          onChange={(e) =>
                            setDeliveryData((prev) => ({ ...prev, deliveryAddress: e.target.value }))
                          }
                          fullWidth
                          size="small"
                          required
                          sx={lendingTextFieldRowSx}
                        />
                      )}
                    </Box>
                  </Box>
                  {DELIVERY_DETAIL_FIELDS_WITHOUT_LOCATION.map(({ key, label }) => (
                    <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography sx={lendingFormRowLabelSx}>{label}</Typography>
                      <Box sx={lendingFormRowFieldCellSx}>
                        <TextField
                          value={deliveryData[key] as string}
                          onChange={(e) =>
                            setDeliveryData((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          fullWidth
                          size="small"
                          required={key === "deliveryAddress"}
                          type={
                            key === "deliveryEmail"
                              ? "email"
                              : key === "deliveryPhone"
                                ? "tel"
                                : "text"
                          }
                          sx={lendingTextFieldRowSx}
                        />
                      </Box>
                    </Box>
                  ))}
                </>
              )}
            </>
          )}
          {message && <Alert severity={message.type}>{message.text}</Alert>}
          {!deliveryData.deliverySameAsUser && (
            <Typography sx={{ textAlign: "center", color: "#666", fontSize: 12, pt: 1 }}>
              送付先氏名でマスタ検索し、社員番号を選択すると住所が自動入力されます。該当者がいない場合は「次へ」に進めません。
            </Typography>
          )}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, pt: 1 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onBack}
              sx={{ borderRadius: 999, width: 180, height: 46, fontSize: 18, borderColor: "#c9c9c9", color: "#333" }}
            >
              戻る
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={deliveryNextDisabled}
              sx={{ width: 180, height: 46, borderRadius: 999, backgroundColor: brandColor, fontSize: 18, "&:hover": { backgroundColor: "#006c88" } }}
            >
              次へ
            </Button>
          </Box>
        </Stack>
      </Box>
    </>
  );
}
