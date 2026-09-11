import { pearson } from "./analytics";
import { allocationScenario, cashflowScenario } from "./scenarios";
import { annualCloses, currencyCloses, caseSources, reviewedOn } from "./case-data";

export const signed = (value: number, digits = 2) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
export const pct = (value: number) => `${signed(value)}%`;
export const pp = (value: number) => `${signed(value)}%p`;
export const money = (value: number) => `${signed(value / 10000, 0)}만원`;
export const annualReturns = annualCloses.slice(1).map((row, i) => ({
  year: row.year,
  kospi: (row.kospi / annualCloses[i].kospi - 1) * 100,
  nasdaq: (row.nasdaq / annualCloses[i].nasdaq - 1) * 100
}));
const correlation = (rows: typeof annualReturns) => pearson(rows.map(r => r.kospi), rows.map(r => r.nasdaq))!;
export const annualStats = {
  correlation: correlation(annualReturns), firstHalf: correlation(annualReturns.slice(0, 5)), secondHalf: correlation(annualReturns.slice(5)),
  leaveOneOut: annualReturns.map((row, i) => ({ omitted: row.year, correlation: correlation(annualReturns.filter((_, j) => j !== i)) })),
  sameDirection: annualReturns.filter(r => r.kospi * r.nasdaq > 0).length,
  latest: annualReturns.at(-1)!
};

export function currencyAttribution(start: { nasdaq: number; fx: number }, end: { nasdaq: number; fx: number }) {
  if (![start.nasdaq, start.fx, end.nasdaq, end.fx].every(v => Number.isFinite(v) && v > 0)) throw new Error("유효한 지수와 환율이 필요합니다.");
  const price = (end.nasdaq / start.nasdaq - 1) * 100;
  const fx = (end.fx / start.fx - 1) * 100;
  const interaction = price * fx / 100;
  const total = ((end.nasdaq * end.fx) / (start.nasdaq * start.fx) - 1) * 100;
  return { price, fx, interaction, total, currencyEffect: total - price };
}
export const currencyResult = currencyAttribution(currencyCloses[0], currencyCloses.at(-1)!);
export const quarterlyCurrency = [3, 6, 9, 12].map((end, i) => ({
  quarter: `${i + 1}분기`, start: currencyCloses[end - 3].month, end: currencyCloses[end].month,
  ...currencyAttribution(currencyCloses[end - 3], currencyCloses[end])
}));
export const currencyChart = currencyCloses.map(row => ({
  month: row.month,
  usd: row.nasdaq / currencyCloses[0].nasdaq * 100,
  krw: row.nasdaq * row.fx / (currencyCloses[0].nasdaq * currencyCloses[0].fx) * 100
}));
// Hypothetical allocation overlays historical returns; this is not an actual account.
export const allocationOverlay = allocationScenario({ capital: 10000000, koreaWeight: 0, usWeight: 40, koreaReturn: 0,
  usReturn: currencyResult.price, fxChange: currencyResult.fx, cashReturn: 0 })!;
export const companyInput = { debt: 1000000000, floatingShare: 60, rate: 4, rateChange: 1,
  months: 12, usdReceipts: 200000, usdPayments: 100000, fx: 1300, nextFx: 1400 };
export const exporterResult = cashflowScenario(companyInput)!;
export const importerResult = cashflowScenario({ ...companyInput, usdReceipts: 100000, usdPayments: 200000 })!;
export const companyStress = [-100, 0, 100].map(change => ({ fxChange: change,
  results: [0, .5, 1].map(rateChange => cashflowScenario({ ...companyInput, nextFx: companyInput.fx + change, rateChange })!.combinedImpact)
}));

