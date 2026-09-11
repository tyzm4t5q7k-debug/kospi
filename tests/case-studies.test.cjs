const test = require('node:test');
const assert = require('node:assert/strict');
const { annualCloses, currencyCloses } = require('../.test-build/case-data.js');
const { annualReturns, annualStats, currencyAttribution, quarterlyCurrency, currencyResult, companyStress, exporterResult, importerResult } = require('../.test-build/case-studies.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('fixed annual study uses prior-year levels and preserves all 10 returns', () => {
  assert.equal(annualCloses.length, 11); assert.equal(annualReturns.length, 10);
  assert.deepEqual(annualReturns.map(r => r.year), Array.from({ length: 10 }, (_, i) => 2015 + i));
  near(annualReturns.at(-1).kospi, (2399.49 / 2655.28 - 1) * 100);
  near(annualReturns.at(-1).nasdaq, (19310.79 / 15011.35 - 1) * 100);
  assert.equal(annualStats.sameDirection, 9);
  assert.equal(annualStats.leaveOneOut.length, 10);
  assert.ok(annualStats.leaveOneOut.every(r => Number.isFinite(r.correlation)));
});

test('currency attribution reconciles to a cash investment and reverses under FX losses', () => {
  const r = currencyAttribution({ nasdaq: 100, fx: 1000 }, { nasdaq: 110, fx: 900 });
  near(r.total, -1); near(r.price + r.fx + r.interaction, r.total);
  near(1000000 / 1000 / 100 * 110 * 900, 1000000 * (1 + r.total / 100));
  assert.throws(() => currencyAttribution({ nasdaq: 0, fx: 1000 }, { nasdaq: 110, fx: 900 }));
});

test('monthly frozen data and quarterly linking reproduce annual FX-adjusted return', () => {
  assert.equal(currencyCloses.length, 13);
  assert.equal(new Set(currencyCloses.map(r => r.month.slice(0, 7))).size, 13);
  assert.equal(currencyCloses[3].month, '2024-03-28'); // Last common date before Good Friday.
  near((quarterlyCurrency.reduce((total, r) => total * (1 + r.total / 100), 1) - 1) * 100, currencyResult.total);
  assert.ok(quarterlyCurrency[2].price > 0 && quarterlyCurrency[2].total < 0);
});

test('company stress keeps receivables and interest expense signs distinct', () => {
  near(exporterResult.extraInterest, 6000000);
  near(exporterResult.combinedImpact, 4000000);
  near(importerResult.combinedImpact, -16000000);
  assert.deepEqual(companyStress.map(r => r.results), [[-10000000, -13000000, -16000000], [0, -3000000, -6000000], [10000000, 7000000, 4000000]]);
});
