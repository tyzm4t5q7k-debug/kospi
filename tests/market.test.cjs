const { test } = require('node:test');
const assert = require('node:assert/strict');

test('market loading deduplicates requests, preserves units, rejects partial baskets and reuses cache', async () => {
  const original = global.fetch;
  const originalNow = Date.now;
  const requests = new Map();
  global.fetch = async (url) => {
    const symbol = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
    requests.set(symbol, (requests.get(symbol) || 0) + 1);
    if (symbol === '005930.KS') return { ok: false };
    const prices = symbol === '^TNX' ? [4, 4.1, 4.05] : symbol === 'KRW=X' ? [1300, 1320, 1310] : [100, 110, 105];
    return { ok: true, json: async () => ({ chart: { result: [{
      meta: { exchangeTimezoneName: 'Asia/Seoul' },
      timestamp: ['2025-01-02', '2025-01-03', '2025-01-06'].map((day) => Date.parse(day + 'T06:00:00Z') / 1000),
      indicators: { quote: [{ close: prices }], adjclose: [{ adjclose: prices }] }
    }], error: null } }) };
  };
  try {
    const { getMarketData } = require('../.test-build/market.js');
    const [data, concurrent] = await Promise.all([getMarketData(), getMarketData()]);
    assert.equal(data, concurrent);
    assert.equal(data.dataDate, '2025-01-06');
    assert.deepEqual(data.failedSymbols, ['005930.KS']);
    assert.deepEqual(data.sectors.semiconductor.data, []);
    assert.equal(data.macroIndicators.us10y.data[0].value, 4);
    assert.equal(data.macroIndicators.usdkrw.data[0].value, 1300);
    assert.equal(data.macroIndicators.us10y.unit, '%');
    assert.ok([...requests.values()].every((count) => count === 1));
    const count = requests.size;
    await getMarketData();
    assert.equal(requests.size, count);
    assert.ok([...requests.values()].every((calls) => calls === 1));
    global.fetch = async () => ({ ok: false });
    const baseNow = originalNow();
    Date.now = () => baseNow + 6 * 60 * 1000;
    const stale = await getMarketData();
    assert.equal(stale.stale, true);
    assert.equal(stale.updatedAt, data.updatedAt);
    Date.now = () => baseNow + 25 * 60 * 60 * 1000;
    await assert.rejects(getMarketData(), /공통 거래일/);
  } finally { global.fetch = original; Date.now = originalNow; }
});
