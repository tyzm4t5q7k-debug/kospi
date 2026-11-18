"use client";

import { useState } from "react";
import {
  defaultSiteScenario,
  siteEconomics,
  validateSiteScenario,
  sampleSettlements,
  settlementChecks,
  settlementReview,
  siteAnalysisText,
  type SiteScenario,
  type SiteResult,
  type SettlementCheck,
} from "../../lib/construction-economics";
import styles from "./construction.module.css";

const number = (n: number) =>
  n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
const presets = [
  { id: "base", label: "기준", change: 0, delay: 0 },
  { id: "cost", label: "자재 +10%", change: 10, delay: 0 },
  { id: "delay", label: "수금 1개월 지연", change: 0, delay: 1 },
  { id: "both", label: "원가 상승 + 수금 지연", change: 10, delay: 1 },
];
const fields: {
  key: keyof SiteScenario;
  label: string;
  unit: string;
  help: string;
  min: number;
  max: number;
}[] = [
  {
    key: "contract",
    label: "도급금액",
    unit: "억 원",
    help: "발주처에서 받을 총 공사대금",
    min: 0.01,
    max: 1000,
  },
  {
    key: "budget",
    label: "기준 공사원가",
    unit: "억 원",
    help: "이 모델의 현장 비용 합계",
    min: 0,
    max: 1000,
  },
  {
    key: "exposedMaterials",
    label: "가격변동 대상 자재비",
    unit: "억 원",
    help: "원가에 포함된 미발주 자재 예산",
    min: 0,
    max: 1000,
  },
  {
    key: "openingCash",
    label: "기초 가용자금",
    unit: "억 원",
    help: "공사 시작 전에 사용 가능한 자금",
    min: 0,
    max: 1000,
  },
  {
    key: "materialChange",
    label: "자재 가격 변화율",
    unit: "%",
    help: "변동 대상 자재에만 적용",
    min: -100,
    max: 100,
  },
];

function CashChart({
  baseline,
  scenario,
}: {
  baseline: SiteResult;
  scenario: SiteResult;
}) {
  const count = scenario.rows.length;
  const baseValues = Array.from({ length: count + 1 }, (_, i) =>
    i === 0
      ? baseline.rows[0].opening
      : (baseline.rows[i - 1]?.cash ?? baseline.finalCash),
  );
  const values = [
    scenario.rows[0].opening,
    ...scenario.rows.map((r) => r.cash),
  ];
  const low = Math.min(0, ...baseValues, ...values);
  const high = Math.max(1, ...baseValues, ...values);
  const padding = Math.max((high - low) * 0.15, 1);
  const bottom = low - padding;
  const top = high + padding;
  const x = (i: number) => 58 + (i * 680) / count;
  const y = (n: number) => 28 + ((top - n) * 200) / (top - bottom);
  const line = (nums: number[]) =>
    nums.map((n, i) => `${x(i)},${y(n)}`).join(" ");
  const ticks = [low, (low + high) / 2, high];
  return (
    <div className={styles.chart}>
      <div className={styles.chartHeading}>
        <h3>월말 가용자금의 변화</h3>
        <span>추가 조달 전 · 억 원</span>
      </div>
      <svg
        viewBox="0 0 780 280"
        role="img"
        aria-label={`기준과 현재 시나리오의 월말 자금 비교. 현재 최대 추가 필요자금 ${number(scenario.peakFunding)}억 원. 아래 월별 표에서 값을 확인할 수 있습니다.`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1="58" y1={y(t)} x2="738" y2={y(t)} stroke="#30434e" />
            <text
              x="46"
              y={y(t) + 4}
              textAnchor="end"
              fill="#aabcc6"
              fontSize="11"
            >
              {number(t)}
            </text>
          </g>
        ))}
        <line
          x1="58"
          y1={y(0)}
          x2="738"
          y2={y(0)}
          stroke="#e6b86e"
          strokeDasharray="4 5"
        />
        <polyline
          points={line(baseValues)}
          fill="none"
          stroke="#91a8b6"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <polyline
          points={line(values)}
          fill="none"
          stroke="#6ee7ce"
          strokeWidth="3"
        />
        {values.map((n, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(n)}
              r="4"
              fill={n < 0 ? "#f1b978" : "#6ee7ce"}
            />
            <text
              x={x(i)}
              y="253"
              textAnchor="middle"
              fill="#b4c4cd"
              fontSize="11"
            >
              {i === 0 ? "시작" : `M${i}`}
            </text>
          </g>
        ))}
      </svg>
      <p className={styles.legend}>
        <span>━━ 현재 시나리오</span>
        <span>┄┄ 기준</span>
        <span>┄┄ 자금 0선</span>
      </p>
    </div>
  );
}

