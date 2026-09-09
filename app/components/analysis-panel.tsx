"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { calculateReturn, formatReturn, formatCorrelation, returnCorrelation, maxDrawdown, rollingCorrelation, type SeriesRow } from "../../lib/analytics";

import { perspectives, type Perspective, type ResearchNote } from "../../lib/research";
import type { ScenarioSnapshot } from "../../lib/scenarios";

type Props = {
  rows: SeriesRow[];
  currencyBasis: "local" | "krw";
  periodLabel: string;
  updatedAt: string;
  stale: boolean;
  failedSymbols: string[];
  selectedNote: ResearchNote | null;
  scenario: ScenarioSnapshot | null;
};

export function AnalysisPanel({ rows, currencyBasis, periodLabel, updatedAt, stale, failedSymbols, selectedNote, scenario }: Props) {
  const [audience, setAudience] = useState<Perspective>("market");
  const [commentary, setCommentary] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const perspective = perspectives.find((p) => p.key === audience)!;
  const correlation = returnCorrelation(rows, "kospi", "nasdaq");
  const rolling = useMemo(() => rollingCorrelation(rows, "kospi", "nasdaq", 20), [rows]);
  const kReturn = calculateReturn(rows, "kospi"), nReturn = calculateReturn(rows, "nasdaq");
  const kDrawdown = maxDrawdown(rows, "kospi"), nDrawdown = maxDrawdown(rows, "nasdaq");
  const usable = rows.length >= 2;
  const range = usable ? `${rows[0].month} ~ ${rows.at(-1)?.month}` : "분석할 데이터가 부족합니다";
  const basis = currencyBasis === "krw" ? "KOSPI 원화 / NASDAQ 원화 환산" : "KOSPI 원화 / NASDAQ 달러";
  const questions = perspective.questions;
  const memo = usable ? [
    "KOSPI × NASDAQ | 시장 분석 메모", `분석 기간: ${range} (${periodLabel}, 공통 관측일 ${rows.length}개)`,
    `통화 기준: ${basis}`, `수집 시각: ${updatedAt || "미확인"}`,
    ...(stale ? ["주의: 갱신에 실패한 이전 수집 데이터입니다."] : []),
    ...(failedSymbols.length ? [`수집 누락: ${failedSymbols.join(", ")} (누락 종목이 있는 바스켓은 계산 제외)`] : []),
    "", "관측된 사실",
    `KOSPI ${formatReturn(kReturn)}, NASDAQ ${formatReturn(nReturn)}. 수익률 차이 ${(kReturn! - nReturn!).toFixed(1)}%p.`,
    `연속 공통 관측일 수익률 상관계수 ${formatCorrelation(correlation)} (${Math.max(0, rows.length - 1)}개 구간).`,
    `공통 관측일 기준 최대 낙폭: KOSPI ${formatReturn(kDrawdown)}, NASDAQ ${formatReturn(nDrawdown)}.`,
    "", perspective.heading,
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    "", "해석의 범위",
    "가격지수의 과거 성과이며 투자상품의 실현 수익률이나 미래 수익률 예측이 아닙니다.",
    "한국·미국의 장 마감 시각이 다릅니다. 날짜 일치는 동시 관측이나 선행·인과관계를 의미하지 않습니다.",
    "최대 낙폭은 공통 관측일의 종가 기준이며, 제외된 거래일과 장중의 더 큰 하락을 반영하지 못할 수 있습니다.",
    currencyBasis === "krw" ? "원화 환산은 같은 날짜 환율을 곱한 근사치이며 환헤지·세금·거래 비용은 제외합니다." : "미국 지수의 달러 성과에는 원/달러 환율 효과가 반영되지 않았습니다.",
    "출처: Yahoo Finance Chart API. 메모는 화면 수치로 자동 작성되며, 사용 전 원자료와 관련 공시를 확인합니다."
  ].join("\n") : "기간과 데이터를 확인하면 관측 사실과 상담 질문이 담긴 메모가 표시됩니다.";

  function downloadMemo() {
    if (!usable) return;
    const blob = new Blob(["\ufeff" + memo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `market-note-${rows.at(-1)?.month}-${currencyBasis}-${audience}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPdf() {
    setPdfBusy(true); setPdfStatus("");
    try {
      const { createMarketPdf, fetchReportFont } = await import("../../lib/report");
      const font = await fetchReportFont();
      const pdf = createMarketPdf({ rows, currencyBasis, periodLabel, perspective: audience, commentary, note: selectedNote, scenario, updatedAt, stale, failedSymbols }, font);
      pdf.save(`market-report-${rows.at(-1)?.month}-${audience}.pdf`);
      setPdfStatus("한 장 리포트 다운로드를 시작했습니다.");
    } catch (error) { setPdfStatus(error instanceof Error ? error.message : "PDF 저장 중 오류가 발생했습니다."); }
    finally { setPdfBusy(false); }
  }

  return (
    <section className="analysis-panel" aria-labelledby="analysis-heading">
      <div className="analysis-heading">
        <div><p className="eyebrow">Risk & Research Brief</p><h2 id="analysis-heading">수익률 다음에 확인할 것</h2></div>
        <p className="muted">{range}<br />{usable && `${rows.length}개 공통 관측일 · ${basis}`}</p>
      </div>
      <div className="risk-grid">
        <article className="risk-card"><p>KOSPI 최대 낙폭</p><div className="metric">{formatReturn(kDrawdown)}</div><p className="muted">선택 기간 고점 대비 가장 큰 하락</p></article>
        <article className="risk-card"><p>NASDAQ 최대 낙폭</p><div className="metric">{formatReturn(nDrawdown)}</div><p className="muted">{currencyBasis === "krw" ? "환율 변화 반영 · 원화 기준" : "환율 변화 제외 · 달러 기준"}</p></article>
        <article className="risk-card"><p>수익률 상관계수</p><div className="metric">{formatCorrelation(correlation)}</div><p className="muted">−1 ~ +1 · {Math.max(0, rows.length - 1)}개 수익률 구간</p></article>
      </div>
      <p className="muted">최대 낙폭은 공통 관측일 종가 기준입니다. 장중 및 제외된 거래일의 하락은 반영하지 못할 수 있습니다. 상관계수는 가격 수준 대신 같은 날짜 구간의 수익률로 계산하며, 표본이 적거나 수익률이 일정하면 해석에 한계가 있습니다.</p>
      <h3>동행 정도는 기간 안에서도 달라집니다</h3>
      <p className="muted">최근 20개 공통 관측 구간의 이동 상관계수 · 동일 날짜의 한·미 종가는 서로 다른 시각에 형성됩니다.</p>
      {rolling.some((row) => row.correlation !== null) ? (
        <div className="rolling-chart"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={rolling} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#35465f" />
            <XAxis dataKey="month" stroke="#b6c5dd" minTickGap={44} tick={{ fontSize: 12 }} />
            <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} stroke="#b6c5dd" />
            <Tooltip contentStyle={{ background: "#17253a", borderColor: "#536179", color: "#f8fafc" }} formatter={(value) => [Number(value).toFixed(3), "20구간 상관계수"]} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Line type="linear" dataKey="correlation" stroke="#2dd4bf" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer></div>
      ) : <div className="empty-note">이동 상관계수에는 최소 21개 공통 관측일과 수익률 변동이 필요합니다. 더 긴 기간을 선택해 주세요.</div>}
      <div className="analysis-heading memo-heading">
        <div><p className="eyebrow">From Data to Conversation</p><h3>관측 사실에서 다음 질문으로</h3></div>
        <div className="memo-actions" role="group" aria-label="분석 메모 관점">
          {perspectives.map((item) => <button key={item.key} aria-pressed={audience === item.key} onClick={() => setAudience(item.key)}>{item.label}</button>)}
        </div>
      </div>
      <label htmlFor="market-memo" className="muted">현재 선택한 기간·통화의 분석 초안입니다. 선택한 관점에서 해석과 확인 내용을 보완해 활용하세요.</label>
      <textarea id="market-memo" className="market-memo" value={memo} readOnly rows={12} />
      <button className="download-memo" disabled={!usable} onClick={downloadMemo}>분석 메모 내려받기</button>
      <div id="report-export" className="report-export">
        <p className="eyebrow">One-page Report</p><h3>차트와 나의 해석을 한 장으로</h3>
        <label className="field">리포트용 해석 (300자 이내)<textarea rows={4} maxLength={300} value={commentary} placeholder="선택한 기간에서 확인한 사실, 자신의 해석과 남은 질문을 요약하세요." onChange={(e) => setCommentary(e.target.value)} /><span className="muted">{commentary.length}/300자 · 이 입력은 PDF에 포함됩니다.</span></label>
        <p className="muted">연결 이슈: {selectedNote ? `${selectedNote.date} · ${selectedNote.title}` : "미선택 — 아래 이슈 노트에서 연결할 수 있습니다."}<br />시나리오: {scenario?.title || "입력값 확인 필요"}</p>
        <button className="download-memo" disabled={!usable || pdfBusy} onClick={downloadPdf}>{pdfBusy ? "PDF 만드는 중…" : "분석 리포트 PDF 저장"}</button>
        <p role="status" className="muted">{pdfStatus}</p>
      </div>
      <details className="methodology"><summary>계산 방법과 데이터의 한계</summary>
        <ul>
          <li>지수화: 현재 값 ÷ 공통 시작일 값 × 100. 수익률: (종료 값 ÷ 시작 값 − 1) × 100.</li>
          <li>상관계수: 공통 날짜를 맞춘 뒤 연속 관측 구간의 단순 수익률에 Pearson 공식을 적용합니다. 휴장일 때문에 일부 구간은 여러 날짜를 포함합니다.</li>
          <li>원화 환산: NASDAQ 값 × 원/달러 환율. 원화 수익률 = (1 + 달러 수익률) × (1 + 환율 변화율) − 1. 동일 날짜 환율을 사용한 비교용 근사치입니다.</li>
          <li>최대 낙폭: 관측 값 ÷ 해당 시점까지의 최고 값 − 1 중 최솟값. 선택 기간 시작 전 고점은 포함하지 않습니다.</li>
          <li>섹터 바스켓: 모든 구성 종목의 공통 시작일에 같은 금액을 투자한 뒤 보유하는 방식입니다. 시작일 이후 비중은 변하며, 선택 기간 변경이 재투자를 의미하지 않습니다. 종목이 하나라도 누락되면 바스켓을 표시하지 않습니다.</li>
          <li>종목은 수정종가를 우선 사용하고, 제공되지 않는 시계열은 전체를 일반 종가로 처리합니다. 지수와 종목의 배당 반영 범위가 다를 수 있습니다. 현재 선정한 종목 바스켓은 산업 전체를 대표하지 않습니다.</li>
          <li>당일 미완성 관측치를 피하기 위해 각 거래소의 현지 날짜 기준 당일 자료를 제외합니다. 수집 결과는 최대 5분 재사용하며 수집 시각과 실제 데이터 기준일은 다릅니다.</li>
        </ul>
        <p><a href="https://www.investor.gov/introduction-investing/investing-basics/investment-products/international-investing" target="_blank" rel="noopener noreferrer">SEC Investor.gov: 해외투자와 환율 위험</a></p>
      </details>
    </section>
  );
}
