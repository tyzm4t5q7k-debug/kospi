"use client";
import { useEffect, useMemo, useState } from "react";
import { allocationScenario, cashflowScenario, percent, signedWon, won, type ScenarioSnapshot } from "../../lib/scenarios";

const initialAllocation = { capital: "10000000", koreaWeight: "40", usWeight: "40", koreaReturn: "5", usReturn: "10", fxChange: "-5", cashReturn: "2" };
const initialCashflow = { debt: "1000000000", floatingShare: "100", rate: "4", rateChange: "1", months: "12", usdReceipts: "100000", usdPayments: "0", fx: "1300", nextFx: "1400" };
const labels: Record<string, [string, number, number, number]> = {
  capital: ["투자금액 (원)", 0, 1e15, 1000000], koreaWeight: ["국내자산 비중 (%)", 0, 100, 1], usWeight: ["해외자산 비중 (%)", 0, 100, 1],
  koreaReturn: ["국내자산 수익률 가정 (%)", -100, 1000, 1], usReturn: ["해외자산 달러 수익률 가정 (%)", -100, 1000, 1], fxChange: ["원/달러 환율 변화 가정 (%)", -99, 1000, 1], cashReturn: ["현금성 자산 수익률 가정 (%)", -100, 1000, .1],
  debt: ["차입금 (원)", 0, 1e15, 10000000], floatingShare: ["변동금리 비중 (%)", 0, 100, 1], rate: ["현재 차입금리 (%)", 0, 100, .1], rateChange: ["금리 변화 (%p)", -100, 100, .1], months: ["이자 계산 기간 (개월)", 1, 120, 1],
  usdReceipts: ["기간 중 달러 수취액 (USD)", 0, 1e12, 10000], usdPayments: ["기간 중 달러 지급액 (USD)", 0, 1e12, 10000], fx: ["기준 환율 (원/USD)", 1, 1e6, 10], nextFx: ["변경 환율 (원/USD)", 1, 1e6, 10]
};
function numbers<T extends Record<string, string>>(value: T) { return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v.trim() === "" ? NaN : Number(v)])) as { [K in keyof T]: number }; }

