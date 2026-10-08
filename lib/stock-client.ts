export type PersonalSession = { token: string; expiresAt: number };
export const LOCAL_STOCK_ORIGIN = "http://127.0.0.1:3012";
export const PERSONAL_SESSION_KEY = "stock-personal-connection-v1";

export function validPersonalSession(value: unknown): value is PersonalSession {
  if (!value || typeof value !== "object") return false;
  const session = value as PersonalSession;
  return (
    typeof session.token === "string" &&
    /^[a-f0-9]{64}$/.test(session.token) &&
    Number.isFinite(session.expiresAt) &&
    session.expiresAt > Date.now()
  );
}
export async function stockRequest(
  path: string,
  init: RequestInit = {},
  session: PersonalSession | null = null,
) {
  if (!session) return fetch(path, init);
  if (
    !/^\/api\/stocks(?:\?(?:[^#]*)|\/(?:quote|screen)(?:\?[^#]*)?)?$/.test(path)
  )
    throw new Error("허용되지 않은 개인 조회입니다.");
  if (!validPersonalSession(session))
    throw new Error("개인 연결이 만료되었어요. 새 연결 코드를 입력해 주세요.");
  const headers = new Headers(init.headers);
  headers.set("X-Stock-Connection", session.token);
  try {
    return await fetch(`${LOCAL_STOCK_ORIGIN}${path}`, {
      ...init,
      headers,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new Error(
      "내 PC 연결에 응답이 없어요. 조회 프로그램 실행과 브라우저의 로컬 네트워크 권한을 확인해 주세요.",
    );
  }
}
