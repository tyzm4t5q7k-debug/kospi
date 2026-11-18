const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  defaultSiteScenario: base,
  siteEconomics,
  validateSiteScenario,
  settlementReview,
  sampleSettlements,
  siteAnalysisText,
} = require("../.test-build/construction-economics.js");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("profitable baseline pays all costs without additional funding", () => {
  const r = siteEconomics(base);
  assert.equal(r.profit, 10);
  assert.equal(r.peakFunding, 0);
  assert.equal(r.firstShortfall, null);
  assert.deepEqual(
    r.rows.map((m) => m.cash),
    [4, 5, 5, 8, 12, 15],
  );
});
test("one month late receipts preserve project profit but require 15 of bridge funding", () => {
  const r = siteEconomics({ ...base, receiptDelay: 1 });
  assert.equal(r.profit, 10);
  assert.equal(r.peakFunding, 15);
  assert.equal(r.firstShortfall, 1);
  assert.equal(r.peakMonth, 2);
  assert.equal(r.unpaidAtCompletion, 10);
  assert.equal(r.rows[6].receipt, 10);
  assert.equal(r.finalCash, 15);
  assert.notEqual(
    r.peakFunding,
    r.rows.reduce((sum, m) => sum + m.shortfall, 0),
  );
});
test("price change applies once to exposed materials rather than entire project cost", () => {
  const r = siteEconomics({ ...base, materialChange: 10 });
  assert.equal(r.costChange, 3);
  assert.equal(r.totalCost, 93);
  assert.equal(r.profit, 7);
  assert.equal(r.rows[0].additionalPayment, 0);
  assert.equal(r.rows[2].additionalPayment, 1.05);
  near(
    r.rows.reduce((sum, m) => sum + m.additionalPayment, 0),
    3,
  );
  const combined = siteEconomics({
    ...base,
    materialChange: 10,
    receiptDelay: 1,
  });
  assert.equal(combined.peakFunding, 16.05);
  assert.equal(combined.profit, 7);
});
test("all delay and price combinations reconcile full receipts, costs and terminal cash", () => {
  for (const receiptDelay of [0, 1, 2, 3])
    for (const materialChange of [-100, -10, 0, 10, 100]) {
      const s = { ...base, receiptDelay, materialChange };
      const r = siteEconomics(s);
      near(
        r.rows.reduce((sum, m) => sum + m.receipt, 0),
        s.contract,
      );
      near(
        r.rows.reduce((sum, m) => sum + m.payment, 0),
        r.totalCost,
      );
      near(r.finalCash, s.openingCash + r.profit);
      for (const m of r.rows) {
        near(m.cash, m.opening + m.receipt - m.payment);
        assert.ok(m.payment >= 0);
      }
      assert.equal(r.rows.length, 6 + receiptDelay);
    }
});
test("opening cash affects liquidity but not profit, including zero and excess funds", () => {
  const zero = siteEconomics({ ...base, openingCash: 0 });
  assert.equal(zero.peakFunding, 1);
  assert.equal(zero.profit, 10);
  const funded = siteEconomics({ ...base, openingCash: 50, receiptDelay: 3 });
  assert.equal(funded.peakFunding, 7);
  assert.equal(funded.firstShortfall, 3);
  assert.equal(funded.peakMonth, 4);
  assert.equal(funded.profit, 10);
});
test("loss-making project remains negative after final collection and can have zero costs", () => {
  const r = siteEconomics({ ...base, contract: 70, receiptDelay: 2 });
  assert.equal(r.profit, -20);
  assert.equal(r.finalCash, -15);
  const zero = siteEconomics({
    ...base,
    budget: 0,
    exposedMaterials: 0,
    openingCash: 0,
  });
  assert.equal(zero.totalCost, 0);
  assert.equal(zero.profit, 100);
  assert.equal(zero.peakFunding, 0);
});
test("invalid, nonfinite, overallocated material and fractional delay inputs cannot produce results", () => {
  for (const change of [
    { contract: 0 },
    { budget: -1 },
    { exposedMaterials: 60 },
    { materialChange: -101 },
    { receiptDelay: 0.5 },
    { receiptDelay: 4 },
    { openingCash: -1 },
    { contract: NaN },
    { budget: Infinity },
  ]) {
    const s = { ...base, ...change };
    assert.ok(validateSiteScenario(s).length);
    assert.throws(() => siteEconomics(s), RangeError);
  }
});
test("settlement work packages sum to M3 payment and checks never change cashflow", () => {
  const r = siteEconomics({ ...base, materialChange: 10 });
  const before = JSON.stringify(r);
  const review = settlementReview(sampleSettlements, r.rows[2].payment);
  near(
    review.rows.reduce((sum, row) => sum + row.amount, 0),
    21.05,
  );
  assert.equal(review.unresolvedCount, 3);
  assert.equal(review.urgentCount, 2);
  near(review.reviewAmount, 16.84);
  const complete = sampleSettlements.map((item) => ({
    ...item,
    workConfirmed: true,
    invoiceReceived: true,
    amountsReconciled: true,
  }));
  assert.equal(settlementReview(complete, r.rows[2].payment).reviewAmount, 0);
  assert.equal(JSON.stringify(r), before);
});
test("download contains current assumptions, late receipts, checklist and model caveats", () => {
  const text = siteAnalysisText(
    { ...base, materialChange: 10, receiptDelay: 1 },
    sampleSettlements,
  );
  assert.ok(
    text.includes("예상 공사손익 7 / 추가 원가 3 / 최대 추가 필요자금 16.05"),
  );
  assert.ok(text.includes("7,0,10,0,0,0,12"));
  assert.ok(text.includes("협력사 A"));
  assert.ok(text.includes("실제 GS건설 현장 자료 아님"));
  assert.ok(text.includes("월중 자금 최저점 제외"));
});
