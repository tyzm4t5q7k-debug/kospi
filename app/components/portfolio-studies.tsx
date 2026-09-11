"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { annualReturns, caseStudies, currencyChart, projectContribution } from "../../lib/case-studies";
import { caseSources, reviewedOn } from "../../lib/case-data";

const reportPath = "/reports/kim-seunghyun-finance-portfolio.pdf";

export function PortfolioIntro() {
  return <section className="portfolio-intro" aria-labelledby="portfolio-heading">
    <div className="portfolio-intro-copy">
      <p className="eyebrow">김승현 · 경제통상학 · 금융 분석 포트폴리오</p>
      <h2 id="portfolio-heading">시장 수익률을 비교하고,<br />환율과 현금흐름으로 설명합니다.</h2>
      <p className="portfolio-lede">한국과 미국 시장의 동행 정도, 해외투자의 원화 성과, 기업의 외화결제와 이자 부담을 세 가지 사례로 분석했습니다. 관측 결과에서 출발해 금융 업무에서 확인할 질문으로 연결합니다.</p>
      <div className="portfolio-actions">
        <a className="portfolio-primary" href={reportPath} download><ArrowDownToLine size={18} aria-hidden="true" /> 제출용 분석 보고서 · PDF</a>
        <a className="portfolio-secondary" href="#case-studies">대표 분석 읽기 <ArrowUpRight size={18} aria-hidden="true" /></a>
        <a className="portfolio-secondary" href="#live-market">최신 시장 직접 비교</a>
      </div>
      <p className="muted">고정 표본의 분석 사례 2편 + 가상 기업 시나리오 1편 · 자료 확인 {reviewedOn}</p>
    </div>
    <div className="portfolio-findings">
      {caseStudies.map(study => <a href={`#${study.id}`} key={study.id} className="portfolio-finding">
        <span className="case-number">{study.number}</span><div><p>{study.label}</p><h3>{study.title}</h3><span>{study.metrics[0].label} <strong>{study.metrics[0].value}</strong></span></div>
      </a>)}
    </div>
    <details className="contribution-note"><summary>프로젝트 기여와 AI 활용 범위</summary>
      <dl>{projectContribution.map(item => <div key={item.role}><dt>{item.role}</dt><dd>{item.detail}</dd></div>)}</dl>
      <p className="muted">분석 문안은 AI 보조로 작성했습니다. 금융기관의 공식 리서치나 고객 상담·운용 실적이 아닙니다.</p>
    </details>
  </section>;
}

