import { NextRequest, NextResponse } from "next/server";

const SKIP = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/api\/healthz/, // ECS ヘルスチェック（除外必須）
  /^\/api\/admin\/masters\//, // マスタ管理API（独自認証あり）
];

export function proxy(req: NextRequest) {
  // 実行時に毎回読む（ビルド時固定にならないよう関数内で参照）
  const basicUser = process.env.BASIC_AUTH_USER ?? "admin";
  const basicPass = process.env.BASIC_AUTH_PASS ?? "";

  if (!basicPass) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (SKIP.some((re) => re.test(pathname))) return NextResponse.next();

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const colon = decoded.indexOf(":");
    if (colon > 0) {
      const user = decoded.slice(0, colon);
      const pass = decoded.slice(colon + 1);
      if (user === basicUser && pass === basicPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="THD"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
