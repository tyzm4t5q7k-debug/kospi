const test = require('node:test');
const assert = require('node:assert/strict');
const { experimentRange } = require('../.test-build/experiment-demo.js');
test('public demo agrees with exhaustive integer feasibility including strict profit boundary', () => {
  for (const cost of [0, 100000, 199999, 200000, 500000, 1000000]) {
    const actual = experimentRange(cost);
    const allowed = Array.from({ length: 2000 }, (_, i) => i + 1).filter(n => n * 200 - cost > 0 && -300 * n - cost >= -500000);
    assert.equal(actual.feasible, allowed.length > 0);
    if (allowed.length) { assert.equal(actual.lower, allowed[0]); assert.equal(actual.upper, allowed.at(-1)); }
  }
  assert.equal(experimentRange(100000).lower, 501);
  assert.equal(experimentRange(100000).upper, 1333);
  for (const bad of [NaN, Infinity, -1, .5, 1000001]) assert.equal(experimentRange(bad), null);
});
