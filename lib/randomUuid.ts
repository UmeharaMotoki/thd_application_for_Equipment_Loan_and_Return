/** ブラウザ・Node 両対応の UUID 生成（クライアント import 可） */
export function randomUuid(): string {
  return globalThis.crypto.randomUUID();
}
