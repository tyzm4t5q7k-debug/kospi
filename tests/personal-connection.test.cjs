const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PersonalConnectionStore,
  connections,
  localOwner,
  localServer,
  siteOrigin,
  stockAccess,
  personalPreflight,
  personalResponse,
} = require("../.test-build/personal-connection.js");
const { stockRequest } = require("../.test-build/stock-client.js");
const { NextRequest } = require("next/server");
const site = "https://kospi-swart.vercel.app";
function env(t, values = {}) {
  const changes = {
    VERCEL: undefined,
    PERSONAL_SITE_ORIGIN: undefined,
    ...values,
  };
  const before = Object.fromEntries(
    Object.keys(changes).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    connections().clear();
  });
}
const request = (
  headers = {},
  method = "GET",
  url = "http://127.0.0.1:3012/api/stocks",
) =>
  new Request(url, { method, headers: { host: "127.0.0.1:3012", ...headers } });

test("pairing is single-use, expires, and rejects guesses after ten attempts", () => {
  const store = new PersonalConnectionStore();
  const issued = store.issue(1000),
    connected = store.connect(issued.code, 1001);
  assert.ok(connected && store.accepts(connected.token, 1002));
  assert.equal(store.connect(issued.code, 1002), null);
  assert.equal(store.accepts(connected.token, connected.expiresAt), false);
  const expired = store.issue(2000);
  assert.equal(store.connect(expired.code, expired.expiresAt), null);
  const exhausted = store.issue(3000);
  for (let i = 0; i < 10; i++) assert.equal(store.connect("wrong", 3001), null);
  assert.equal(store.connect(exhausted.code, 3002), null);
});
test("new codes replace old codes; disconnect revokes sessions with a bounded session store", () => {
  const store = new PersonalConnectionStore();
  const old = store.issue(1000),
    current = store.issue(1001);
  assert.equal(store.connect(old.code, 1002), null);
  const first = store.connect(current.code, 1002);
  for (let i = 0; i < 5; i++)
    store.connect(store.issue(2000 + i).code, 2000 + i);
  assert.equal(store.count(3000), 5);
  assert.equal(store.accepts(first.token, 3000), false);
  const last = store.connect(store.issue(4000).code, 4000);
  store.revoke(last.token);
  assert.equal(store.accepts(last.token, 4001), false);
  store.clear();
  assert.equal(store.count(4001), 0);
});
test("only the exact loopback host and local origin can issue or revoke all connections", (t) => {
  env(t);
  assert.equal(
    localOwner(
      request({
        origin: "http://127.0.0.1:3012",
        "sec-fetch-site": "same-origin",
      }),
    ),
    true,
  );
  assert.equal(localOwner(request({ origin: site })), false);
  assert.equal(localServer(request({ host: "attacker.example:3012" })), false);
  assert.equal(
    localServer(request({}, "GET", "https://attacker.example/api/stocks")),
    false,
  );
  assert.equal(localOwner(request({ origin: "null" })), false);
  assert.equal(
    localOwner(
      request({
        origin: "http://127.0.0.1:3012",
        "sec-fetch-site": "cross-site",
      }),
    ),
    false,
  );
});
test("NextRequest URL normalization preserves the strict actual Host check", (t) => {
  env(t);
  const normalized = new NextRequest("http://127.0.0.1:3012/api/stocks", {
    headers: { host: "127.0.0.1:3012", origin: "http://127.0.0.1:3012" },
  });
  assert.equal(new URL(normalized.url).hostname, "localhost");
  assert.equal(localOwner(normalized), true);
  const alias = new NextRequest("http://localhost:3012/api/stocks", {
    headers: { host: "localhost:3012", origin: "http://127.0.0.1:3012" },
  });
  assert.equal(localOwner(alias), false);
});
test("a correct origin still needs a valid personal token and another site cannot reuse it", (t) => {
  env(t);
  const session = connections().connect(connections().issue().code);
  assert.equal(stockAccess(request({ origin: site })).status, 401);
  assert.equal(
    stockAccess(request({ origin: site, "X-Stock-Connection": session.token })),
    null,
  );
  assert.equal(
    stockAccess(
      request({
        origin: "https://evil.example",
        "X-Stock-Connection": session.token,
      }),
    ).status,
    403,
  );
  assert.equal(
    stockAccess(request({ "sec-fetch-site": "cross-site" })).status,
    403,
  );
  assert.equal(stockAccess(request()), null);
  connections().revoke(session.token);
  assert.equal(
    stockAccess(request({ origin: site, "X-Stock-Connection": session.token }))
      .status,
    401,
  );
});
test("CORS permits only the exact site, method and known headers and never wildcard credentials", (t) => {
  env(t);
  const valid = request(
    {
      origin: site,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "x-stock-connection",
    },
    "OPTIONS",
  );
  const response = personalPreflight(valid);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), site);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
  assert.equal(
    personalPreflight(
      request(
        {
          origin: "https://evil.example",
          "Access-Control-Request-Method": "GET",
        },
        "OPTIONS",
      ),
    ).status,
    403,
  );
  assert.equal(
    personalPreflight(
      request(
        { origin: site, "Access-Control-Request-Method": "POST" },
        "OPTIONS",
      ),
    ).status,
    403,
  );
  assert.equal(
    personalPreflight(
      request(
        {
          origin: site,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Authorization",
        },
        "OPTIONS",
      ),
    ).status,
    403,
  );
  assert.equal(
    personalResponse(
      request({ origin: "https://evil.example" }),
      new Response(),
    ).headers.get("Access-Control-Allow-Origin"),
    null,
  );
});
test("Vercel cannot expose a local pairing service; public stock endpoints remain available", (t) => {
  env(t, { VERCEL: "1" });
  assert.equal(localServer(request()), false);
  assert.equal(localOwner(request({ origin: "http://127.0.0.1:3012" })), false);
  assert.equal(stockAccess(request()), null);
  assert.equal(
    personalPreflight(
      request(
        { origin: site, "Access-Control-Request-Method": "GET" },
        "OPTIONS",
      ),
    ).status,
    403,
  );
});
test("invalid origin configuration cannot expand the origin allowlist", (t) => {
  env(t, { PERSONAL_SITE_ORIGIN: "https://kospi-swart.vercel.app/" });
  assert.equal(siteOrigin(), site);
  process.env.PERSONAL_SITE_ORIGIN = "*";
  assert.equal(siteOrigin(), site);
});
test("personal tokens are sent only to fixed loopback stock reads, never to public or arbitrary URLs", async (t) => {
  const session = { token: "a".repeat(64), expiresAt: Date.now() + 60000 };
  const calls = [];
  t.mock.method(global, "fetch", async (url, init) => {
    calls.push({ url, init });
    return Response.json({});
  });
  await stockRequest("/api/stocks?code=005930", {}, session);
  assert.equal(calls[0].url, "http://127.0.0.1:3012/api/stocks?code=005930");
  assert.equal(calls[0].init.headers.get("X-Stock-Connection"), session.token);
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.credentials, "omit");
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/api/stocks/../orders",
    "/api/stocks/connection",
    "/api/orders",
  ])
    await assert.rejects(
      () => stockRequest(path, {}, session),
      /허용되지 않은/,
    );
  assert.equal(calls.length, 1);
  await stockRequest("/api/stocks?code=005930");
  assert.equal(calls[1].url, "/api/stocks?code=005930");
  assert.equal(calls[1].init.headers, undefined);
  await assert.rejects(
    () => stockRequest("/api/stocks", {}, { ...session, expiresAt: 0 }),
    /만료/,
  );
  assert.equal(calls.length, 2);
});
