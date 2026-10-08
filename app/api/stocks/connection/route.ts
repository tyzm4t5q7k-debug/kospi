import {
  connections,
  localOwner,
  localServer,
  personalError,
  personalPreflight,
  personalResponse,
  siteOrigin,
  stockAccess,
} from "../../../../lib/personal-connection";
import { tossConfigured } from "../../../../lib/stock-data";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!localServer(request))
    return Response.json(
      { error: "이 PC의 조회 프로그램에서만 연결 코드를 만들 수 있어요." },
      { status: 404 },
    );
  const denied = stockAccess(request);
  if (denied) return denied;
  return personalResponse(
    request,
    Response.json({
      configured: tossConfigured(),
      sessions: connections().count(),
      siteOrigin: siteOrigin(),
    }),
  );
}
export async function POST(request: Request) {
  if (!localServer(request))
    return personalError(
      request,
      "이 PC에서 조회 프로그램을 먼저 실행해 주세요.",
      404,
    );
  const owner = localOwner(request);
  if (!owner && request.headers.get("origin") !== siteOrigin())
    return personalError(request, "허용되지 않은 홈페이지입니다.", 403);
  if (
    !(request.headers.get("content-type") ?? "").startsWith("application/json")
  )
    return personalError(request, "연결 요청 형식 오류", 400);
  if (Number(request.headers.get("content-length") ?? 0) > 512)
    return personalError(request, "연결 요청이 너무 큽니다.", 413);
  const text = await request.text();
  if (text.length > 512)
    return personalError(request, "연결 요청이 너무 큽니다.", 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return personalError(request, "연결 요청 형식 오류", 400);
  }
  if (!body || typeof body !== "object")
    return personalError(request, "연결 요청 형식 오류", 400);
  if (body.action === "issue" && owner) {
    if (!tossConfigured())
      return personalError(request, "이 PC에 토스 API 설정이 필요합니다.", 503);
    return personalResponse(request, Response.json(connections().issue()));
  }
  if (body.action === "revoke-all" && owner) {
    connections().clear();
    return personalResponse(request, Response.json({ disconnected: true }));
  }
  if (body.action === "connect" && !owner && typeof body.code === "string") {
    const session = connections().connect(body.code);
    return session
      ? personalResponse(request, Response.json(session))
      : personalError(
          request,
          "연결 코드가 틀렸거나 만료되었어요. PC에서 새 코드를 만들어 주세요.",
          401,
        );
  }
  return personalError(request, "허용되지 않은 연결 동작입니다.", 403);
}
export async function DELETE(request: Request) {
  if (!localServer(request))
    return personalError(request, "로컬 연결만 해제할 수 있어요.", 404);
  const denied = stockAccess(request);
  if (denied) return denied;
  const token = request.headers.get("X-Stock-Connection");
  if (token) connections().revoke(token);
  return personalResponse(request, Response.json({ disconnected: true }));
}
export function OPTIONS(request: Request) {
  return personalPreflight(request, ["GET", "POST", "DELETE"]);
}
