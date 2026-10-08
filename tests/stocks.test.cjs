const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  sma,
  ema,
  calculateIndicators,
  evaluateSignal,
  summarizeFlow,
  volumeProfile,
} = require("../.test-build/stock-indicators.js");
const {
  cleanCandles,
  numeric,
  koreanDate,
} = require("../.test-build/stock-types.js");
const {
  parseTossCandles,
  parseYahoo,
  mergeFlows,
  tossRead,
} = require("../.test-build/stock-data.js");
test("read-only Toss requests retry a bounded 429 and never permit an order path", async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.TOSS_ACCESS_TOKEN;
  process.env.TOSS_ACCESS_TOKEN = "unit-test-token";
  let calls = 0;
  global.fetch = async () =>
    ++calls === 1
      ? new Response("", { status: 429, headers: { "Retry-After": "0" } })
      : Response.json({
          result: [{ symbol: "005930", lastPrice: 100, currency: "KRW" }],
        });
  try {
    const rows = await tossRead("/api/v1/prices", { symbols: "005930" });
    assert.equal(calls, 2);
    assert.equal(rows[0].lastPrice, 100);
    await assert.rejects(
      () => tossRead("/api/v1/orders"),
      /허용되지 않은 조회/,
    );
    assert.equal(calls, 2);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TOSS_ACCESS_TOKEN;
    else process.env.TOSS_ACCESS_TOKEN = originalToken;
  }
});
function strategyFixture() {
  let state = 16,
    close = 100;
  const bars = Array.from({ length: 120 }, (_, i) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const open = close;
    close += 0.3 + (state / 2 ** 32 - 0.5) * 4;
    const time = Date.parse("2026-01-01") + i * 86400000;
    return {
      time,
      date: koreanDate(time),
      open,
      high: Math.max(open, close) + 1,
      low: Math.min(open, close) - 1,
      close,
      volume: 20000000 + i * 10000,
    };
  });
  const flows = bars.slice(-5).map((b) => ({
    date: b.date,
    updatedAt: b.date,
    foreigner: 100,
    institution: 200,
    individual: -300,
    credit: null,
    lending: null,
    short: null,
    foreignHolding: null,
    foreignRate: null,
  }));
  return { bars, flows, today: koreanDate(bars.at(-1).time + 86400000) };
}
test("complete strategy still requires confirmed five-session supportive flow", () => {
  const { bars, flows, today } = strategyFixture();
  const ready = evaluateSignal(bars, today, flows);
  assert.equal(ready.score, 100);
  assert.equal(ready.eligible, true);
  assert.equal(
    ready.strategies.find((s) => s.name === "상승 추세 눌림목").matched,
    4,
  );
  const missing = evaluateSignal(bars, today, flows.slice(1));
  assert.equal(missing.score, 100);
  assert.equal(missing.eligible, false);
  assert.equal(missing.flow.status, "자료 부족");
  const selling = evaluateSignal(
    bars,
    today,
    flows.map((f) => ({ ...f, foreigner: -100, institution: -200 })),
  );
  assert.equal(selling.eligible, false);
  assert.equal(selling.flow.status, "동반 순매도");
  assert.match(selling.label, /제외/);
});
test("future and unfinished flow observations never change a completed-day signal", () => {
  const { bars, flows, today } = strategyFixture();
  const expected = evaluateSignal(bars, today, flows);
  assert.deepEqual(
    evaluateSignal(bars, today, [
      ...flows,
      { ...flows[0], date: today, foreigner: -1e12, institution: -1e12 },
    ]),
    expected,
  );
});
test("zero flow remains available and mixed, while null flow withholds the decision", () => {
  const { bars, flows } = strategyFixture();
  const zero = summarizeFlow(
    bars,
    flows.map((f) => ({ ...f, foreigner: 0, institution: 0 })),
  );
  assert.equal(zero.days, 5);
  assert.equal(zero.foreigner, 0);
  assert.equal(zero.status, "엇갈린 수급");
  const missing = summarizeFlow(
    bars,
    flows.map((f, i) => (i ? f : { ...f, foreigner: null })),
  );
  assert.equal(missing.foreigner, null);
  assert.equal(missing.status, "자료 부족");
});
test("breakout resistance and preceding squeeze exclude the current candle", () => {
  const { bars, today } = strategyFixture();
  const original = evaluateSignal(bars, today);
  const changed = bars.map((b, i) =>
    i < bars.length - 1
      ? b
      : {
          ...b,
          close: original.metrics.resistance + 10,
          high: original.metrics.resistance + 11,
        },
  );
  const signal = evaluateSignal(changed, today);
  assert.equal(signal.metrics.resistance, original.metrics.resistance);
  assert.equal(
    signal.metrics.bandwidthPercentile,
    original.metrics.bandwidthPercentile,
  );
  assert.equal(
    signal.strategies.find((s) => s.name === "변동성 수축 후 돌파").checks[0]
      .passed,
    true,
  );
});
test("illiquid stocks cannot qualify even when technical and flow conditions agree", () => {
  const { bars, flows, today } = strategyFixture();
  const lowVolume = evaluateSignal(
    bars.map((b) => ({ ...b, volume: b.volume / 1e6 })),
    today,
    flows,
  );
  assert.equal(lowVolume.score, 100);
  assert.equal(lowVolume.eligible, false);
  assert.ok(lowVolume.risks.some((r) => r.includes("유동성")));
});
test("excessive ATR is an exclusion rather than a small score penalty", () => {
  const { bars, flows, today } = strategyFixture();
  const volatile = evaluateSignal(
    bars.map((b) => ({ ...b, high: b.high + 30, low: b.low - 30 })),
    today,
    flows,
  );
  assert.ok(volatile.metrics.atrPercent > 5);
  assert.equal(volatile.eligible, false);
  assert.ok(volatile.risks.some((r) => r.includes("ATR/종가")));
});
test("flow context keeps dates and does not substitute absent balance observations", () => {
  const { bars, flows } = strategyFixture();
  const context = summarizeFlow(
    bars,
    flows.map((f, i) => ({
      ...f,
      short: 100,
      credit: i === 4 ? 1000 : null,
      lending: i === 4 ? 500 : null,
    })),
  );
  assert.equal(context.shortDate, bars.at(-1).date);
  assert.equal(context.shortPercent, (100 / bars.at(-1).volume) * 100);
  assert.equal(context.creditChange, null);
  assert.equal(context.lendingChange, null);
});
const bar = (close, i, volume = 100) => {
  const time = Date.parse("2026-01-01T00:00:00Z") + i * 86400000;
  return {
    time,
    date: koreanDate(time),
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  };
};
const approx = (a, b, tolerance = 1e-7) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("averages have full warmups and seeded Wilder/EMA values", () => {
  assert.deepEqual(sma([1, 2, 3, 4], 3), [null, null, 2, 3]);
  assert.deepEqual(ema([1, 2, 3, 5], 3), [null, null, 2, 3.5]);
  assert.deepEqual(ema([1, 2, 3, 5], 3, true), [null, null, 2, 3]);
  assert.deepEqual(ema([1, 2, null, 4, 5], 2), [null, 1.5, null, null, 4.5]);
});
test("RSI matches published Wilder worksheet at its first full period", () => {
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89,
    46.03, 45.61, 46.28, 46.28,
  ];
  const rows = calculateIndicators(closes.map(bar), "2026-01-01");
  assert.equal(rows[13].rsi, null);
  approx(rows[14].rsi, 70.46413502109705);
});
test("flat zero-volume data never produces NaN or infinities", () => {
  const rows = calculateIndicators(
    Array.from({ length: 120 }, (_, i) => ({
      ...bar(100, i, 0),
      high: 100,
      low: 100,
    })),
    "2026-01-01",
  );
  for (const r of rows)
    for (const value of Object.values(r))
      if (typeof value === "number") assert.ok(Number.isFinite(value));
  assert.equal(rows.at(-1).rsi, 50);
  assert.equal(rows.at(-1).atr, 0);
  assert.equal(rows.at(-1).adx, 0);
  assert.equal(rows.at(-1).vwap, null);
  assert.equal(rows.at(-1).avwap, null);
  assert.equal(rows.at(-1).percentB, null);
});
test("anchored VWAP uses volume weights, session VWAP resets and rejects partial sessions", () => {
  const candles = [bar(10, 0, 10), bar(20, 1, 30), bar(30, 2, 20)];
  const rows = calculateIndicators(candles, candles[1].date);
  assert.equal(rows[0].avwap, null);
  assert.equal(rows[1].avwap, 20);
  approx(rows[2].avwap, 24);
  const minutes = [
    ["2026-01-02T01:00:00Z", 10],
    ["2026-01-02T01:01:00Z", 20],
    ["2026-01-05T00:00:00Z", 30],
    ["2026-01-05T00:01:00Z", 40],
  ].map(([time, close], i) => ({
    ...bar(close, i),
    time: Date.parse(time),
    date: koreanDate(Date.parse(time)),
  }));
  const m = calculateIndicators(minutes, minutes[0].date, "1m");
  assert.equal(m[0].vwap, null);
  assert.equal(m[1].vwap, null);
  assert.equal(m[2].vwap, 30);
  assert.equal(m[3].vwap, 35);
});
test("Bollinger bands use population variance and profile conserves volume", () => {
  const bars = Array.from({ length: 30 }, (_, i) => bar(i + 10, i));
  const rows = calculateIndicators(bars, bars[0].date);
  approx(rows[19].ma20, 19.5);
  approx(rows[19].bbUpper, 19.5 + 2 * Math.sqrt(33.25));
  approx(
    volumeProfile(bars).reduce((a, b) => a + b.volume, 0),
    3000,
  );
});
test("fractals require two later bars; screener never consumes current-day or future bars", () => {
  const bars = [10, 11, 15, 12, 11].map(bar);
  const before = calculateIndicators(bars.slice(0, 4), bars[0].date);
  assert.equal(before[2].fractalHigh, null);
  assert.equal(calculateIndicators(bars, bars[0].date)[2].fractalHigh, 16);
  const history = Array.from({ length: 90 }, (_, i) =>
    bar(100 + i * 0.4 + Math.sin(i) * 3, i),
  );
  const today = bar(100, 90).date;
  assert.deepEqual(
    evaluateSignal(history, today),
    evaluateSignal([...history, bar(999999, 90, 999999999)], today),
  );
  assert.equal(evaluateSignal(history.slice(0, 20), today).score, null);
  assert.equal(evaluateSignal(history, "2026-10-01").score, null);
});
test("input sanitization preserves genuine zero, drops corrupt candles, deduplicates and sorts", () => {
  assert.equal(numeric(null), null);
  assert.equal(numeric(""), null);
  assert.equal(numeric(false), null);
  assert.equal(numeric("0"), 0);
  const one = bar(10, 0),
    two = bar(11, 1);
  assert.deepEqual(
    cleanCandles([
      two,
      one,
      two,
      { ...one, low: 100 },
      { ...one, volume: NaN },
    ]),
    [one, two],
  );
  assert.deepEqual(
    parseYahoo({
      timestamp: [1],
      indicators: {
        quote: [
          { open: [10], high: [11], low: [9], close: [null], volume: [10] },
        ],
      },
    }),
    [],
  );
  const parsed = parseTossCandles([
    {
      timestamp: "2026-10-08T00:00:00+09:00",
      openPrice: "10",
      highPrice: "12",
      lowPrice: "9",
      closePrice: "11",
      volume: "0",
      currency: "KRW",
    },
  ]);
  assert.equal(parsed[0].date, "2026-10-08");
  assert.equal(parsed[0].volume, 0);
});
test("Toss flow mapping keeps missing preliminary values null and converts fractional holding rate to percent", () => {
  const flows = mergeFlows([
    {
      type: "investor-trading",
      records: [
        {
          date: "2026-10-08",
          individual: null,
          institution: { netBuyVolume: "-20" },
          foreigner: { netBuyVolume: "0" },
          foreignerHolding: { holdingQuantity: "100", holdingRate: "0.5089" },
        },
      ],
    },
    {
      type: "credit-trades",
      records: [
        {
          date: "2026-10-08",
          marginLoan: { balanceQuantity: "10" },
          stockLoan: { balanceQuantity: "999" },
        },
      ],
    },
  ]);
  const r = flows[0];
  assert.equal(r.individual, null);
  assert.equal(r.foreigner, 0);
  assert.equal(r.institution, -20);
  approx(r.foreignRate, 50.89);
  assert.equal(r.credit, 10);
  assert.equal(r.short, null);
  assert.equal(r.lending, null);
});
