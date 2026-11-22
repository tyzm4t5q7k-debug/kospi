import {
  closingStatements,
  deferredTaxAsset2025,
  disclosuresReviewedAt,
  paidInCapital2025,
  retentionEvidence,
} from "../../lib/insurance-disclosures";
import styles from "./insurance.module.css";

const eok = (value: number) =>
  (value / 100000000).toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const percent = (value: number) => `${value.toFixed(1)}%`;

export function EvidenceGuide() {
  return (
    <aside className={styles.evidenceGuide} aria-label="자료와 가정 구분">
      <a href="#disclosures" className={styles.officialEvidence}>
        <strong>공식 원문 확인</strong>
        <span>2023~2025년 결산공고의 실제 재무 수치</span>
      </a>
      <a href="#retention" className={styles.secondaryEvidence}>
        <strong>2차 자료 확인</strong>
        <span>손익 집계 · 2026년 상반기 공시 분석 보도</span>
      </a>
      <a href="#simulation" className={styles.simulatedEvidence}>
        <strong>가정 기반 시뮬레이션</strong>
        <span>직접 바꾸는 예시 입력값 · 실제 회사 수익 예측 아님</span>
      </a>
    </aside>
  );
}

export function ClosingAnalysis() {
  const current = closingStatements[2];
  const previous = closingStatements[1];
  const rows = [
    {
      label: "총자산",
      values: closingStatements.map((row) => eok(row.assets)),
    },
    {
      label: "총부채",
      values: closingStatements.map((row) => eok(row.liabilities)),
    },
    {
      label: "자기자본",
      values: closingStatements.map((row) => eok(row.equity)),
    },
    {
      label: "이익잉여금 (음수는 누적결손)",
      values: closingStatements.map((row) => eok(row.retainedEarnings)),
    },
    {
      label: "현금·현금성자산 + 단기금융상품",
      values: closingStatements.map((row) =>
        eok(row.cash + row.shortTermDeposits),
      ),
    },
    {
      label: "부채비율",
      values: closingStatements.map((row) =>
        percent((row.liabilities / row.equity) * 100),
      ),
    },
    {
      label: "유동비율",
      values: closingStatements.map((row) =>
        percent((row.currentAssets / row.currentLiabilities) * 100),
      ),
    },
  ];
  return (
    <section
      id="disclosures"
      className={`${styles.section} ${styles.evidenceSection}`}
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>02 / OFFICIAL DISCLOSURES</p>
          <h2>결산공고로 읽는 재무 체력</h2>
        </div>
        <span className={styles.officialBadge}>공식 원문 · 재무상태표</span>
      </div>
      <p className={styles.sectionIntro}>
        한화라이프랩 제19~21기 결산공고를 직접 확인했습니다. 금액은 원문을 억
        원으로 환산했고, 비율은 아래 산식으로 계산했습니다. 회사가 발표한 수치와
        작성자의 해석을 구분합니다.
      </p>
      <p className={styles.evidenceNotice}>
        <strong>실적 기준일과 발표일은 다릅니다.</strong> 제21기 공고는 2026년
        3월 23일 발표한 2025년 12월 31일 기준 자료입니다.{" "}
        {disclosuresReviewedAt} 확인 기준, 이 페이지에 반영한 최신 연간 결산은
        2025년입니다. 2026년 연간 결산으로 표시하지 않습니다.
      </p>
      <div
        className={styles.tableWrap}
        role="region"
        aria-label="연도별 결산 비교표"
        tabIndex={0}
      >
        <table>
          <caption>
            공식 결산공고 비교 · 각 연도 12월 31일 기준 · 금액: 억 원 / 비율: %
          </caption>
          <thead>
            <tr>
              <th scope="col">항목</th>
              {closingStatements.map((row) => (
                <th scope="col" key={row.year}>
                  {row.year}년
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={closingStatements[index].year}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.evidenceNote}>
        부채비율 = 총부채 ÷ 자기자본 × 100 · 유동비율 = 유동자산 ÷ 유동부채 ×
        100. 총부채는 차입금과 같은 뜻이 아닙니다. 현금과 단기금융상품
        합계만으로 실제 영업현금흐름을 알 수는 없습니다.
      </p>
      <div className={styles.analysisGrid}>
        <article>
          <span className={styles.interpretationLabel}>
            작성자 해석 · 개선 흐름
          </span>
          <h3>자기자본과 유동성 여력이 확대</h3>
          <p>
            2025년 자기자본은 {eok(previous.equity)}억 원에서{" "}
            {eok(current.equity)}억 원으로 약{" "}
            {((current.equity / previous.equity - 1) * 100).toFixed(0)}%
            늘었습니다. 현금·단기금융상품 합계도{" "}
            {eok(previous.cash + previous.shortTermDeposits)}억 원에서
            {eok(current.cash + current.shortTermDeposits)}억 원으로 증가했고,
            부채비율은 전년보다 낮아졌습니다.
          </p>
        </article>
        <article>
          <span className={styles.interpretationLabel}>
            작성자 해석 · 함께 볼 항목
          </span>
          <h3>누적결손과 이익의 원인 확인</h3>
          <p>
            자기자본은 자본금 {eok(paidInCapital2025)}억 원을 넘어섰지만
            누적결손
            {eok(-current.retainedEarnings)}억 원은 남아 있습니다. 이 숫자는
            2025년 한 해의 적자가 아닙니다. 새로 표시된 이연법인세자산{" "}
            {eok(deferredTaxAsset2025)}억 원은 미래 세금 절감 효과를 인식한
            회계상 자산으로, 현금 유입과 구분해야 합니다.
          </p>
        </article>
      </div>
      <details className={styles.details}>
        <summary>이 결산공고만으로 알 수 없는 것은?</summary>
        <p>
          재무상태표 중심의 공고이므로 실제 영업현금흐름, 당기손익의 세부 원인,
          이연법인세자산의 인식 근거, 상품·지점별 수익성은
          손익계산서·현금흐름표·주석과 내부 자료가 필요합니다. 특정 지표가
          좋아졌다는 사실만으로 회사 전체의 안전성이나 미래 수익을 확정하지
          않습니다.
        </p>
      </details>
      <div className={styles.evidenceLinks} aria-label="공식 결산공고 원문">
        {closingStatements.map((row) => (
          <a href={row.url} target="_blank" rel="noreferrer" key={row.year}>
            {row.period} · {row.year}년 원문{" "}
            <small>발표 {row.publishedAt}</small>
          </a>
        ))}
      </div>
      <p className={styles.evidenceNote}>
        원문 확인 {disclosuresReviewedAt} · 수동 업데이트
      </p>
    </section>
  );
}

export function RetentionAnalysis() {
  return (
    <section
      id="retention"
      className={`${styles.section} ${styles.evidenceSection}`}
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>04 / RETENTION REVIEW</p>
          <h2>2026년 상반기, 계약은 얼마나 유지됐을까</h2>
        </div>
        <span className={styles.secondaryBadge}>2차 자료 · 공시 분석 보도</span>
      </div>
      <p className={styles.sectionIntro}>
        {retentionEvidence.scope}에서 한화라이프랩 수치를 확인했습니다. 아래
        값은 가정값이 아니지만, 협회 공시 원문과 직접 대조하지 않은 보도
        수치입니다.{" "}
        <a href={retentionEvidence.url} target="_blank" rel="noreferrer">
          {retentionEvidence.publisher} 기사 확인
        </a>
        <span className={styles.sourceMeta}>
          기사 표시일 {retentionEvidence.publishedAt} · 확인일{" "}
          {disclosuresReviewedAt}
        </span>
      </p>
      <div
        className={styles.tableWrap}
        role="region"
        aria-label="상반기 유지율 비교표"
        tabIndex={0}
      >
        <table>
          <caption>
            한화라이프랩 계약 유지율 · 같은 상반기끼리 비교 · 증감은
            %p(퍼센트포인트)
          </caption>
          <thead>
            <tr>
              <th scope="col">지표</th>
              <th scope="col">2025년 상반기</th>
              <th scope="col">2026년 상반기</th>
              <th scope="col">전년 동기 대비</th>
            </tr>
          </thead>
          <tbody>
            {retentionEvidence.rows.map((row) => {
              const change = row.current - row.previous;
              return (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.previous.toFixed(2)}%</td>
                  <td>{row.current.toFixed(2)}%</td>
                  <td
                    className={change >= 0 ? styles.positive : styles.negative}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%p · {change >= 0 ? "상승" : "하락"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.evidenceNote}>
        같은 보도 기준 설계사 수:{" "}
        {retentionEvidence.previousAgents.toLocaleString("ko-KR")}명 →{" "}
        {retentionEvidence.currentAgents.toLocaleString("ko-KR")}명 (+
        {(
          (retentionEvidence.currentAgents / retentionEvidence.previousAgents -
            1) *
          100
        ).toFixed(1)}
        %). 조직 규모 확대만으로 생산성 개선을 판단하지 않습니다.
      </p>
      <div className={styles.insight}>
        <span>작성자 해석 · 영업관리에서 볼 질문</span>
        <p>
          13회차는 낮아지고 25회차는 높아졌습니다. 전체 계약의 질이 일괄
          개선됐다고 보기보다, 가입 시기·상품·채널별로 원인을 나눠 확인할 필요가
          있습니다. 두 회차는 가입 시점이 다른 계약 집단이므로 같은 계약이
          중간에 회복됐다는 뜻이 아닙니다. 이 수치만으로 특정 프로모션의 효과나
          하락 원인을 단정할 수 없습니다.
        </p>
      </div>
      <p className={styles.evidenceNotice}>
        <strong>공개 수치와 가정은 별도로 사용합니다.</strong> 아래 실험실의
        기본 유지율 85%·80%는 예시 가정이며, 이 표에서 가져온 값이 아닙니다.
        공시 유지율의 산식·대상과 실험실의 단순 계약 수 기준 유지 비중도 같다고
        전제하지 않습니다.
      </p>
    </section>
  );
}
