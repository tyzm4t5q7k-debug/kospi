const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  sma,
  ema,
  calculateIndicators,
  evaluateSignal,
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
} = require("../.test-build/stock-data.js");
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
