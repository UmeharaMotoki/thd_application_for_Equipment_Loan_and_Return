import { normalizeDepartmentCode } from "@/lib/departmentCodeNormalize";

/** 送付先フォームへ流し込む住所・連絡先のパッチ */
export type DeliveryAddressPatch = {
  deliveryCompanyName?: string;
  deliveryDepartment?: string;
  deliveryArea?: string;
  deliveryPostalCode?: string;
  deliveryAddress?: string;
  deliveryBuilding?: string;
};

type ThdLocationRow = {
  area?: string | null;
  postalCode?: string | null;
  address?: string | null;
  buildingName?: string | null;
  departmentName?: string | null;
};

export function patchFromThdLocationRow(
  loc: ThdLocationRow,
  opts?: { companyName?: string; departmentName?: string },
): DeliveryAddressPatch {
  const patch: DeliveryAddressPatch = {};
  const area = loc.area?.trim();
  if (area) patch.deliveryArea = area;
  const postal = loc.postalCode?.trim();
  if (postal) patch.deliveryPostalCode = postal;
  const addr = loc.address?.trim();
  if (addr) patch.deliveryAddress = addr;
  const building = loc.buildingName?.trim();
  if (building) patch.deliveryBuilding = building;
  const deptName = (opts?.departmentName ?? loc.departmentName)?.trim();
  if (deptName) patch.deliveryDepartment = deptName;
  const company = opts?.companyName?.trim();
  if (company) patch.deliveryCompanyName = company;
  return patch;
}

/** 社員検索 API が返す THD 拠点の分解フィールド */
export type EmployeeDeliveryFields = {
  companyName: string;
  departmentName: string;
  departmentCode: string | null;
  /** 表示用の結合住所（未突合時は本社デフォルト） */
  address: string;
  deliveryArea?: string | null;
  deliveryPostalCode?: string | null;
  deliveryAddressLine?: string | null;
  deliveryBuilding?: string | null;
};

/** 分解済みフィールドがあれば優先し、住所行だけ結合 address にフォールバック */
export function deliveryPatchFromEmployeeSearch(emp: EmployeeDeliveryFields): DeliveryAddressPatch {
  const patch: DeliveryAddressPatch = {
    deliveryCompanyName: emp.companyName || undefined,
    deliveryDepartment: emp.departmentName || undefined,
  };
  const area = emp.deliveryArea?.trim();
  if (area) patch.deliveryArea = area;
  const postal = emp.deliveryPostalCode?.trim();
  if (postal) patch.deliveryPostalCode = postal;
  const building = emp.deliveryBuilding?.trim();
  if (building) patch.deliveryBuilding = building;
  const street = emp.deliveryAddressLine?.trim();
  const combined = emp.address?.trim();
  if (street) {
    patch.deliveryAddress = street;
  } else if (combined) {
    patch.deliveryAddress = combined;
  }
  return patch;
}

function mergeDeliveryPatches(
  base: DeliveryAddressPatch,
  extra: DeliveryAddressPatch,
): DeliveryAddressPatch {
  return {
    deliveryCompanyName: extra.deliveryCompanyName ?? base.deliveryCompanyName,
    deliveryDepartment: extra.deliveryDepartment ?? base.deliveryDepartment,
    deliveryArea: extra.deliveryArea ?? base.deliveryArea,
    deliveryPostalCode: extra.deliveryPostalCode ?? base.deliveryPostalCode,
    deliveryAddress: extra.deliveryAddress ?? base.deliveryAddress,
    deliveryBuilding: extra.deliveryBuilding ?? base.deliveryBuilding,
  };
}

/**
 * 人事マスタの部署コード → THD拠点マスタ、なければ社員検索の address を返す。
 */
export async function fetchDeliveryAddressPatch(
  input: EmployeeDeliveryFields,
): Promise<DeliveryAddressPatch> {
  const fromSearch = deliveryPatchFromEmployeeSearch(input);
  const deptCode = normalizeDepartmentCode(input.departmentCode);

  if (!deptCode) {
    return fromSearch;
  }

  try {
    const res = await fetch(
      `/api/master/locations?departmentCode=${encodeURIComponent(deptCode)}&withCascade=true`,
    );
    if (!res.ok) {
      return fromSearch;
    }
    const d = (await res.json()) as { location?: ThdLocationRow | null };
    if (d.location) {
      return mergeDeliveryPatches(fromSearch, patchFromThdLocationRow(d.location, input));
    }
  } catch {
    /* ignore */
  }

  return fromSearch;
}