export type CaseStudy = {
  id: string; number: string; label: string; title: string; question: string; period: string;
  metrics: { label: string; value: string; detail: string }[];
  finding: string; method: string; interpretation: string; alternative: string; implication: string;
  limitations: string[]; nextCheck: string; sourceIds: string[];
  table: { caption: string; headers: string[]; rows: string[][] };
};
export const caseStudies: CaseStudy[] = [
  {
    id: "case-market", number: "01", label: "시장 분석 · 증권 리서치", title: "동조화가 높아도 수익률은 달라질 수 있다",
    question: "한국과 미국 시장의 연간 수익률은 함께 움직였는가? 그 관계가 특정 연도의 성과까지 설명하는가?",
    period: "고정 표본 2015~2024 · 연간 수익률 10개 · 각 시장 통화 기준",
    metrics: [
      { label: "연간 수익률 상관계수", value: annualStats.correlation.toFixed(3), detail: "2015~2024 · n=10" },
      { label: "상승·하락 방향 일치", value: `${annualStats.sameDirection} / 10년`, detail: "수익률 부호 기준" },
      { label: "2024년 NASDAQ - KOSPI", value: pp(annualStats.latest.nasdaq - annualStats.latest.kospi), detail: "달러 지수와 원화 지수의 성과 차이" }
    ],
    finding: `2015~2024년 연간 수익률의 상관계수는 ${annualStats.correlation.toFixed(3)}이며, 10개 연도 중 ${annualStats.sameDirection}개 연도에서 상승·하락 방향이 같았다. 그러나 2024년 KOSPI는 ${pct(annualStats.latest.kospi)}, NASDAQ은 ${pct(annualStats.latest.nasdaq)}로 방향이 달랐다.`,
    method: "2014~2024년 각 시장의 연말 종가 11개로 전년 말 대비 단순 수익률 10개를 계산했다. 두 수익률에 Pearson 상관계수를 적용하고, 표본을 전·후반 5개씩 나누고 한 해씩 제외해 민감도를 확인했다. 연말 종가의 실제 거래일은 시장마다 다를 수 있다.",
    interpretation: "여러 해의 수익률이 함께 움직이는 정도와 개별 연도의 성과 격차는 다른 질문이다. 전체 상관계수가 양수라는 이유로 한국 시장이 미국 시장의 상승률을 따라갈 것이라고 설명할 수 없다. 두 지수는 구성 종목과 업종 비중, 표시 통화가 다르다.",
    alternative: `전반 5년의 상관계수는 ${annualStats.firstHalf.toFixed(3)}, 후반 5년은 ${annualStats.secondHalf.toFixed(3)}이다. 한 해를 제외하면 ${Math.min(...annualStats.leaveOneOut.map(r => r.correlation)).toFixed(3)}~${Math.max(...annualStats.leaveOneOut.map(r => r.correlation)).toFixed(3)}로 달라진다. 이는 표본 민감도이며, 상관관계가 구조적으로 변했다는 통계적 검정 결과는 아니다.`,
    implication: "시장 설명에서는 장기 동행 정도와 최근 성과 격차를 나눠 제시한다. 자산배분에서는 국가명만으로 분산 효과를 판단하지 않고 업종 중복, 투자 통화와 실제 편입 상품을 추가로 확인한다.",
    limitations: ["관측치가 10개뿐인 연간 탐색 분석이다. 일별 동조화, 위기 시 동반 하락, 선행성이나 인과관계를 추정하지 않는다.", "KOSPI와 NASDAQ은 각각 원화·달러 가격지수다. 동일 통화의 투자성과나 배당 재투자 수익률 비교가 아니다.", "연말 종가는 2차 편집 자료를 사용했다. KRX 원자료와 전 기간 대조 및 표본 외 검증은 수행하지 않았다."],
    nextCheck: "동일 통화·일별 자료로 같은 분석을 반복하고, 한국 시장 이전에 관측 가능한 미국 종가로 시차를 맞춘 결과와 비교한다.",
    sourceIds: ["kospi", "nasdaq-annual"],
    table: { caption: "고정 표본 전체 공개 · 전년 말 대비 가격지수 수익률", headers: ["연도", "KOSPI · KRW", "NASDAQ · USD", "방향"], rows: annualReturns.map(r => [String(r.year), pct(r.kospi), pct(r.nasdaq), r.kospi * r.nasdaq > 0 ? "일치" : "불일치"]) }
  },
  {
    id: "case-currency", number: "02", label: "개인 자산관리 · 자산운용", title: "해외자산 수익을 가격과 환율로 나누다",
    question: "2024년 NASDAQ의 상승을 원화 투자자 관점으로 바꾸면 수익률은 어떻게 달라지는가?",
    period: "2023-12-29~2024-12-31 · FRED 월별 마지막 공통 관측일 13개",
    metrics: [
      { label: "NASDAQ · 달러 수익률", value: pct(currencyResult.price), detail: "배당 재투자 제외" },
      { label: "NASDAQ · 원화 환산", value: pct(currencyResult.total), detail: "환헤지·거래 비용·세금 제외" },
      { label: "환율 반영에 따른 차이", value: pp(currencyResult.currencyEffect), detail: "환율 자체 효과 + 교차효과" }
    ],
    finding: `NASDAQ은 ${currencyCloses[0].nasdaq.toLocaleString("en-US")}에서 ${currencyCloses.at(-1)!.nasdaq.toLocaleString("en-US")}로, 원/달러 환율은 ${currencyCloses[0].fx.toLocaleString("en-US")}원에서 ${currencyCloses.at(-1)!.fx.toLocaleString("en-US")}원으로 변했다. 달러 기준 ${pct(currencyResult.price)}가 원화 환산 시 ${pct(currencyResult.total)}가 된다.`,
    method: `원화 환산 수익률 = (1 + 달러 수익률) × (1 + 원/달러 변화율) - 1. ${pp(currencyResult.price)}(가격) + ${pp(currencyResult.fx)}(환율) + ${pp(currencyResult.interaction)}(교차효과)로 분해했다. 양 시계열이 모두 존재하는 월별 마지막 날짜를 택했으며 결측치를 전일 값으로 채우지 않았다.`,
    interpretation: "2024년에는 달러 자산의 가격 상승과 원화 약세가 원화 환산 성과를 함께 높였다. 이 차이는 운용자의 종목 선택 성과와 구분해야 한다. 해외투자 성과를 설명할 때 고객의 소비 통화와 투자상품의 환헤지 여부가 필요한 이유다.",
    alternative: `연간 결과를 분기로 나누면 3분기 NASDAQ 달러 수익률은 ${pct(quarterlyCurrency[2].price)}, 원화 환산은 ${pct(quarterlyCurrency[2].total)}였다. 연간으로 유리했던 환율 효과가 모든 구간에서 유리했던 것은 아니다.`,
    implication: `가상으로 1,000만원의 40%를 NASDAQ에, 60%를 수익률 0%인 현금에 연초 배분해 그대로 보유했다면 전체 수익률은 ${pct(allocationOverlay.totalReturn)}다. 이는 과거 지수를 적용한 계산 예시이며 실제 계좌 성과나 권장 비중이 아니다.`,
    limitations: ["NASDAQ 종가와 FRED 환율은 같은 날짜라도 관측 시각이 다르다. 환율은 뉴욕 정오 매입률이며 서울 종가·고객 적용 환율과 다르다.", "월별 관측치 사이의 급락은 차트에 드러나지 않는다. 이 자료로 일별 최대 낙폭을 계산하지 않는다.", "NASDAQ 지수를 직접 매수할 수 없으며 추종 상품의 보수, 추적오차, 배당과 세금은 반영하지 않았다."],
    nextCheck: "실제 상품의 환헤지 정책과 비용, 고객의 원화 지출 시점과 손실 감내 범위를 함께 확인한다.",
    sourceIds: ["nasdaq", "fx", "sec"],
    table: { caption: "구간별 확인 · 각 분기의 시작·종료 관측일을 일치시킨 계산", headers: ["기간", "NASDAQ · USD", "원/달러", "NASDAQ · KRW"], rows: quarterlyCurrency.map(r => [r.quarter, pct(r.price), pct(r.fx), pct(r.total)]) }
  },
  {
    id: "case-company", number: "03", label: "기업금융 · 현금흐름 관리", title: "같은 환율 충격, 반대의 현금흐름",
    question: "환율과 금리가 동시에 오르면 수출 기업은 반드시 유리한가?",
    period: "가상 기업 · 12개월 · 실제 기업·시장 전망·대출 심사 결과가 아님",
    metrics: [
      { label: "달러 순수취 기업 · 순효과", value: money(exporterResult.combinedImpact), detail: "외화결제 +1,000만원 / 이자 -600만원" },
      { label: "달러 순지급 기업 · 순효과", value: money(importerResult.combinedImpact), detail: "외화결제 -1,000만원 / 이자 -600만원" },
      { label: "이자 증가를 상쇄하는 환율", value: "1,360원/USD", detail: "순수취 10만 달러 · 금리 +1%p 가정" }
    ],
    finding: "원화 차입 10억원, 변동금리 비중 60%, 기준 이자율 연 4%, 금리 상승 1%p를 가정했다. 달러 수취 20만·지급 10만 달러, 환율 1,300→1,400원일 때 외화결제 개선 1,000만원에서 추가 이자 600만원을 빼면 순효과는 +400만원이다. 수취와 지급을 바꾸면 -1,600만원이다.",
    method: "추가 이자 = 차입금 × 변동금리 비중 × 금리 변화(%p / 100) × 12/12. 외화결제 효과 = (달러 수취 - 달러 지급) × 환율 변화. 순효과는 외화결제 효과에서 추가 이자를 차감한다. 환율과 금리의 조합 9개로 민감도를 확인했다.",
    interpretation: "수출 매출만 보면 환율 상승을 호재로 설명하기 쉽다. 그러나 원재료 수입 등 외화 지급과 변동금리 차입을 함께 봐야 실제 현금 여력에 가까워진다. 이 사례에서도 환율이 60원보다 적게 오르면 순수취 기업의 환차익이 추가 이자를 모두 상쇄하지 못한다.",
    alternative: "표의 금액은 같은 12개월 안에서 합산한 변화다. 이자가 먼저 지급되고 수출 대금이 나중에 들어오면 연간 순효과가 양수여도 중간 자금 부족이 생길 수 있다. 거래 시점, 채권 회수 가능성, 기존 환헤지가 결과를 바꿀 수 있다.",
    implication: "기업 상담의 확인 순서는 통화별 수취·지급 일정, 변동금리 잔액과 재산정일, 만기별 자금 부족액이다. 그 다음에 결제 구조나 차입 조건의 조정 가능성을 검토한다. 이 단순 계산만으로 여신 한도나 헤지상품을 결정하지 않는다.",
    limitations: ["차입 원금과 거래량이 일정하고 금리 변화가 즉시 전 기간에 적용된다고 가정한다. 분할 상환, 재산정 주기와 할인 효과는 제외했다.", "외화 차입, 환헤지, 세금, 매출·원가 변동은 반영하지 않았다. 표시 금액은 회계상 순이익이나 기업가치 변화가 아니다."],
    nextCheck: "월별 자금수지표와 실제 계약의 결제일을 확보하고, 외화 순노출 및 금리 재산정일을 만기별로 다시 계산한다.",
    sourceIds: ["trade"],
    table: { caption: "달러 순수취 기업의 순효과 · 단위 만원 · 금리 변화는 %p", headers: ["원/달러 변화", "금리 유지", "+0.5%p", "+1.0%p"], rows: companyStress.map(r => [`${signed(r.fxChange, 0)}원`, ...r.results.map(money)]) }
  }
];

export const projectContribution = [
  { role: "김승현", detail: "프로젝트 주제와 금융권 활용 목적을 정하고, 기업·개인금융·증권·자산운용을 함께 다루는 방향을 선택했습니다." },
  { role: "Codex 활용", detail: "자료 수집과 정리, 코드 구현, 분석 문안 초안, 계산 검증 및 PDF 제작을 보조했습니다. 독립 개발이나 단독 분석 수행으로 표시하지 않습니다." }
];

export const submission = { reviewedOn, title: "시장·환율·현금흐름 분석", author: "김승현", subtitle: "KOSPI × NASDAQ Coupling Lab", cases: caseStudies,
  contribution: projectContribution, sources: caseSources, annualCloses, annualReturns, currencyCloses, currencyChart,
  companyStress, annualStats, currencyResult, companyInput };
