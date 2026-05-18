import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient();
}

/**
 * schema 追加後に `prisma generate` したが dev サーバーを再起動していないと、
 * global に古い PrismaClient が残り `prisma.equipmentReturnRequest` などが undefined になる。
 */
function getOrCreatePrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const hasEquipmentReturn =
    cached &&
    typeof (cached as unknown as { equipmentReturnRequest?: { create?: unknown } })
      .equipmentReturnRequest?.create === "function";
  const hasApplicationSelectOption =
    cached &&
    typeof (cached as unknown as { applicationSelectOption?: { findMany?: unknown } })
      .applicationSelectOption?.findMany === "function";

  if (cached && (!hasEquipmentReturn || !hasApplicationSelectOption)) {
    void cached.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

/**
 * HMR で global のクライアントは差し替わっても、`import { prisma }` が
 * モジュール初期化時の古いインスタンスを掴み続け `employee` が undefined のままになることがある。
 * Proxy で毎回 global 上の最新クライアントへ委譲する。
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getOrCreatePrisma();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

/** 明示的に取得したい場合（テスト等） */
export function getPrisma(): PrismaClient {
  return getOrCreatePrisma();
}
