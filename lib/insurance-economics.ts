/** Educational cohort model. Values are assumptions, not insurer/GA commission schedules. */
export type GaScenario = {
  contracts: number;
  retention: number;
  upfront: number;
  maintenance: number;
  payout: number;
  servicing: number;
  clawback: number;
  campaign: number;
};

const nonnegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
const percent = (value: number) => Math.min(100, nonnegative(value));

export function gaEconomics(input: GaScenario) {
  const contracts = Math.floor(nonnegative(input.contracts));
  const retained = percent(input.retention) / 100;
  const upfront = nonnegative(input.upfront);
  const maintenance = nonnegative(input.maintenance);
  const payout = nonnegative(input.payout);
  const servicing = nonnegative(input.servicing);
  const clawback = nonnegative(input.clawback);
  const campaign = nonnegative(input.campaign);
  const newCommission = contracts * upfront;
  const maintenanceCommission = contracts * retained * maintenance;
  const expectedClawback = contracts * (1 - retained) * clawback;
  const distributionCost = contracts * payout;
  const servicingCost = contracts * servicing;
  const unitContribution =
    upfront +
    retained * maintenance -
    (1 - retained) * clawback -
    payout -
    servicing;
  return {
    contracts,
    retainedContracts: contracts * retained,
    newCommission,
    maintenanceCommission,
    expectedClawback,
    distributionCost,
    servicingCost,
    campaign,
    unitContribution,
    contribution: (contracts * unitContribution - campaign) || 0,
  };
}

export function compareGaScenarios(base: GaScenario, proposed: GaScenario) {
  const before = gaEconomics(base);
  const after = gaEconomics(proposed);
  const incremental = after.contribution - before.contribution;
  const additionalBudget = after.campaign - before.campaign;
  const target = before.contribution + after.campaign;
  // Contracts needed to match the baseline after the proposed campaign cost.
  const breakEvenContracts =
    target <= 0
      ? 0
      : after.unitContribution > 0
        ? Math.ceil(target / after.unitContribution)
        : null;
  const retentionSlope =
    after.contracts *
    (nonnegative(proposed.maintenance) + nonnegative(proposed.clawback));
  const zeroRetentionContribution = gaEconomics({
    ...proposed,
    retention: 0,
  }).contribution;
  const neededRetention =
    retentionSlope > 0
      ? Math.max(
          0,
          ((before.contribution - zeroRetentionContribution) / retentionSlope) *
            100,
        )
      : null;
  const breakEvenRetention =
    zeroRetentionContribution >= before.contribution
      ? 0
      : neededRetention !== null && neededRetention <= 100
        ? neededRetention
        : null;
  return {
    before,
    after,
    incremental,
    incrementalRoi:
      additionalBudget > 0 ? (incremental / additionalBudget) * 100 : null,
    breakEvenContracts,
    breakEvenRetention,
  };
}

/** Simplified recognised revenue/expense sensitivity for a short-duration non-life book. */
export function insurerEconomics(input: {
  revenue: number;
  claimsRatio: number;
  expenseRatio: number;
  netFinancial: number;
}) {
  const revenue = nonnegative(input.revenue);
  // Ratios can exceed 100%; loss-making insurance must remain representable.
  const claimsRatio = nonnegative(input.claimsRatio);
  const expenseRatio = nonnegative(input.expenseRatio);
  const claims = (revenue * claimsRatio) / 100;
  const expenses = (revenue * expenseRatio) / 100;
  const serviceResult = revenue - claims - expenses;
  const netFinancial = Number.isFinite(input.netFinancial)
    ? input.netFinancial
    : 0;
  return {
    revenue,
    claims,
    expenses,
    serviceResult,
    netFinancial,
    result: serviceResult + netFinancial,
    combinedRatio: revenue > 0 ? claimsRatio + expenseRatio : null,
  };
}
