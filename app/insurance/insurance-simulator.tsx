"use client";

import { useState } from "react";
import {
  compareGaScenarios,
  insurerEconomics,
  type GaScenario,
} from "../../lib/insurance-economics";
import styles from "./insurance.module.css";

const initialBase: GaScenario = {
  contracts: 100,
  retention: 85,
  upfront: 600000,
  maintenance: 120000,
  payout: 420000,
  servicing: 30000,
  clawback: 300000,
  campaign: 0,
};
const initialPlan = { contracts: 120, retention: 80, campaign: 3000000 };
const money = (won: number) =>
  `${(won / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만 원`;
const signed = (won: number) => `${won > 0 ? "+" : ""}${money(won)}`;

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          onChange(
            Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min,
          );
        }}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function InsuranceSimulator() {
  const [perspective, setPerspective] = useState<"ga" | "insurer">("ga");
  return (
    <div className={styles.simulator}>
      <div className={styles.switcher} role="group" aria-label="분석 관점">
        <button
          aria-pressed={perspective === "ga"}
          onClick={() => setPerspective("ga")}
        >
          한화라이프랩 · GA 관점
        </button>
        <button
          aria-pressed={perspective === "insurer"}
          onClick={() => setPerspective("insurer")}
        >
          보험사 · 상품 손익 관점
        </button>
      </div>
      <div hidden={perspective !== "ga"}>
        <GaSimulator />
      </div>
      <div hidden={perspective !== "insurer"}>
        <InsurerSimulator />
      </div>
    </div>
  );
}