export function ScenarioLab({ onChange }: { onChange: (snapshot: ScenarioSnapshot | null) => void }) {
  const [mode, setMode] = useState<"allocation" | "cashflow">("allocation");
  const [allocation, setAllocation] = useState(initialAllocation);
  const [cashflow, setCashflow] = useState(initialCashflow);
  const a = useMemo(() => allocationScenario(numbers(allocation)), [allocation]);
  const c = useMemo(() => cashflowScenario(numbers(cashflow)), [cashflow]);
  const snapshot = useMemo<ScenarioSnapshot | null>(() => mode === "allocation" ? a && ({
    title: "자산배분·환율 시나리오 (입력 가정)",
    assumptions: [`투자금 ${won(Number(allocation.capital))} / 국내 ${allocation.koreaWeight}% / 해외 ${allocation.usWeight}% / 현금 ${a.cashWeight}%`, `기간 수익률 가정: 국내 ${allocation.koreaReturn}% / 해외 ${allocation.usReturn}% / 환율 ${allocation.fxChange}% / 현금 ${allocation.cashReturn}%`],
    results: [{ label: "포트폴리오 수익률", value: percent(a.totalReturn) }, { label: "평가손익", value: signedWon(a.profit) }],
    note: "동일한 한 기간의 가정. 최초 비중 기준 매수 후 보유, 세금·비용·환헤지 제외."
  }) : c && ({
    title: "차입·외화결제 시나리오 (입력 가정)",
    assumptions: [`차입금 ${won(Number(cashflow.debt))} / 변동금리 ${cashflow.floatingShare}% / ${cashflow.months}개월 / 금리 ${cashflow.rate}%에서 ${Number(cashflow.rate) + Number(cashflow.rateChange)}%`, `달러 순수취 ${c.netUsd.toLocaleString("ko-KR")} USD / 환율 ${cashflow.fx}에서 ${cashflow.nextFx}원`],
    results: [{ label: "추가 이자 부담", value: signedWon(c.extraInterest) }, { label: "환율·이자 합산 영향", value: signedWon(c.combinedImpact) }],
    note: "기간 중 원금 유지, 변동금리 즉시 적용, 외화결제 동일 시점 가정. 환헤지·비용 제외."
  }), [mode, a, c, allocation, cashflow]);
  useEffect(() => { onChange(snapshot); }, [snapshot, onChange]);
  const values = mode === "allocation" ? allocation : cashflow;
  const change = (key: string, value: string) => mode === "allocation" ? setAllocation((old) => ({ ...old, [key]: value })) : setCashflow((old) => ({ ...old, [key]: value }));

  return <section id="scenarios" className="analysis-panel" aria-labelledby="scenario-heading">
    <div className="analysis-heading"><div><p className="eyebrow">Scenario Lab</p><h2 id="scenario-heading">같은 변화, 다른 금융 관점</h2></div>
      <div className="memo-actions" role="group" aria-label="시나리오 선택">
        <button aria-pressed={mode === "allocation"} onClick={() => setMode("allocation")}>자산배분·환율</button>
        <button aria-pressed={mode === "cashflow"} onClick={() => setMode("cashflow")}>차입·외화결제</button>
      </div></div>
    <p className="muted">예시 숫자로 시작하는 계산 연습입니다. 실제 보유자산이나 시장 전망이 아닙니다. 가정을 바꾸면 결과도 함께 바뀝니다.</p>
    <div className="scenario-layout"><div>
      <div className="input-grid">{Object.entries(values).map(([key, value]) => <label key={key} className="field">{labels[key][0]}<input type="number" inputMode="decimal" min={labels[key][1]} max={labels[key][2]} step={labels[key][3]} value={value} onChange={(e) => change(key, e.target.value)} /></label>)}</div>
      {mode === "allocation" && <p className="muted">현금성 자산 비중: {a ? `${a.cashWeight}%` : "국내·해외 합계가 100% 이하이어야 합니다."} · 모든 수익률은 같은 기간 기준으로 입력합니다.</p>}
      <button className="secondary-action" onClick={() => mode === "allocation" ? setAllocation(initialAllocation) : setCashflow(initialCashflow)}>예시 가정으로 초기화</button>
    </div><div aria-live="polite">
      {!snapshot ? <p role="status" className="empty-note">입력값과 비중을 확인해 주세요. 빈 값, 음수 금액, 100% 초과 비중 또는 음수가 되는 차입금리로는 계산하지 않습니다.</p> : <>
        <div className="risk-grid">{snapshot.results.map((result) => <article key={result.label} className="risk-card"><p>{result.label}</p><div className="metric compact-metric">{result.value}</div></article>)}</div>
        {mode === "allocation" && a ? <>
          <p>예상 평가금액: {won(a.endingValue)}<br />해외자산 원화 수익률: {percent(a.usKrwReturn)}</p>
          <h3>수익률 기여도 (%p)</h3>
          <div className="contribution-list">{a.contributions.map((item) => <div className="contribution-row" key={item.name}><span>{item.name}</span><span className={item.value < 0 ? "negative-value" : "positive-value"}>{item.value > 0 ? "+" : ""}{item.value.toFixed(2)}%p</span><div className="contribution-track"><span style={{ width: `${Math.abs(item.value) / Math.max(1, ...a.contributions.map((p) => Math.abs(p.value))) * 100}%`, background: item.value < 0 ? "#fda4af" : "#5eead4" }} /></div></div>)}</div>
          <p className="muted">해외자산의 가격 효과, 환율 효과와 두 변화가 곱해지는 교차효과를 나누어 표시합니다.</p>
        </> : c && <><p>기간 이자: {won(c.beforeInterest)} → {won(c.afterInterest)}<br />외화결제 환율 영향: {signedWon(c.fxImpact)}</p><p className="muted">합산 영향 = 외화결제 환율 효과 − 추가 이자 부담. 플러스는 현금흐름 개선, 마이너스는 부담 증가입니다.</p></>}
        <p className="muted">{snapshot.note}</p>
      </>}
    </div></div>
    <details className="methodology"><summary>계산 근거와 해석 범위</summary><p>자산배분 수익률은 최초 비중 × 각 자산의 기간 수익률을 합산합니다. 해외자산에는 (1 + 달러 수익률) × (1 + 환율 변화율) − 1을 적용합니다. 추가 이자는 차입금 × 변동금리 비중 × 금리 변화 × 개월 수/12, 환율 영향은 달러 순수취액 × 환율 차이입니다.</p><p>차입금리의 변화는 변동금리 부분에만 즉시 적용한다고 가정합니다. 원금 상환·변동 시점·고정금리 재약정·환헤지·세금·거래 비용은 포함하지 않습니다. 이 시나리오는 현금흐름과 성과 요인을 이해하기 위한 계산이며 권장 자산배분이 아닙니다.</p><p><a href="https://www.investor.gov/introduction-investing/getting-started/asset-allocation" target="_blank" rel="noopener noreferrer">SEC: 자산배분</a>{" · "}<a href="https://www.trade.gov/foreign-exchange-risk" target="_blank" rel="noopener noreferrer">미국 상무부: 외환 위험</a></p></details>
  </section>;
}
