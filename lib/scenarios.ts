export type ScenarioSnapshot = { title: string; assumptions: string[]; results: { label: string; value: string }[]; note: string };
export type AllocationInput = { capital: number; koreaWeight: number; usWeight: number; koreaReturn: number; usReturn: number; fxChange: number; cashReturn: number };
export type CashflowInput = { debt: number; floatingShare: number; rate: number; rateChange: number; months: number; usdReceipts: number; usdPayments: number; fx: number; nextFx: number };
const finite = (values: number[]) => values.every(Number.isFinite);

export function allocationScenario(input: AllocationInput) {
  const { capital, koreaWeight, usWeight, koreaReturn, usReturn, fxChange, cashReturn } = input;
  if (!finite(Object.values(input)) || capital < 0 || capital > 1e15 || koreaWeight < 0 || usWeight < 0 || koreaWeight + usWeight > 100 || [koreaReturn, usReturn, cashReturn].some((r) => r < -100 || r > 1000) || fxChange <= -100 || fxChange > 1000) return null;
  const cashWeight = 100 - koreaWeight - usWeight;
  const usKrwReturn = ((1 + usReturn / 100) * (1 + fxChange / 100) - 1) * 100;
  const priceContribution = usWeight / 100 * usReturn;
  const fxContribution = usWeight / 100 * fxChange;
  const interaction = usWeight / 100 * usReturn * fxChange / 100;
  const contributions = [
    { name: "국내자산", value: koreaWeight / 100 * koreaReturn },
    { name: "해외자산 가격", value: priceContribution },
    { name: "환율", value: fxContribution },
    { name: "가격·환율 교차효과", value: interaction },
    { name: "현금성 자산", value: cashWeight / 100 * cashReturn }
  ];
  const totalReturn = contributions.reduce((sum, item) => sum + item.value, 0);
  return { cashWeight, usKrwReturn, contributions, totalReturn, profit: capital * totalReturn / 100, endingValue: capital * (1 + totalReturn / 100) };
}

export function cashflowScenario(input: CashflowInput) {
  const { debt, floatingShare, rate, rateChange, months, usdReceipts, usdPayments, fx, nextFx } = input;
  if (!finite(Object.values(input)) || debt < 0 || debt > 1e15 || floatingShare < 0 || floatingShare > 100 || rate < 0 || rate > 100 || rate + rateChange < 0 || rate + rateChange > 100 || months <= 0 || months > 120 || usdReceipts < 0 || usdReceipts > 1e12 || usdPayments < 0 || usdPayments > 1e12 || fx <= 0 || nextFx <= 0 || fx > 1e6 || nextFx > 1e6) return null;
  const beforeInterest = debt * rate / 100 * months / 12;
  const extraInterest = debt * floatingShare / 100 * rateChange / 100 * months / 12;
  const netUsd = usdReceipts - usdPayments;
  const fxImpact = netUsd * (nextFx - fx);
  return { beforeInterest, afterInterest: beforeInterest + extraInterest, extraInterest, netUsd, fxImpact, combinedImpact: fxImpact - extraInterest };
}

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
export const signedWon = (n: number) => `${n > 0 ? "+" : ""}${won(n)}`;
export const percent = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