function GaSimulator() {
  const [base, setBase] = useState(initialBase);
  const [plan, setPlan] = useState(initialPlan);
  const proposed = { ...base, ...plan };
  const result = compareGaScenarios(base, proposed);
  const updateBase = (key: keyof GaScenario, value: number) =>
    setBase((current) => ({ ...current, [key]: value }));
  const updatePlan = (key: keyof typeof plan, value: number) =>
    setPlan((current) => ({ ...current, [key]: value }));
  const sensitivities = [65, 70, 75, 80, 85, 90, 95, 100].map((retention) => ({
    retention,
    delta: compareGaScenarios(base, { ...proposed, retention }).incremental,
  }));
  const maxDelta = Math.max(
    1,
    ...sensitivities.map((row) => Math.abs(row.delta)),
  );

  const download = () => {
    const text = [
      "보험 영업 프로모션 비교 메모",
      "개인 포트폴리오 · 모든 수치 가정 · 실제 한화라이프랩 수수료/실적 아님",
      "관찰 범위: 신규 모집 집단의 13개월 단순 누적 수수료·비용. 공통 고정비·세금·할인 제외.",
      "",
      `기준 계약 ${base.contracts}건 / 유지율 ${base.retention}%`,
      `실행 계약 ${plan.contracts}건 / 유지율 ${plan.retention}% / 판촉비 ${money(plan.campaign)}`,
      `건당 초기 수수료 ${money(base.upfront)} / 유지 수수료 ${money(base.maintenance)}`,
      `건당 설계사 지급 ${money(base.payout)} / 변동 운영비 ${money(base.servicing)} / 해지 건당 GA 순환수 ${money(base.clawback)}`,
      "",
      `기준안 공헌액: ${money(result.before.contribution)}`,
      `실행안 공헌액: ${money(result.after.contribution)}`,
      `증분 공헌액: ${signed(result.incremental)}`,
      `추가 예산 대비 증분 ROI: ${result.incrementalRoi === null ? "계산 불가" : `${result.incrementalRoi.toFixed(1)}%`}`,
      `기준안 도달 계약 수: ${result.breakEvenContracts ?? "현재 단위 공헌액으로 달성 불가"}`,
      `기준안 도달 유지율: ${result.breakEvenRetention === null ? "0~100% 범위에서 달성 불가" : `${result.breakEvenRetention.toFixed(2)}%`}`,
      "",
      "실제 의사결정에는 지점 비교군, 상품별 지급 시점·회차별 환수표·유지 관리비·민원·관찰 만기 확인 필요.",
      "출처·모형 설명: https://kospi-swart.vercel.app/insurance#sources",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "insurance-promotion-scenario.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className={styles.simHeading}>
        <div>
          <h3>판매 확대와 유지관리, 어디에 힘을 실을까</h3>
          <p>
            신규 모집 집단의 13개월을 단순화한 공헌액 비교입니다. 공통
            고정비·세금·현금흐름 할인은 제외하므로 회사의 영업이익과 다릅니다.
          </p>
        </div>
        <button
          className={styles.reset}
          onClick={() => {
            setBase(initialBase);
            setPlan(initialPlan);
          }}
        >
          가정 초기화
        </button>
      </div>
      <div className={styles.presetRow}>
        <span>예시 불러오기</span>
        <button
          onClick={() => {
            setBase(initialBase);
            setPlan(initialPlan);
          }}
        >
          판매 확대 · 유지율 하락
        </button>
        <button
          onClick={() => {
            setBase(initialBase);
            setPlan({ contracts: 110, retention: 92, campaign: 3000000 });
          }}
        >
          유지관리 강화
        </button>
      </div>
      <div className={styles.simGrid}>
        <div className={styles.controls}>
          <fieldset>
            <legend>
              기준안 <small>프로모션 없음</small>
            </legend>
            <div className={styles.inputGrid}>
              <NumberField
                label="기준 계약 수 (건)"
                value={base.contracts}
                onChange={(value) => updateBase("contracts", Math.floor(value))}
              />
              <NumberField
                label="기준 유지율 (%)"
                value={base.retention}
                max={100}
                step={0.5}
                onChange={(value) => updateBase("retention", value)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>
              실행안 <small>바꾸고 싶은 전략</small>
            </legend>
            <div className={styles.inputGrid}>
              <NumberField
                label="실행 계약 수 (건)"
                value={plan.contracts}
                onChange={(value) => updatePlan("contracts", Math.floor(value))}
              />
              <NumberField
                label="실행 유지율 (%)"
                value={plan.retention}
                max={100}
                step={0.5}
                onChange={(value) => updatePlan("retention", value)}
              />
              <NumberField
                label="추가 판촉·관리 예산 (만 원)"
                value={plan.campaign / 10000}
                onChange={(value) => updatePlan("campaign", value * 10000)}
              />
            </div>
          </fieldset>
          <details className={styles.assumptions} open>
            <summary>건당 수수료·비용 가정 조정</summary>
            <p>
              두 안에 동일한 상품 구성을 가정합니다. 아래 금액은 실제 요율이
              아닙니다.
            </p>
            <div className={styles.inputGrid}>
              <NumberField
                label="초기 수수료 수입 (만 원)"
                value={base.upfront / 10000}
                step={1}
                onChange={(value) => updateBase("upfront", value * 10000)}
              />
              <NumberField
                label="유지 건당 추가 수수료 (만 원)"
                value={base.maintenance / 10000}
                onChange={(value) => updateBase("maintenance", value * 10000)}
              />
              <NumberField
                label="설계사 지급액 (만 원)"
                value={base.payout / 10000}
                onChange={(value) => updateBase("payout", value * 10000)}
              />
              <NumberField
                label="변동 운영비 (만 원)"
                value={base.servicing / 10000}
                onChange={(value) => updateBase("servicing", value * 10000)}
              />
              <NumberField
                label="해지 건당 GA 순환수 (만 원)"
                value={base.clawback / 10000}
                onChange={(value) => updateBase("clawback", value * 10000)}
                hint="보험사에 반환한 금액에서 설계사 회수액을 뺀 순부담"
              />
            </div>
          </details>
        </div>
        <div className={styles.results}>
          <div
            className={styles.resultMain}
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              기준안 대비 증분 공헌액 <span>가정 계산</span>
            </p>
            <strong
              className={
                result.incremental >= 0 ? styles.positive : styles.negative
              }
            >
              {signed(result.incremental)}
            </strong>
            <p>
              {result.incremental > 0
                ? "현재 가정에서는 실행안이 기준안보다 더 남습니다."
                : result.incremental < 0
                  ? "현재 가정에서는 실행안이 기준안보다 덜 남습니다."
                  : "현재 가정에서는 두 안의 공헌액이 같습니다."}
            </p>
          </div>
          <div className={styles.resultPair}>
            <div>
              <span>기준안 공헌액</span>
              <b>{money(result.before.contribution)}</b>
            </div>
            <div>
              <span>실행안 공헌액</span>
              <b>{money(result.after.contribution)}</b>
            </div>
          </div>
          <dl className={styles.resultDetails}>
            <div>
              <dt>추가 예산 대비 증분 ROI</dt>
              <dd>
                {result.incrementalRoi === null
                  ? "추가 예산 0 · 계산 불가"
                  : `${result.incrementalRoi.toFixed(1)}%`}
              </dd>
            </div>
            <div>
              <dt>기준안 도달에 필요한 계약 수</dt>
              <dd>
                {result.breakEvenContracts === null
                  ? "현재 건당 공헌액으로 달성 불가"
                  : `${result.breakEvenContracts.toLocaleString("ko-KR")}건`}
              </dd>
            </div>
            <div>
              <dt>현재 계약 수에서 필요한 유지율</dt>
              <dd>
                {result.breakEvenRetention === null
                  ? "0~100%에서 달성 불가"
                  : `${result.breakEvenRetention.toFixed(2)}%`}
              </dd>
            </div>
          </dl>
          <p className={styles.caption}>
            각 도달 기준은 나머지 입력을 고정하고 한 변수만 바꿉니다. ROI는 증분
            공헌액 ÷ 추가 예산이며 투자상품 수익률이 아닙니다.
          </p>
          <div className={styles.sensitivity}>
            <h4>실행안 유지율에 따른 증분 공헌액</h4>
            <p className={styles.caption}>
              중앙선 = 기준안과 같음 · 왼쪽 감소 / 오른쪽 증가
            </p>
            {sensitivities.map((row) => (
              <div className={styles.sensitivityRow} key={row.retention}>
                <span>{row.retention}%</span>
                <div className={styles.barTrack} aria-hidden="true">
                  <i
                    style={{
                      width: `${(Math.abs(row.delta) / maxDelta) * 50}%`,
                      left:
                        row.delta >= 0
                          ? "50%"
                          : `${50 - (Math.abs(row.delta) / maxDelta) * 50}%`,
                      background: row.delta >= 0 ? "#83d8b9" : "#ee9c93",
                    }}
                  />
                </div>
                <b>{signed(row.delta)}</b>
              </div>
            ))}
          </div>
          <button className={styles.download} onClick={download}>
            이 가정과 결과를 메모로 저장 ↓
          </button>
        </div>
      </div>
      <details className={styles.details}>
        <summary>계산식·범위와 실행안 수입·비용 보기</summary>
        <p>
          공헌액 = 계약 수 × [초기 수수료 + 유지율 × 추가 유지 수수료 − (1 −
          유지율) × GA 순환수 − 설계사 지급액 − 변동 운영비] − 추가 판촉·관리
          예산.
        </p>
        <p>
          유지율은 13개월 말 유지 여부를 나타내는 하나의 변수입니다. 실제 회차별
          분급·해지 시점·환수 스케줄을 재현하지 않습니다. 설계사 지급액·운영비는
          모든 신규 계약에 발생한다고 가정하며, 설계사 회수액이 있다면 GA
          순환수에서 차감해 입력합니다. 공통 고정비, 세금, 잔존 계약의 13개월
          이후 가치, 법정 수수료 한도는 계산하지 않습니다.
        </p>
        <dl className={styles.resultDetails}>
          <div>
            <dt>초기 수수료</dt>
            <dd>{money(result.after.newCommission)}</dd>
          </div>
          <div>
            <dt>예상 유지 수수료</dt>
            <dd>{money(result.after.maintenanceCommission)}</dd>
          </div>
          <div>
            <dt>예상 순환수 부담</dt>
            <dd>−{money(result.after.expectedClawback)}</dd>
          </div>
          <div>
            <dt>설계사 지급액</dt>
            <dd>−{money(result.after.distributionCost)}</dd>
          </div>
          <div>
            <dt>변동 운영비</dt>
            <dd>−{money(result.after.servicingCost)}</dd>
          </div>
          <div>
            <dt>추가 판촉·관리 예산</dt>
            <dd>−{money(result.after.campaign)}</dd>
          </div>
        </dl>
      </details>
    </>
  );
}

function InsurerSimulator() {
  const [inputs, setInputs] = useState({
    revenue: 100000000,
    claimsRatio: 70,
    expenseRatio: 25,
    netFinancial: 2000000,
  });
  const result = insurerEconomics(inputs);
  const update = (key: keyof typeof inputs, value: number) =>
    setInputs((current) => ({ ...current, [key]: value }));
  return (
    <>
      <div className={styles.simHeading}>
        <div>
          <h3>보험사는 보장과 자산 운용에서 손익을 만듭니다</h3>
          <p>
            단기 손해보험 포트폴리오의 한 회계기간을 단순화한 설명 모형입니다.
            생명보험 상품의 장기 수익성이나 IFRS 17 정밀 결산을 계산하는 모형은
            아닙니다.
          </p>
        </div>
      </div>
      <div className={styles.simGrid}>
        <div className={styles.controls}>
          <fieldset>
            <legend>
              한 회계기간의 가정 <small>실제 상품 수치 아님</small>
            </legend>
            <div className={styles.inputGrid}>
              <NumberField
                label="인식한 보험수익 (만 원)"
                value={inputs.revenue / 10000}
                max={10000000}
                onChange={(value) => update("revenue", value * 10000)}
                hint="이 기간에 받은 보험료 총액과 구분"
              />
              <NumberField
                label="보험수익 대비 발생손해액 (%)"
                value={inputs.claimsRatio}
                max={200}
                step={0.5}
                onChange={(value) => update("claimsRatio", value)}
              />
              <NumberField
                label="보험수익 대비 기타 서비스비용 (%)"
                value={inputs.expenseRatio}
                max={200}
                step={0.5}
                onChange={(value) => update("expenseRatio", value)}
                hint="해당 기간 인식한 취득비·관리비 등 포함"
              />
              <NumberField
                label="순금융손익 (만 원)"
                value={inputs.netFinancial / 10000}
                min={-10000000}
                max={10000000}
                onChange={(value) => update("netFinancial", value * 10000)}
                hint="투자손익과 보험금융손익 등을 합산한 가정"
              />
            </div>
          </fieldset>
          <div className={styles.insight}>
            <span>비용의 연결</span>
            <p>
              보험사가 GA에 지급하는 판매수수료는 보험사의 취득 현금흐름과
              연결됩니다. 이 모형에서는 해당 기간에 인식한 비용만 기타
              서비스비용에 포함하며, GA 수입을 다시 별도 차감하지 않습니다.
            </p>
          </div>
        </div>
        <div className={styles.results}>
          <div
            className={styles.resultMain}
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              단순화한 기간 손익 <span>가정 계산 · 세전</span>
            </p>
            <strong
              className={result.result >= 0 ? styles.positive : styles.negative}
            >
              {signed(result.result)}
            </strong>
          </div>
          <dl className={styles.resultDetails}>
            <div>
              <dt>인식한 보험수익</dt>
              <dd>{money(result.revenue)}</dd>
            </div>
            <div>
              <dt>발생손해액</dt>
              <dd>−{money(result.claims)}</dd>
            </div>
            <div>
              <dt>기타 보험서비스비용</dt>
              <dd>−{money(result.expenses)}</dd>
            </div>
            <div>
              <dt>보험서비스 결과</dt>
              <dd>{signed(result.serviceResult)}</dd>
            </div>
            <div>
              <dt>순금융손익</dt>
              <dd>{signed(result.netFinancial)}</dd>
            </div>
            <div>
              <dt>모형상 손해·비용 비율 합계</dt>
              <dd>
                {result.combinedRatio === null
                  ? "보험수익 0 · 계산 불가"
                  : `${result.combinedRatio.toFixed(1)}%`}
              </dd>
            </div>
          </dl>
          <p className={styles.caption}>
            재보험·기타 손익·세금은 제외했습니다. 실제 공시의 합산비율과는
            범위·산식이 다를 수 있습니다.
          </p>
        </div>
      </div>
      <div className={styles.conceptGrid}>
        <article>
          <h4>보험료 ≠ 당기 보험수익</h4>
          <p>
            받은 보험료 모두를 즉시 수익으로 잡지 않습니다. 보험서비스를
            제공하는 기간에 맞춰 수익을 인식하고, 투자요소는 보험수익에서
            제외합니다.
          </p>
        </article>
        <article>
          <h4>CSM ≠ 당장 남는 현금</h4>
          <p>
            보험계약마진(CSM)은 향후 서비스 제공에 따라 인식할 미실현
            이익입니다. 잔액 자체를 당기 이익이나 GA 수수료로 해석할 수
            없습니다.
          </p>
        </article>
        <article>
          <h4>상품 마진에는 더 많은 자료가 필요</h4>
          <p>
            장기 상품은 위험률·해지율·사업비·금리와 현금흐름 시점에 영향을
            받습니다. 단기 모형의 이익률을 종신·연금보험에 적용하지 않습니다.
          </p>
        </article>
      </div>
      <p className={styles.caption}>
        개념 출처:{" "}
        <a
          href="https://www.ifrs.org/issued-standards/list-of-standards/ifrs-17-insurance-contracts/"
          target="_blank"
          rel="noreferrer"
        >
          IFRS Foundation · IFRS 17 ↗
        </a>
      </p>
    </>
  );
}
