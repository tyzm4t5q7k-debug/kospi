const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getStockData } = require("../.test-build/stock-data.js");
test("cached chart data keeps its original observation cutoff across later responses", async (t) => {
  const token = process.env.TOSS_ACCESS_TOKEN;
  process.env.TOSS_ACCESS_TOKEN = "test-token";
  t.after(() => {
    if (token === undefined) delete process.env.TOSS_ACCESS_TOKEN;
    else process.env.TOSS_ACCESS_TOKEN = token;
  });
  const at = Date.parse("2026-10-08T10:00:15+09:00");
  t.mock.timers.enable({ apis: ["Date"], now: at });
  let chartCalls = 0;
  t.mock.method(global, "fetch", async (url) => {
    if (new URL(url).pathname === "/api/v1/prices")
      return Response.json({
        result: [
          {
            symbol: "005930",
            lastPrice: "101",
            currency: "KRW",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    assert.equal(new URL(url).pathname, "/api/v1/candles");
    chartCalls++;
    return Response.json({
      result: {
        candles: [
          {
            timestamp: "2026-10-08T10:00:00+09:00",
            openPrice: "100",
            highPrice: "102",
            lowPrice: "99",
            closePrice: "101",
            volume: "1000",
            currency: "KRW",
          },
        ],
        nextBefore: null,
      },
    });
  });
  const first = await getStockData("005930", "KOSPI", "1m", false);
  t.mock.timers.tick(5000);
  const cached = await getStockData("005930", "KOSPI", "1m", false);
  assert.equal(chartCalls, 1);
  assert.equal(first.candlesAsOf, new Date(at).toISOString());
  assert.equal(cached.candlesAsOf, first.candlesAsOf);
  assert.notEqual(cached.fetchedAt, first.fetchedAt);
  assert.equal(cached.candles[0].time, Date.parse("2026-10-08T09:59:00+09:00"));
  t.mock.timers.tick(11000);
  const refreshed = await getStockData("005930", "KOSPI", "1m", false);
  assert.equal(chartCalls, 2);
  assert.notEqual(refreshed.candlesAsOf, first.candlesAsOf);
});
