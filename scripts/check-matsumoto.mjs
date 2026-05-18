import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const hr = await p.hrPersonnelRecord.findMany({
  where: {
    OR: [
      { employeeName: { contains: "松本", mode: "insensitive" } },
      { employeeNumber: "0001173211" },
    ],
  },
  orderBy: { importedAt: "desc" },
  take: 5,
});

console.log("=== hr_personnel_record ===");
for (const r of hr) {
  console.log({
    employeeNumber: r.employeeNumber,
    employeeName: r.employeeName,
    departmentCode: JSON.stringify(r.departmentCode),
    departmentName: r.departmentName,
    systemEmail: r.systemEmail,
  });
}

const emp = hr.find((r) => r.employeeNumber?.trim() === "0001173211") ?? hr[0];
if (!emp) {
  console.log("NO HR ROW for 松本 / 0001173211");
  await p.$disconnect();
  process.exit(0);
}

const code = (emp.departmentCode ?? "").trim();
const thdExact = await p.thdLocation.findFirst({
  where: { departmentCode: emp.departmentCode ?? "" },
  orderBy: { importedAt: "desc" },
});
const thdAll = await p.$queryRaw`
  SELECT "departmentCode", "departmentName", area, "postalCode", address, "buildingName"
  FROM thd_location
  WHERE TRIM("departmentCode") = ${code}
  ORDER BY "importedAt" DESC
  LIMIT 3
`;

console.log("\n=== thd_location (exact departmentCode) ===");
console.log(thdExact);
console.log("\n=== thd_location (TRIM match) ===");
console.log(thdAll);

const thdBare = await p.thdLocation.findMany({
  where: { departmentCode: { contains: "060000713" } },
  take: 5,
});
console.log("\n=== thd_location (contains 060000713) ===");
for (const t of thdBare) {
  console.log({
    departmentCode: JSON.stringify(t.departmentCode),
    postalCode: t.postalCode,
    address: t.address,
    area: t.area,
  });
}

await p.$disconnect();
