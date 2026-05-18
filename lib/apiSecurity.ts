import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 60;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function readAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((v) => normalizeOrigin(v))
    .filter(Boolean);
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin) {
    return {};
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const allowList = readAllowedOrigins();
  const isAllowed = allowList.length === 0 || allowList.includes(normalizedOrigin);
  if (!isAllowed) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": normalizedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    Vary: "Origin",
  };
}

export function withCors(res: NextResponse, req: Request): NextResponse {
  const headers = buildCorsHeaders(req);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

export function buildPreflightResponse(req: Request): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

function pruneExpiredEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export function checkRateLimit(req: Request, keyPrefix: string) {
  const now = Date.now();
  pruneExpiredEntries(now);

  const key = `${keyPrefix}:${getClientIp(req)}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { ok: true as const, remaining: RATE_LIMIT_MAX_PER_WINDOW - 1, resetAt };
  }

  if (existing.count >= RATE_LIMIT_MAX_PER_WINDOW) {
    return { ok: false as const, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { ok: true as const, remaining: RATE_LIMIT_MAX_PER_WINDOW - existing.count, resetAt: existing.resetAt };
}

export function createRateLimitResponse(req: Request, resetAt: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const res = NextResponse.json(
    { error: "リクエスト数が上限に達しました。しばらくしてからお試しください。" },
    { status: 429 },
  );
  res.headers.set("Retry-After", String(retryAfterSec));
  return withCors(res, req);
}
