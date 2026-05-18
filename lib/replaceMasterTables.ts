import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const CHUNK = 500;

export async function replaceHrPersonnelRecords(
  data: Prisma.HrPersonnelRecordCreateManyInput[],
): Promise<number> {
  if (data.length === 0) {
    throw new Error(
      "取り込みデータが 0 件のため hr_personnel_record は変更していません（空ファイル・先頭シート違い・列名不一致などの可能性があります）。",
    );
  }
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.hrPersonnelRecord.deleteMany({});
    for (let i = 0; i < data.length; i += CHUNK) {
      await tx.hrPersonnelRecord.createMany({
        data: data.slice(i, i + CHUNK),
      });
    }
  });
  return data.length;
}

export async function replaceDeliverySiteMaster(
  data: Prisma.DeliverySiteMasterCreateManyInput[],
): Promise<number> {
  if (data.length === 0) {
    throw new Error(
      "取り込みデータが 0 件のため delivery_site_master は変更していません（空ファイル・列名不一致などの可能性があります）。",
    );
  }
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.deliverySiteMaster.deleteMany({});
    for (let i = 0; i < data.length; i += CHUNK) {
      await tx.deliverySiteMaster.createMany({
        data: data.slice(i, i + CHUNK),
      });
    }
  });
  return data.length;
}

export async function replaceThdLocation(
  data: Prisma.ThdLocationCreateManyInput[],
): Promise<number> {
  if (data.length === 0) {
    throw new Error(
      "取り込みデータが 0 件のため ThdLocation は変更していません（CSV 形式・ヘッダを確認してください）。",
    );
  }
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.thdLocation.deleteMany({});
    for (let i = 0; i < data.length; i += CHUNK) {
      await tx.thdLocation.createMany({
        data: data.slice(i, i + CHUNK),
      });
    }
  });
  return data.length;
}

export async function writeMasterImportLog(
  kind: "HR_PERSONNEL" | "DELIVERY_MASTER" | "THD_LOCATION",
  source: "manual" | "s3",
  success: boolean,
  rowCount: number | null,
  message: string | null,
): Promise<void> {
  await getPrisma().masterImportLog.create({
    data: { kind, source, success, rowCount, message },
  });
}
