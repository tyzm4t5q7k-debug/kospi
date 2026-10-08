import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const LOCAL_ORIGIN = "http://127.0.0.1:3012";
const DEFAULT_SITE = "https://kospi-swart.vercel.app";
const CODE_TTL = 5 * 60_000;
const SESSION_TTL = 8 * 60 * 60_000;
const hash = (value: string) => createHash("sha256").update(value).digest();

export class PersonalConnectionStore {
  private pairing: {
    hash: Buffer;
    expiresAt: number;
    attempts: number;
  } | null = null;
  private sessions = new Map<string, number>();

  issue(now = Date.now()) {
    const code = randomBytes(9).toString("hex");
    this.pairing = { hash: hash(code), expiresAt: now + CODE_TTL, attempts: 0 };
    return { code: code.match(/.{6}/g)!.join("-"), expiresAt: now + CODE_TTL };
  }
  connect(code: string, now = Date.now()) {
    const pairing = this.pairing;
    if (!pairing || pairing.expiresAt <= now || pairing.attempts >= 10)
      return null;
    pairing.attempts++;
    const normalized = code.replace(/[\s-]/g, "").toLowerCase();
    if (
      !/^[a-f0-9]{18}$/.test(normalized) ||
      !timingSafeEqual(hash(normalized), pairing.hash)
    )
      return null;
    this.pairing = null;
    this.count(now);
    while (this.sessions.size >= 5)
      this.sessions.delete(this.sessions.keys().next().value!);
    const token = randomBytes(32).toString("hex");
    const expiresAt = now + SESSION_TTL;
    this.sessions.set(hash(token).toString("hex"), expiresAt);
    return { token, expiresAt };
  }
  accepts(token: string | null, now = Date.now()) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
    const key = hash(token).toString("hex"),
      expiresAt = this.sessions.get(key);
    if (!expiresAt || expiresAt <= now) {
      this.sessions.delete(key);
      return false;
    }
    return true;
  }
  revoke(token: string) {
    this.sessions.delete(hash(token).toString("hex"));
  }
  clear() {
    this.pairing = null;
    this.sessions.clear();
  }
  count(now = Date.now()) {
    for (const [key, expiresAt] of this.sessions)
      if (expiresAt <= now) this.sessions.delete(key);
    return this.sessions.size;
  }
}

// Route bundles share one in-memory store in this single local Node process.
const shared = globalThis as typeof globalThis & {
  stockPersonalConnections?: PersonalConnectionStore;
};
export const connections = () =>
  (shared.stockPersonalConnections ??= new PersonalConnectionStore());

export function siteOrigin() {
  const configured = process.env.PERSONAL_SITE_ORIGIN;
  if (!configured) return DEFAULT_SITE;
  try {
    const url = new URL(configured);
    if (url.protocol === "https:" && url.origin === configured)
      return configured;
  } catch {
    /* Invalid configuration must not expand the origin allowlist. */
  }
  return DEFAULT_SITE;
}
export function localServer(request: Request) {
  // NextRequest normalizes loopback URL hostnames to localhost. The actual
  // HTTP Host must still be the exact numeric address used by the launcher.
  const origin = new URL(request.url).origin;
  return (
    process.env.VERCEL !== "1" &&
    [LOCAL_ORIGIN, "http://localhost:3012"].includes(origin) &&
    request.headers.get("host") === "127.0.0.1:3012"
  );
}
export function localOwner(request: Request) {
  return (
    localServer(request) &&
    request.headers.get("origin") === LOCAL_ORIGIN &&
    [null, "same-origin"].includes(request.headers.get("sec-fetch-site"))
  );
}
export function personalResponse(request: Request, response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Origin");
  if (localServer(request) && request.headers.get("origin") === siteOrigin())
    response.headers.set("Access-Control-Allow-Origin", siteOrigin());
  return response;
}
export function personalError(request: Request, error: string, status: number) {
  return personalResponse(request, Response.json({ error }, { status }));
}
export function stockAccess(request: Request): Response | null {
  // Public deployments retain their public market-data endpoints.
  if (process.env.VERCEL === "1") return null;
  if (!localServer(request))
    return personalError(
      request,
      "로컬 조회는 127.0.0.1:3012에서만 사용할 수 있어요.",
      403,
    );
  const origin = request.headers.get("origin"),
    fetchSite = request.headers.get("sec-fetch-site");
  if (
    (!origin || origin === LOCAL_ORIGIN) &&
    (!fetchSite || ["same-origin", "none"].includes(fetchSite))
  )
    return null;
  if (origin !== siteOrigin())
    return personalError(request, "허용되지 않은 홈페이지입니다.", 403);
  if (!connections().accepts(request.headers.get("X-Stock-Connection")))
    return personalError(
      request,
      "개인 연결이 만료되었어요. PC에서 새 연결 코드를 만들어 주세요.",
      401,
    );
  return null;
}
export function personalPreflight(request: Request, methods = ["GET"]) {
  const method = request.headers.get("Access-Control-Request-Method") ?? "";
  const requestedHeaders = (
    request.headers.get("Access-Control-Request-Headers") ?? ""
  )
    .toLowerCase()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !localServer(request) ||
    request.headers.get("origin") !== siteOrigin() ||
    !methods.includes(method) ||
    requestedHeaders.some(
      (name) => !["content-type", "x-stock-connection"].includes(name),
    )
  )
    return personalError(request, "허용되지 않은 연결 요청입니다.", 403);
  return personalResponse(
    request,
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": methods.join(", "),
        "Access-Control-Allow-Headers": "Content-Type, X-Stock-Connection",
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "600",
      },
    }),
  );
}
