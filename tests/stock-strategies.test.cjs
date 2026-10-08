const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeHorizon,
  completedWeeks,
} = require("../.test-build/stock-strategies.js");
const { koreanDate } = require("../.test-build/stock-types.js");
const minuteBars = () =>
  Array.from({ length: 120 }, (_, i) => {
    const time = Date.parse("2026-10-08T09:00:00+09:00") + i * 60000;
    const close = 100 + i * 0.01 + Math.sin(i / 4) * 0.1;
    return {
      time,
      date: koreanDate(time),
      open: close - 0.02,
      high: close + 0.1,
      low: close - 0.1,
      close,
      volume: 2000000 + i * 100,
    };
  });
function longBars() {
  const result = [];
  let time = Date.parse("2025-01-02T00:00:00Z");
  while (result.length < 300) {
    const day = new Date(time).getUTCDay();
    if (day > 0 && day < 6) {
      const i = result.length,
        close = 100 + i * 0.1 + Math.sin(i / 5) * 2;
      result.push({
        time,
        date: koreanDate(time),
        open: close - 0.2,
        high: close + 1,
        low: close - 1,
        close,
        volume: 20000000,
      });
    }
    time += 86400000;
  }
  return result;
}
const flowsFor = (bars) =>
  bars.map((b) => ({
    date: b.date,
    updatedAt: b.date,
    individual: -30,
    institution: 10,
    foreigner: 20,
    foreignHolding: null,
    foreignRate: null,
    credit: null,
    lending: null,
    short: null,
  }));
test("day analysis excludes the live minute and never consumes daily investor flows", () => {
  const bars = minuteBars(),
    now = Date.parse("2026-10-08T11:00:00+09:00");
  const original = analyzeHorizon(bars, [], "day", now);
  assert.notEqual(original.score, null);
  assert.equal(original.flowDays, 0);
  assert.equal(original.strategies.length, 2);
  const unfinished = {
    ...bars.at(-1),
    time: now,
    close: 999999,
    high: 999999,
    volume: 1e12,
  };
  assert.deepEqual(
    analyzeHorizon([...bars, unfinished], flowsFor(bars), "day", now),
    original,
  );
});
test("day strategy refuses stale data and a session missing its VWAP opening anchor", () => {
  const bars = minuteBars(),
    now = Date.parse("2026-10-08T11:00:00+09:00");
  const stale = analyzeHorizon(bars, [], "day", now + 6 * 60000);
  assert.equal(stale.score, null);
  assert.equal(stale.eligible, false);
  assert.match(stale.risks.join(" "), /지연/);
  const partial = analyzeHorizon(bars.slice(1), [], "day", now);
  assert.equal(partial.score, null);
  assert.match(partial.risks.join(" "), /VWAP/);
});
test("completed week aggregation excludes the current week and preserves OHLCV", () => {
  const row = (date, open, high, low, close, volume) => ({
    time: Date.parse(date + "T00:00:00Z"),
    date,
    open,
    high,
    low,
    close,
    volume,
  });
  const candles = [
    row("2026-09-28", 10, 13, 9, 12, 100),
    row("2026-10-02", 12, 15, 11, 14, 200),
    row("2026-10-05", 14, 999, 1, 998, 10000),
  ];
  assert.deepEqual(completedWeeks(candles, "2026-10-08"), [
    {
      time: Date.parse("2026-10-02T00:00:00Z"),
      date: "2026-10-02",
      open: 10,
      high: 15,
      low: 9,
      close: 14,
      volume: 300,
    },
  ]);
});
test("position strategies need long history and all twenty completed flow sessions", () => {
  const bars = longBars(),
    now = bars.at(-1).time + 86400000;
  const signal = analyzeHorizon(
    bars,
    flowsFor(bars.slice(-20)),
    "position",
    now,
  );
  assert.notEqual(signal.score, null);
  assert.equal(signal.flowDays, 20);
  assert.equal(signal.flow.days, 20);
  assert.equal(signal.flow.status, "동반 순매수");
  assert.equal(signal.strategies.length, 2);
  const missing = analyzeHorizon(
    bars,
    flowsFor(bars.slice(-5)),
    "position",
    now,
  );
  assert.equal(missing.flow.status, "자료 부족");
  assert.equal(missing.eligible, false);
  const short = analyzeHorizon(bars.slice(-219), [], "position", now);
  assert.equal(short.score, null);
  assert.match(short.risks.join(" "), /220/);
});
test("position analysis ignores a future daily candle and swing keeps its own flow window", () => {
  const bars = longBars(),
    now = bars.at(-1).time + 86400000,
    flows = flowsFor(bars.slice(-20));
  const expected = analyzeHorizon(bars, flows, "position", now);
  const future = {
    ...bars.at(-1),
    time: now,
    date: koreanDate(now),
    high: 999999,
    close: 999999,
  };
  assert.deepEqual(
    analyzeHorizon([...bars, future], flows, "position", now),
    expected,
  );
  const swing = analyzeHorizon(bars, flows, "swing", now);
  assert.equal(swing.flowDays, 5);
  assert.equal(swing.flow.days, 5);
  assert.equal(swing.strategies.length, 3);
});
