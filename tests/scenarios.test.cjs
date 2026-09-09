const { test } = require('node:test');
const assert = require('node:assert/strict');
const { allocationScenario, cashflowScenario } = require('../.test-build/scenarios.js');
const { parseNotebook, notebookJson, chartAnnotations, validSource } = require('../.test-build/research.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const allocation = { capital: 10000000, koreaWeight: 40, usWeight: 40, koreaReturn: 5, usReturn: 10, fxChange: -5, cashReturn: 2 };
const cash = { debt: 1e9, floatingShare: 100, rate: 4, rateChange: 1, months: 12, usdReceipts: 100000, usdPayments: 0, fx: 1300, nextFx: 1400 };
test('allocation includes compounding and contribution totals reconcile', () => {
  const a = allocationScenario(allocation);
  near(a.usKrwReturn, 4.5); near(a.totalReturn, 4.2); near(a.profit, 420000);
  near(a.contributions.reduce((s, p) => s + p.value, 0), a.totalReturn);
  assert.equal(allocationScenario({ ...allocation, koreaWeight: 90 }), null);
  assert.equal(allocationScenario({ ...allocation, capital: NaN }), null);
  near(allocationScenario({ ...allocation, koreaWeight: 0, usWeight: 100, usReturn: -100 }).endingValue, 0);
});
test('cashflow handles variable-rate share, duration and net payer sign', () => {
  const c = cashflowScenario(cash);
  near(c.extraInterest, 10000000); near(c.fxImpact, 10000000); near(c.combinedImpact, 0);
  near(cashflowScenario({ ...cash, floatingShare: 50, months: 6 }).extraInterest, 2500000);
  near(cashflowScenario({ ...cash, usdReceipts: 0, usdPayments: 100000 }).fxImpact, -10000000);
  near(cashflowScenario({ ...cash, floatingShare: 0 }).extraInterest, 0);
  assert.equal(cashflowScenario({ ...cash, rateChange: -5 }), null);
  assert.equal(cashflowScenario({ ...cash, fx: 0 }), null);
});
const note = { id: 'sample-note', date: '2026-09-05', title: '검증용 이슈', source: 'https://example.org/news', fact: '관측 사실', interpretation: '나의 해석', followUp: '추가 확인', perspective: 'research', updatedAt: '2026-09-09T00:00:00Z' };
test('notebook round-trip preserves Korean text and rejects unsafe/corrupt imports', () => {
  assert.deepEqual(parseNotebook(notebookJson([note])), [note]);
  assert.equal(validSource('javascript:alert(1)'), false);
  assert.equal(validSource('https://user:pass@example.com'), false);
  assert.throws(() => parseNotebook(notebookJson([{ ...note, source: 'javascript:alert(1)' }])));
  assert.throws(() => parseNotebook(notebookJson([{ ...note, date: '2026-02-30' }])));
  assert.throws(() => parseNotebook(notebookJson([note, note])));
  assert.throws(() => parseNotebook('{"version":2,"notes":[]}'));
});
test('event annotations use next common observation and exclude out-of-range events', () => {
  const rows = [{ month: '2026-09-04' }, { month: '2026-09-07' }, { month: '2026-09-08' }];
  assert.equal(chartAnnotations([note], rows)[0].chartDate, '2026-09-07');
  assert.equal(chartAnnotations([{ ...note, date: '2026-09-09' }], rows).length, 0);
  assert.equal(chartAnnotations([{ ...note, date: '2026-08-01' }], rows).length, 0);
});
