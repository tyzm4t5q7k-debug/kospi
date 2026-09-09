const { test } = require('node:test');
const assert = require('node:assert/strict');
const a = require('../.test-build/analytics.js');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('currency conversion compounds the asset and FX returns on matching dates', () => {
  const rows = [{ month: '2025-01-02', kospi: 100, nasdaq: 100 }, { month: '2025-01-03', kospi: 103, nasdaq: 110 }];
  const fx = [{ month: '2025-01-02', value: 1300 }, { month: '2025-01-03', value: 1430 }];
  near(a.calculateReturn(a.rebaseRows(a.convertToKrw(rows, fx, 'nasdaq'), ['kospi', 'nasdaq']), 'nasdaq'), 21);
  assert.equal(a.convertToKrw(rows, fx.slice(1), 'nasdaq').length, 1);
  assert.equal(a.calculateReturn(a.convertToKrw(rows, fx.slice(1), 'nasdaq'), 'nasdaq'), null);
});

test('correlation uses matching interval returns and responds to selected period', () => {
  const rows = [
    { month: '2025-01-02', x: 100, y: 100 },
    { month: '2025-01-03', x: 110, y: 120 },
    { month: '2025-01-10', x: 99, y: 96 },
    { month: '2025-02-06', x: 118.8, y: 48 },
    { month: '2025-02-07', x: 106.92, y: 72 }
  ];
  near(a.returnCorrelation(rows.slice(0, 3), 'x', 'y'), 1);
  const selected = a.filterByPeriod(rows, '1M');
  near(a.returnCorrelation(selected, 'x', 'y'), -1);
  assert.notEqual(a.returnCorrelation(rows, 'x', 'y'), a.returnCorrelation(selected, 'x', 'y'));
  assert.equal(a.returnCorrelation(rows.slice(0, 2), 'x', 'y'), null);
});

test('no fabricated zeros for missing observations, constant returns or short windows', () => {
  assert.equal(a.pearson([1, 1, 1], [2, 3, 4]), null);
  assert.equal(a.calculateReturn([{ month: 'a', x: 100 }, { month: 'b', x: null }], 'x'), null);
  assert.deepEqual(a.rebaseRows([{ month: 'a', x: null, y: 10 }], ['x', 'y']), []);
  assert.deepEqual(a.rollingCorrelation([], 'x', 'y'), []);
});

test('drawdown tracks the running peak, not the start price or final return', () => {
  const rows = [100, 120, 90, 108, 130].map((x, i) => ({ month: String(i), x }));
  near(a.maxDrawdown(rows, 'x'), -25);
  near(a.calculateReturn(rows, 'x'), 30);
  assert.equal(a.maxDrawdown(rows.slice(0, 1), 'x'), null);
});

test('basket retains fixed constituents and rebases them at a shared start date', () => {
  const first = [{ month: 'a', value: 50 }, { month: 'b', value: 100 }, { month: 'c', value: 110 }];
  const second = [{ month: 'b', value: 200 }, { month: 'c', value: 160 }];
  const basket = a.equalWeightBasket([first, second]);
  assert.deepEqual(basket.map((p) => p.month), ['b', 'c']);
  near(basket[0].value, 100);
  near(basket[1].value, 95);
  assert.deepEqual(a.equalWeightBasket([first, []]), []);
});

test('rolling correlation requires exactly window plus one prices and remains bounded', () => {
  const rows = [{ month: '00', x: 100, y: 100 }];
  for (let i = 1; i <= 22; i++) {
    const r = i % 2 ? .01 : -.02;
    rows.push({ month: String(i).padStart(2, '0'), x: rows[i - 1].x * (1 + r), y: rows[i - 1].y * (1 + r * 2) });
  }
  assert.equal(a.rollingCorrelation(rows.slice(0, 20), 'x', 'y', 20).length, 0);
  const rolling = a.rollingCorrelation(rows, 'x', 'y', 20);
  assert.equal(rolling.length, 3);
  rolling.forEach((point) => near(point.correlation, 1));
});

test('shared anchor avoids silently showing an old series as the latest month', () => {
  const old = [{ month: '2025-01-01', value: 100 }, { month: '2025-01-03', value: 110 }];
  assert.deepEqual(a.filterByPeriod(old, '1M', '2025-05-01'), []);
  assert.equal(a.filterByPeriod(old, 'ALL', '2025-01-01').length, 1);
});