export function ConstructionLab() {
  const [input, setInput] = useState<Record<keyof SiteScenario, string>>(
    () =>
      Object.fromEntries(
        Object.entries(defaultSiteScenario).map(([k, v]) => [k, String(v)]),
      ) as Record<keyof SiteScenario, string>,
  );
  const [items, setItems] = useState(() =>
    sampleSettlements.map((item) => ({ ...item })),
  );
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [notice, setNotice] = useState("");
  const scenario = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [
      k,
      v.trim() === "" ? NaN : Number(v),
    ]),
  ) as SiteScenario;
  const errors = validateSiteScenario(scenario);
  const result = errors.length ? null : siteEconomics(scenario);
  const baseline = errors.length
    ? null
    : siteEconomics({ ...scenario, materialChange: 0, receiptDelay: 0 });
  const review = result
    ? settlementReview(items, result.rows[2].payment)
    : null;

  function reset() {
    setInput(
      Object.fromEntries(
        Object.entries(defaultSiteScenario).map(([k, v]) => [k, String(v)]),
      ) as Record<keyof SiteScenario, string>,
    );
    setItems(sampleSettlements.map((item) => ({ ...item })));
    setFilter("all");
    setNotice("기준 가정과 정산 점검을 초기화했습니다.");
  }
  function toggle(id: string, key: SettlementCheck) {
    setItems((old) =>
      old.map((item) =>
        item.id === id ? { ...item, [key]: !item[key] } : item,
      ),
    );
    setNotice("가상 점검 상태를 변경했습니다. 지급계획은 유지됩니다.");
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", siteAnalysisText(scenario, items)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "gs-field-analysis.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "현재 가정·월별 결과·정산 상태를 담은 분석 메모를 다운로드했습니다.",
    );
  }

  return (
    <>
      <section className={styles.section} id="simulation">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>01 / COST & CASH FLOW</p>
            <h2>같은 현장, 달라지는 자금계획</h2>
          </div>
          <button className={styles.secondary} onClick={reset}>
            기준 예시로 초기화
          </button>
        </div>
        <p className={styles.intro}>
          조건을 바꾸면 예상 공사손익과 자금 부족 시점이 함께 계산됩니다. 기준
          비교는 같은 도급금액·원가·기초자금에 가격 변화와 수금 지연을 0으로
          둡니다.
        </p>
        <div
          className={styles.presetBar}
          role="group"
          aria-label="비교 시나리오"
        >
          {presets.map((p) => (
            <button
              key={p.id}
              aria-pressed={
                scenario.materialChange === p.change &&
                scenario.receiptDelay === p.delay
              }
              onClick={() => {
                setInput((old) => ({
                  ...old,
                  materialChange: String(p.change),
                  receiptDelay: String(p.delay),
                }));
                setNotice(`${p.label} 시나리오를 적용했습니다.`);
              }}
            >
              {p.label}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
        <div className={styles.labGrid}>
          <div className={styles.assumptions}>
            <div className={styles.panelTop}>
              <h3>가정 설정</h3>
              <span>직접 입력 가능</span>
            </div>
            <div className={styles.fieldGrid}>
              {fields.map((f) => (
                <label
                  className={styles.field}
                  key={f.key}
                  htmlFor={`site-${f.key}`}
                >
                  <span>
                    {f.label}
                    <small>{f.unit}</small>
                  </span>
                  <input
                    id={`site-${f.key}`}
                    type="number"
                    min={f.min}
                    max={f.max}
                    step="any"
                    value={input[f.key]}
                    aria-describedby={`help-${f.key}`}
                    onChange={(e) => {
                      setInput((old) => ({ ...old, [f.key]: e.target.value }));
                      setNotice("");
                    }}
                  />
                  <small id={`help-${f.key}`}>{f.help}</small>
                </label>
              ))}
              <label className={styles.field} htmlFor="site-receiptDelay">
                <span>
                  수금 지연<small>개월</small>
                </span>
                <select
                  id="site-receiptDelay"
                  value={input.receiptDelay}
                  onChange={(e) => {
                    setInput((old) => ({
                      ...old,
                      receiptDelay: e.target.value,
                    }));
                    setNotice("");
                  }}
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "없음 · 기준 일정" : `${n}개월 지연`}
                    </option>
                  ))}
                </select>
                <small>지급일 유지 · 늦어진 수금 전액 회수</small>
              </label>
            </div>
            <p className={styles.caption}>
              모든 금액은 가상이며 억 원 단위입니다. 미발주 자재비는 기준 원가에
              이미 포함되어 있고, 가격 차액만 추가 반영합니다.
            </p>
          </div>
          <div className={styles.resultArea}>
            {errors.length ? (
              <div role="alert" className={styles.error}>
                <h3>입력값을 확인해 주세요</h3>
                {errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
                <p>유효한 값이 입력되면 결과가 다시 표시됩니다.</p>
              </div>
            ) : result && baseline ? (
              <>
                <div
                  className={styles.metrics}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <article>
                    <span>예상 공사손익</span>
                    <strong className={result.profit < 0 ? styles.amber : ""}>
                      {number(result.profit)}
                      <small>억</small>
                    </strong>
                    <p>
                      기준 {number(baseline.profit)}억 · 금융비용 등 차감 전
                    </p>
                  </article>
                  <article>
                    <span>최대 추가 필요자금</span>
                    <strong
                      className={result.peakFunding > 0 ? styles.amber : ""}
                    >
                      {number(result.peakFunding)}
                      <small>억</small>
                    </strong>
                    <p>
                      기준 {number(baseline.peakFunding)}억 · 월말 잔액 기준
                    </p>
                  </article>
                  <article>
                    <span>처음 자금이 부족한 시점</span>
                    <strong>
                      {result.firstShortfall
                        ? `M${result.firstShortfall}`
                        : "없음"}
                    </strong>
                    <p>
                      {result.peakFunding > 0
                        ? `최대 부족 시점 M${result.peakMonth}`
                        : "설정 조건의 월말 잔액 0 이상"}
                    </p>
                  </article>
                </div>
                <CashChart baseline={baseline} scenario={result} />
                <div className={styles.finding}>
                  <span>현재 조건의 해석</span>
                  <p>
                    자재 가격 변화로 원가는{" "}
                    <b>{number(result.costChange)}억 원</b> 증감합니다.{" "}
                    {scenario.receiptDelay > 0
                      ? `수금 ${scenario.receiptDelay}개월 지연은 이 모델의 공사손익을 바꾸지 않으며, M6 미수금 ${number(result.unpaidAtCompletion)}억 원은 이후 회수합니다.`
                      : "수금은 기준 일정대로 들어옵니다."}{" "}
                    {result.peakFunding > 0
                      ? `최대 ${number(result.peakFunding)}억 원의 추가 자금 확보를 검토해야 합니다.`
                      : "월말 기준 추가 필요자금은 없습니다."}
                  </p>
                  <p className={styles.caption}>
                    금융비용·월중 부족·회수 실패를 제외한 조건부 결과입니다.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
        {result && baseline ? (
          <>
            <details className={styles.method}>
              <summary>
                월별 수금·지급 내역 확인 · M1~M{result.rows.length}
              </summary>
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="월별 자금계획 표"
              >
                <table>
                  <caption>추가 자금 조달 전 잔액 · 단위 억 원</caption>
                  <thead>
                    <tr>
                      <th scope="col">월</th>
                      <th scope="col">기준 수금</th>
                      <th scope="col">변경 수금</th>
                      <th scope="col">기준 지급</th>
                      <th scope="col">자재 증감</th>
                      <th scope="col">총 지급</th>
                      <th scope="col">월말 잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.month}>
                        <th scope="row">M{r.month}</th>
                        <td>{number(r.plannedReceipt)}</td>
                        <td>{number(r.receipt)}</td>
                        <td>{number(r.basePayment)}</td>
                        <td>{number(r.additionalPayment)}</td>
                        <td>{number(r.payment)}</td>
                        <td className={r.cash < 0 ? styles.amber : ""}>
                          {number(r.cash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <div className={styles.sensitivity}>
              <div>
                <p className={styles.eyebrow}>SENSITIVITY CHECK</p>
                <h3>원가와 지연을 나눠 보면</h3>
                <p>
                  현재 도급금액·원가·자재비·기초자금을 고정하고 두 요인만
                  바꿉니다. 각 칸은 <b>최대 추가 필요자금</b>입니다.
                </p>
                <p className={styles.caption}>
                  현재 선택 결과와 별개인 12개 비교 조건 · 억 원
                </p>
              </div>
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="가격 변화와 수금 지연 민감도 표"
              >
                <table>
                  <caption>
                    가격 변화율별 공사손익과 수금 지연별 필요자금
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">자재 가격</th>
                      <th scope="col">공사손익</th>
                      <th scope="col">지연 없음</th>
                      <th scope="col">1개월</th>
                      <th scope="col">2개월</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 5, 10, 15].map((change) => (
                      <tr key={change}>
                        <th scope="row">+{change}%</th>
                        <td>
                          {number(
                            siteEconomics({
                              ...scenario,
                              materialChange: change,
                              receiptDelay: 0,
                            }).profit,
                          )}
                        </td>
                        {[0, 1, 2].map((delay) => {
                          const r = siteEconomics({
                            ...scenario,
                            materialChange: change,
                            receiptDelay: delay,
                          });
                          return (
                            <td
                              key={delay}
                              className={r.peakFunding > 0 ? styles.amber : ""}
                            >
                              {number(r.peakFunding)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.section} id="settlement">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>02 / SETTLEMENT REVIEW</p>
            <h2>지급계획을, 확인할 업무로</h2>
          </div>
          <span className={styles.tag}>가상 점검 기준일 M3 · 8일</span>
        </div>
        <p className={styles.intro}>
          위 시나리오의{" "}
          <b>
            M3 지급계획{" "}
            {result ? `${number(result.rows[2].payment)}억 원` : "—"}
          </b>
          을 네 업무 묶음으로 연결했습니다. 기성 확인자료·청구 증빙·계약 대조를
          체크해 담당자와 협의할 항목을 정리해 보세요.
        </p>
        {review ? (
          <>
            <div className={styles.reviewSummary} aria-live="polite">
              <span>
                미완료 <b>{review.unresolvedCount}건</b>
              </span>
              <span>
                점검 대상 <b>{number(review.reviewAmount)}억 원</b>
              </span>
              <span>
                7일 내 지급예정 중 미완료 <b>{review.urgentCount}건</b>
              </span>
            </div>
            <div
              className={styles.filter}
              role="group"
              aria-label="정산 항목 필터"
            >
              <button
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                전체 4건
              </button>
              <button
                aria-pressed={filter === "pending"}
                onClick={() => setFilter("pending")}
              >
                미완료만
              </button>
            </div>
            <div className={styles.settlementGrid}>
              {review.rows
                .filter((r) => filter === "all" || r.missing.length > 0)
                .map((row) => (
                  <article key={row.id} className={styles.settlementCard}>
                    <div className={styles.panelTop}>
                      <span>
                        {row.vendor} · {row.work}
                      </span>
                      <span className={row.urgent ? styles.urgent : styles.tag}>
                        {row.missing.length === 0
                          ? "점검 완료(가상)"
                          : row.urgent
                            ? "기일 임박 · 확인 필요"
                            : "확인 필요"}
                      </span>
                    </div>
                    <div className={styles.payment}>
                      <strong>
                        {number(row.amount)}
                        <small>억 원</small>
                      </strong>
                      <span>지급예정 M3 · {row.dueDay}일</span>
                    </div>
                    <fieldset>
                      <legend>{row.vendor} 정산 확인</legend>
                      {settlementChecks.map((check) => (
                        <label key={check.key}>
                          <input
                            type="checkbox"
                            checked={row[check.key]}
                            onChange={() => toggle(row.id, check.key)}
                          />
                          {check.label}
                        </label>
                      ))}
                    </fieldset>
                    <p>
                      <b>협의</b> {row.owner}
                    </p>
                    <p>
                      <b>다음 확인</b>{" "}
                      {row.missing.length
                        ? row.evidence
                        : "자료 점검 완료. 권한자의 검토·승인 절차 확인."}
                    </p>
                  </article>
                ))}
            </div>
            {filter === "pending" && review.unresolvedCount === 0 ? (
              <p className={styles.finding}>
                모든 가상 항목의 점검이 완료되었습니다. 실제 승인·지급은
                실행되지 않습니다.
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.error}>
            시뮬레이터의 입력값을 수정하면 연계 금액이 표시됩니다.
          </p>
        )}
        <p className={styles.caption}>
          금액은 소수 둘째 자리로 반올림해 표시하므로 표시값의 합계에 차이가 날
          수 있습니다. 체크 상태는 새로고침 시 초기화됩니다. 점검 대상 금액은
          손실·절감액·지급 보류액을 뜻하지 않습니다. 체크를 바꿔도 지급계획은
          자동 연기되지 않습니다.
        </p>
        <div className={styles.actionPlan}>
          <div>
            <h3>숫자를 확인한 다음에는</h3>
            <p>
              ① 수금 예정일·변경 사유 확인 → ② 기성·정산 자료 대조 → ③ 본사
              재경과 필요자금 협의 → ④ 담당자·기한을 정해 추적
            </p>
          </div>
          <button
            className={styles.primary}
            disabled={!result}
            onClick={download}
          >
            현재 분석 메모 내려받기 ↓
          </button>
        </div>
        <p className={styles.status} role="status">
          {notice}
        </p>
      </section>
    </>
  );
}
