"use client";

import { useState } from "react";
import { experimentRange } from "../../lib/experiment-demo";

const steps = [
  ["01", "소비 변화 분해", "금액 변화를 결제건수와 건당금액으로 나누고, 성별·연령 집계군 내부 변화와 구성 변화를 구분합니다."],
  ["02", "비교 조건 점검", "인구와 초기 소비 구성이 유사한 지역을 비교하고, 기간·비교군 수·임계값을 바꾸어 신호의 민감도를 확인합니다."],
  ["03", "현장 근거 확인", "사업자·인허가·생활인구 자료로 질문을 좁히고, 온라인 귀속 영향과 동일 점포의 운영·POS·원가 자료를 확인합니다."],
  ["04", "실험 검토와 보류", "근거에 맞는 실험 후보를 정하고, 비용 회수와 손실 한도 조건을 함께 만족하는 거래규모를 계산합니다."]
];

export function ContestProject() {
  const [cost, setCost] = useState("100000");
  const result = cost.trim() ? experimentRange(Number(cost)) : null;
  const number = (value: number) => value.toLocaleString("ko-KR");
  return <section id="contest-project" className="contest-project" aria-labelledby="contest-title">
    <p className="eyebrow">대표 프로젝트 · 소비데이터 분석과 서비스 기획</p>
    <h2 id="contest-title">소비 변화 분해를 통한<br />상권 마케팅 실험 설계</h2>
    <p className="contest-lede">같은 소비금액 감소에도, 먼저 확인할 자료와 검토할 실험은 달라집니다. 소비 변화 분석을 현장 확인과 비용·손실 조건의 검토로 연결한 엑셀 시제품입니다.</p>
    <p className="muted">제1회 AI금융빅데이터플랫폼 소비데이터 활용 분석·아이디어 공모전 · 김승현 개인 참가 프로젝트 · 분석 대상 기간 2026년 1~6월</p>
    <div className="portfolio-actions"><a href="#contest-demo" className="portfolio-primary">가상 조건으로 규모 계산해 보기</a><a href="#case-studies" className="portfolio-secondary">시장·환율 분석도 보기</a></div>
    <div className="contest-purpose"><h3>담당자가 다음에 확인할 자료를 정하도록</h3><p>소비금액의 감소만으로 방문 감소나 고객 이탈을 단정하지 않습니다. 지자체·상인회 담당자가 점검할 자료를 고르고, 현장 근거가 확보된 경우에만 실험 후보와 규모를 검토하는 절차를 설계했습니다.</p></div>
    <ol className="contest-steps">{steps.map(([n,title,body]) => <li key={n}><span className="case-number">{n}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
    <div className="contest-columns">
      <div><h3>구현한 기능</h3><ul><li>지역·업종 선택에 따른 진단 조회와 분석 근거 연결</li><li>조회 대상과 현장 기록의 대상 일치 여부 확인</li><li>근거가 비어 있거나 확인되지 않은 경우 후보·규모 제시 보류</li><li>원가와 거래 구성 가정에서 건당 이익 변화 계산</li><li>비용·원가·구성비의 27개 가상 조합 비교</li><li>실험계획의 미입력 항목과 손실 한도 도달 시 중단 검토 안내</li></ul></div>
      <div><h3>분석에서 지킨 구분</h3><ul><li>결제건수와 고객 수·방문 횟수</li><li>지역 생활인구와 개별 점포 방문자</li><li>성별·연령 구성 변화와 품목·가격 변화</li><li>규칙에 따른 점검 대상과 실제 영업 부진</li><li>가정상 가능한 거래규모와 통계적 실험 표본 수</li></ul><p className="muted">한 운영자의 화면 검토 의견을 반영해 용어 해설과 입력 순서 안내를 보완했습니다. 일반적인 사용성 개선이나 실제 판촉 효과를 입증한 결과는 아닙니다.</p></div>
    </div>
    <div id="contest-demo" className="contest-demo">
      <p className="eyebrow">가상 입력 시연 · 실제 지역·점포 데이터 미사용</p>
      <h3>비용이 바뀌면 검토 가능한 규모도 달라집니다</h3>
      <p>동일한 거래건수에서 실험·미실험 조건을 비교합니다. 건당 이익 변화는 −300~+200원, 손실 한도는 50만원, 운영 가능한 최대 규모는 2,000건으로 고정한 예시입니다.</p>
      <div className="contest-demo-grid"><div><label className="field">추가 고정비 (원)<input type="number" min="0" max="1000000" step="1" value={cost} onChange={e=>setCost(e.target.value)} aria-describedby="contest-cost-help" /></label><p id="contest-cost-help" className="muted">0~1,000,000원의 정수. 다른 조건은 동일하게 유지합니다.</p><div className="memo-actions"><button type="button" onClick={()=>setCost("100000")}>10만원 예시</button><button type="button" onClick={()=>setCost("200000")}>20만원 예시</button></div></div>
      <div className="contest-demo-result" role="status" aria-live="polite">{!result ? <p>추가 고정비를 유효한 정수로 입력해 주세요.</p> : <><p>가정상 검토 가능한 거래규모</p><p className="metric compact-metric">{result.feasible ? `${number(result.lower)}~${number(result.upper)}건` : "두 조건을 만족하는 범위 없음"}</p><p>{result.feasible ? "낙관 가정에서 비용 회수 후 이익이 남고, 비관 가정에서 손실 한도 안인 정수 건수입니다." : "비용이나 건당 이익 변화 가정의 근거를 다시 확인해야 합니다."}</p><p className="muted">같은 1,000건 비교 시 증분이익: {number(result.downsideAt1000)}~{number(result.upsideAt1000)}원</p></>}</div></div>
      <details className="study-evidence"><summary>산식과 시연의 범위</summary><p>증분이익 = 거래건수 N × 건당 이익 변화 − 추가 고정비 F.</p><p>낙관 가정: N × 200 − F &gt; 0. 비관 가정: N × (−300) − F ≥ −500,000. 두 조건을 1~2,000의 정수 N에서 동시에 확인합니다.</p><p>비용 10만원이면 최소 501건·최대 1,333건입니다. 비용 20만원이면 최소 1,001건·최대 1,000건으로 교집합이 없습니다. 범위 안에서도 실제 손실이 발생할 수 있습니다.</p><p>이 화면은 엑셀의 규모 계산 원리를 가상 값으로 재구현한 설명용 시연입니다. 현장 확인 절차 전체를 구현한 실행 승인 도구가 아니며, 실험 효과의 신뢰구간·검증력·적정 표본 수를 계산하지 않습니다.</p></details>
    </div>
    <details className="study-evidence"><summary>프로젝트 범위와 후속 검증</summary><p>BC카드 소비자료에 행정안전부 인구, 국세청 사업자현황, 서울시 인허가·생활인구 자료를 결합해 확인 질문을 구체화했습니다. 자료마다 업종·대상·집계 시점이 달라 동일 모집단으로 간주하지 않았습니다.</p><p>공개 소개에는 분석 방법과 서비스 구조, 가상 계산 예시를 담았습니다. 공모전 원자료·지역별 집계·진단 조회 파일 및 제출용 문서 원본은 이 페이지에서 배포하지 않습니다.</p><p>개인 참가 결과물은 분석 보고서와 엑셀 시제품으로 구성됩니다. 이 웹 소개와 가상 시연은 제출 자료를 바탕으로 Codex의 도움을 받아 재구성했습니다.</p><p>실제 점포의 POS·원가 확보와 판촉 효과 검증은 후속 과제입니다. 새 기간 자료와 담당자 평가를 통해 자료 선택 시간, 판단 근거 누락, 규모 설명의 적절성을 확인하는 계획을 제안했습니다.</p></details>
  </section>;
}
