const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tossRead } = require("../.test-build/stock-data.js");

function withEnv(t, values) {
  const saved = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("Vercel client credentials cannot invalidate the local token by minting another", async (t) => {
  withEnv(t, {
    VERCEL: "1",
    TOSS_CLIENT_ID: "test-id",
    TOSS_CLIENT_SECRET: "test-secret",
    TOSS_ACCESS_TOKEN: undefined,
  });
  const upstream = t.mock.method(global, "fetch", async () => {
    throw new Error("Unexpected upstream call");
  });
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => tossRead("/api/v1/prices")),
  );
  assert.ok(
    results.every(
      (result) =>
        result.status === "rejected" &&
        /공유 인증 서버/.test(result.reason.message),
    ),
  );
  assert.equal(upstream.mock.callCount(), 0);
});

test("an explicitly managed Vercel token can perform an allowed read without minting", async (t) => {
  withEnv(t, { VERCEL: "1", TOSS_ACCESS_TOKEN: "test-shared-token" });
  const upstream = t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, "/api/v1/prices");
    assert.equal(options.headers.Authorization, "Bearer test-shared-token");
    return Response.json({ result: [] });
  });
  assert.deepEqual(await tossRead("/api/v1/prices"), []);
  assert.equal(upstream.mock.callCount(), 1);
});

test("an expired externally managed token fails without autonomous token issuance", async (t) => {
  withEnv(t, {
    VERCEL: "1",
    TOSS_CLIENT_ID: "test-id",
    TOSS_CLIENT_SECRET: "test-secret",
    TOSS_ACCESS_TOKEN: "test-expired-token",
  });
  const upstream = t.mock.method(global, "fetch", async (url) => {
    assert.equal(new URL(url).pathname, "/api/v1/prices");
    return new Response("", { status: 401 });
  });
  await assert.rejects(() => tossRead("/api/v1/prices"), /토스 시세 조회 실패/);
  assert.equal(upstream.mock.callCount(), 1);
});