export function PortfolioStudies() {
  return <section id="case-studies" className="portfolio-studies" aria-labelledby="studies-heading">
    <div className="studies-heading"><div><p className="eyebrow">Selected studies</p><h2 id="studies-heading">질문에서 해석까지, 대표 분석 3편</h2></div><a href={reportPath} download className="portfolio-secondary">보고서 내려받기 <ArrowDownToLine size={17} aria-hidden="true" /></a></div>
    <p className="muted">아래 사례는 고정된 자료로 재현합니다. 페이지 하단의 최신 시장 데이터와 기간·출처·관측 빈도가 다릅니다.</p>
    {caseStudies.map(study => <article key={study.id} id={study.id} className="study-article">
      <header className="study-header"><span className="case-number">{study.number}</span><div><p className="eyebrow">{study.label}</p><h3>{study.title}</h3><p className="muted">{study.period}</p></div></header>
      <p className="study-question">{study.question}</p>
      <div className="study-metrics">{study.metrics.map(metric => <div key={metric.label}><p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.detail}</span></div>)}</div>
      <p className="study-finding">{study.finding}</p>
      <div className="study-interpretation"><h4>해석과 업무 연결</h4><p>{study.interpretation}</p><p>{study.implication}</p></div>
      <details className="study-evidence"><summary>계산 근거 · 구간별 결과 · 한계 확인</summary>
        <h4>분석 방법</h4><p>{study.method}</p>
        {study.id === "case-market" && <figure><div className="study-chart" role="img" aria-label="2015년부터 2024년까지 KOSPI와 NASDAQ의 연간 수익률 비교. 정확한 수치는 아래 표에 있습니다."><ResponsiveContainer width="100%" height="100%"><BarChart data={annualReturns}><CartesianGrid strokeDasharray="3 3" stroke="#38536d" /><XAxis dataKey="year" stroke="#b6c5dd" /><YAxis stroke="#b6c5dd" unit="%" width={54} /><Tooltip contentStyle={{ background: "#10263f", border: "1px solid #52708e", color: "#fff" }} formatter={(value: any) => `${Number(value).toFixed(2)}%`} /><Legend /><ReferenceLine y={0} stroke="#9fb5cb" /><Bar dataKey="kospi" name="KOSPI · KRW" fill="#60a5fa" radius={[3, 3, 0, 0]} /><Bar dataKey="nasdaq" name="NASDAQ · USD" fill="#2dd4bf" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div><figcaption>각 시장의 연말 종가로 계산한 연간 수익률. 동일 통화의 성과 비교가 아닙니다.</figcaption></figure>}
        {study.id === "case-currency" && <figure><div className="study-chart" role="img" aria-label="2024년 NASDAQ의 달러 기준과 원화 환산 가격지수 비교. 시작일 100."><ResponsiveContainer width="100%" height="100%"><LineChart data={currencyChart}><CartesianGrid strokeDasharray="3 3" stroke="#38536d" /><XAxis dataKey="month" tickFormatter={value => String(value).slice(2, 7)} stroke="#b6c5dd" minTickGap={24} /><YAxis stroke="#b6c5dd" width={44} domain={[90, "auto"]} /><Tooltip contentStyle={{ background: "#10263f", border: "1px solid #52708e", color: "#fff" }} formatter={(value: any) => Number(value).toFixed(2)} /><Legend /><Line type="linear" dataKey="usd" name="NASDAQ · USD" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="linear" dataKey="krw" name="NASDAQ · KRW" stroke="#2dd4bf" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div><figcaption>2023-12-29 = 100. 월별 마지막 공통 관측일 사이를 연결했으며, 중간의 일별 움직임을 나타내지 않습니다.</figcaption></figure>}
        <div className="study-table-wrap" role="region" aria-label={study.table.caption} tabIndex={0}><table className="study-table"><caption>{study.table.caption}</caption><thead><tr>{study.table.headers.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{study.table.rows.map((row, index) => <tr key={index}>{row.map((value, cell) => cell === 0 ? <th scope="row" key={cell}>{value}</th> : <td key={cell}>{value}</td>)}</tr>)}</tbody></table></div>
        <h4>다른 구간과 반대 해석</h4><p>{study.alternative}</p>
        <h4>이 분석이 말할 수 없는 것</h4><ul>{study.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        <h4>추가로 확인할 자료</h4><p>{study.nextCheck}</p>
        <div className="study-sources"><h4>출처</h4>{study.sourceIds.map(id => { const source = caseSources.find(s => s.id === id)!; return <p key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.detail}</span></p>; })}</div>
      </details>
    </article>)}
    <div className="study-reproducibility" id="study-methodology"><h3>검증 가능한 분석</h3><p>계산은 반올림 전 수치로 수행하고 표시에만 반올림합니다. 연간·월별 자료로 일별 위험을 추정하지 않으며, 기업 시나리오에는 가정과 단위를 함께 표시합니다. 표본과 산식은 공개해 동일한 결과를 다시 계산할 수 있습니다.</p>
      <div className="portfolio-actions"><a href="/research/annual-market-closes.csv" download>연말 종가 CSV</a><a href="/research/nasdaq-fx-monthly.csv" download>지수·환율 CSV</a><a href="https://github.com/tyzm4t5q7k-debug/kospi/blob/main/docs/methodology.md" target="_blank" rel="noreferrer">계산·검증 기준</a></div>
      <p className="muted">사례 01은 2차 편집 자료, 사례 02는 Nasdaq 및 미 연준 자료를 제공하는 FRED, 사례 03은 가상 입력값을 사용합니다. 개별 자료의 출처와 제한은 각 사례에서 확인할 수 있습니다.</p>
    </div>
  </section>;
}
