const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  gaEconomics,
  compareGaScenarios,
  insurerEconomics,
} = require("../.test-build/insurance-economics.js");
const base = {
  contracts: 100,
  retention: 85,
  upfront: 600000,
  maintenance: 120000,
  payout: 420000,
  servicing: 30000,
  clawback: 300000,
  campaign: 0,
};
const proposed = { ...base, contracts: 120, retention: 80, campaign: 3000000 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("20% more sales can reduce contribution after retention loss and promotion costs", () => {
  const r = compareGaScenarios(base, proposed);
  near(r.before.contribution, 20700000);
  near(r.after.contribution, 19320000);
  near(r.incremental, -1380000);
  near(r.incrementalRoi, -46);
  assert.equal(r.breakEvenContracts, 128);
  assert.ok(
    gaEconomics({ ...proposed, contracts: r.breakEvenContracts })
      .contribution >= r.before.contribution,
  );
  assert.ok(
    gaEconomics({ ...proposed, contracts: r.breakEvenContracts - 1 })
      .contribution < r.before.contribution,
  );
  near(
    gaEconomics({ ...proposed, retention: r.breakEvenRetention }).contribution,
    r.before.contribution,
  );
});
test("cashflow bridge reconciles and retained-contract commission never applies to lapses", () => {
  for (const retention of [0, 50, 100]) {
    const r = gaEconomics({ ...proposed, retention });
    near(
      r.contribution,
      r.newCommission +
        r.maintenanceCommission -
        r.expectedClawback -
        r.distributionCost -
        r.servicingCost -
        r.campaign,
    );
  }
  assert.equal(gaEconomics({ ...base, retention: 0 }).maintenanceCommission, 0);
  assert.equal(gaEconomics({ ...base, retention: 100 }).expectedClawback, 0);
});
test("zero sales, zero campaign budget and impossible break-even never produce Infinity", () => {
  const r = compareGaScenarios(base, {
    ...proposed,
    contracts: 0,
    campaign: 0,
  });
  assert.equal(r.after.contribution, 0);
  assert.equal(r.incrementalRoi, null);
  assert.equal(r.breakEvenRetention, null);
  const loss = compareGaScenarios(base, { ...proposed, payout: 1000000 });
  assert.equal(loss.breakEvenContracts, null);
  assert.equal(loss.breakEvenRetention, null);
  assert.equal(
    compareGaScenarios(
      { ...base, contracts: 0 },
      { ...proposed, contracts: 0, campaign: 0 },
    ).breakEvenRetention,
    0,
  );
});
test("malformed assumptions are bounded and non-finite values cannot escape the model", () => {
  const r = gaEconomics({
    ...base,
    contracts: -1,
    retention: Infinity,
    campaign: NaN,
  });
  assert.equal(r.contribution, 0);
  near(
    gaEconomics({ ...base, retention: 150 }).contribution,
    gaEconomics({ ...base, retention: 100 }).contribution,
  );
  assert.equal(gaEconomics({ ...base, contracts: 3.9 }).contracts, 3);
});
test("insurer model permits losses, negative financial results and ratios over 100%", () => {
  const r = insurerEconomics({
    revenue: 100000000,
    claimsRatio: 110,
    expenseRatio: 25,
    netFinancial: -1000000,
  });
  near(r.serviceResult, -35000000);
  near(r.result, -36000000);
  assert.equal(r.combinedRatio, 135);
  assert.equal(
    insurerEconomics({
      revenue: 0,
      claimsRatio: 0,
      expenseRatio: 0,
      netFinancial: 0,
    }).combinedRatio,
    null,
  );
});
