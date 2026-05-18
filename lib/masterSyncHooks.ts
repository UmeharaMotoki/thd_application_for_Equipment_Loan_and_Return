import { getPrisma } from "@/lib/prisma";

/**
 * 納品先マスタ取込後: ThdLocation の住所を DeliverySiteMaster から更新する。
 * ThdLocation.deliverySite = DeliverySiteMaster.deliverySite で突合し、
 * postalCode / address / buildingName を上書きする。
 */
export async function syncThdLocationAddressFromDelivery(): Promise<number> {
  const prisma = getPrisma();

  const deliveryRecords = await prisma.deliverySiteMaster.findMany({
    where: { deliverySite: { not: null } },
    select: { deliverySite: true, postalCode: true, address: true, building: true },
  });

  const deliveryMap = new Map<
    string,
    { postalCode: string | null; address: string | null; building: string | null }
  >();
  for (const d of deliveryRecords) {
    if (d.deliverySite) {
      deliveryMap.set(d.deliverySite, {
        postalCode: d.postalCode,
        address: d.address,
        building: d.building,
      });
    }
  }

  const thdLocations = await prisma.thdLocation.findMany({
    where: { deliverySite: { not: null } },
    select: { id: true, deliverySite: true },
  });

  let updated = 0;
  for (const loc of thdLocations) {
    const match = loc.deliverySite ? deliveryMap.get(loc.deliverySite) : null;
    if (match) {
      await prisma.thdLocation.update({
        where: { id: loc.id },
        data: {
          postalCode: match.postalCode,
          address: match.address,
          buildingName: match.building,
        },
      });
      updated++;
    }
  }

  return updated;
}
