import type { Metadata } from "next";
import Link from "next/link";
import {
  businessLines,
  companyFinancials,
  insuranceSources,
  managementKpis,
  reviewedAt,
  sourceUrl,
} from "../../lib/insurance-research";
import { InsuranceSimulator } from "./insurance-simulator";
import styles from "./insurance.module.css";

export const metadata: Metadata = {
  title: "보험사업 분석 · 한화라이프랩 | 김승현",
  description:
    "한화라이프랩의 판매 영역과 GA 수익구조를 살펴보고, 유지율·수수료·프로모션 비용의 영향을 비교하는 영업관리·마케팅 포트폴리오.",
};

const eok = (value: number) =>
  (value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 });

export default function InsurancePage() {
  const [previous, current] = companyFinancials;
  const growth = (current.revenue / previous.revenue - 1) * 100;
  return (
    <main className={styles.app}>
      <a className={styles.skip} href="#insurance-content">
        본문 바로가기
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark}>K.</span>
          <span>
            김승현 <small>FINANCE & DATA</small>
          </span>
        </Link>
        <nav aria-label="주요 메뉴">
          <Link href="/">포트폴리오</Link>
          <Link href="/construction">GS건설 현장관리</Link>
          <Link href="/stocks">국내 주식</Link>
          <Link href="/insurance" aria-current="page">
            보험사업 분석
          </Link>
        </nav>
      </header>

      <div className={styles.container} id="insurance-content">
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              INSURANCE BUSINESS RESEARCH <span>CASE 04</span>
            </p>
            <h1>
              판매의 성장에서,
              <br />
              <em>남는 가치까지.</em>
            </h1>
            <p className={styles.lede}>
              한화라이프랩의 사업을 영업관리·마케팅·전략의 관점으로 읽습니다.
              <br />
              무엇을 판매하고, 어디에서 수익이 생기며, 어떤 성장을 선택할까요?
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#simulation">
                프로모션 비교해 보기 <span aria-hidden="true">↗</span>
              </a>
              <a className={styles.secondary} href="#products">
                판매 영역 살펴보기
              </a>
            </div>
            <p className={styles.caption}>
              김승현의 개인 분석 포트폴리오 · 한화라이프랩 공식 서비스 아님 ·
              자료 확인 {reviewedAt}
            </p>
          </div>
          <aside
            className={styles.heroDiagram}
            aria-label="보험 거래와 수익의 흐름"
          >
            <p className={styles.eyebrow}>ONE CONTRACT, TWO BUSINESSES</p>
            <div className={styles.flowRow}>
              <b>고객</b>
              <span>보장 필요 · 보험료 납입</span>
            </div>
            <div className={styles.flowArrow}>
              ↓ 보험계약 · 보험료는 보험사에
            </div>
            <div className={styles.flowRow}>
              <b>보험사</b>
              <span>상품 설계 · 위험 인수 · 보험금 지급</span>
            </div>
            <div className={styles.flowArrow}>↓ 판매·유지관리 대가</div>
            <div className={`${styles.flowRow} ${styles.highlight}`}>
              <b>
                한화라이프랩 <small>GA</small>
              </b>
              <span>상품 비교·판매 · 고객 관리 · 영업 지원</span>
            </div>
            <p>
              같은 계약이라도 <strong>GA의 판매 수익</strong>과<br />
              <strong>보험사의 위험 인수 손익</strong>은 따로 봅니다.
            </p>
          </aside>
        </section>

        <nav className={styles.sectionNav} aria-label="보험사업 분석 목차">
          <a href="#products">01 판매 영역</a>
          <a href="#financials">02 회사 실적</a>
          <a href="#simulation">03 수익 실험실</a>
          <a href="#strategy">04 영업전략</a>
          <a href="#sources">출처·한계</a>
        </nav>

        <section id="products" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>01 / BUSINESS MAP</p>
              <h2>무엇을 판매하는 회사인가</h2>
            </div>
            <span className={styles.tag}>공식 사업 영역 확인</span>
          </div>
          <p className={styles.sectionIntro}>
            한화라이프랩은 생명·손해·보증보험을 취급하는 보험대리점입니다.
            아래의 상품군은 사업 이해를 위한 분류이며, 개별 상품의 현재 판매
            여부는 제휴·인수 조건에 따라 확인해야 합니다.
          </p>
          <div className={styles.productGrid}>
            {businessLines.map((line) => (
              <article className={styles.productCard} key={line.source}>
                <div className={styles.cardNumber}>
                  {line.number}
                  <span>{line.english}</span>
                </div>
                <h3>{line.title}</h3>
                <p>{line.description}</p>
                <p className={styles.family}>{line.families}</p>
                <dl>
                  <dt>영업관리에서 볼 것</dt>
                  <dd>{line.management}</dd>
                  <dt>수익성에서 볼 것</dt>
                  <dd>{line.economics}</dd>
                </dl>
                <p className={styles.caption}>{line.partners}</p>
                <a
                  className={styles.textLink}
                  href={sourceUrl(line.source)}
                  target="_blank"
                  rel="noreferrer"
                >
                  공식 사업 소개 ↗
                </a>
              </article>
            ))}
          </div>
          <details className={styles.details}>
            <summary>
              개별 보험상품명과 실제 판매 마진은 어디까지 확인했나요?
            </summary>
            <p>
              공식 사업 소개에서 판매 영역과 게시된 제휴사를 확인했습니다. 다만
              현재 한화라이프랩에서 판매 가능한 상품명·상품코드·버전의 전체
              목록, 보험사와 체결한 수수료 약정, 상품별 원가 배분 자료는
              확보하지 못했습니다. 제휴사의 다이렉트 상품을 이 회사의 판매
              상품으로 표시하지 않았습니다.
            </p>
            <p>
              실무에서는{" "}
              <strong>
                상품 마스터(보험사·상품코드·판매기간) → 수수료 및 환수 규정 →
                계약별 지급·유지 내역 → 비용 배분
              </strong>
              을 연결해야 실제 상품별 공헌이익을 계산할 수 있습니다. 보험사의
              상품 수익성에는 별도로 위험률·사업비·해지율·할인율 등의 자료가
              필요합니다.
            </p>
          </details>
        </section>

        <section id="financials" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / COMPANY ECONOMICS</p>
              <h2>회사 전체는 얼마나 남겼을까</h2>
            </div>
            <span className={styles.tag}>2025 결산 · 2차 집계</span>
          </div>
          <p className={styles.sectionIntro}>
            사람인에 게시된 NICE평가정보의 회사 전체 수치입니다. 특정 상품의
            이익률이나 GA 수수료율을 의미하지 않습니다.{" "}
            <a href={sourceUrl("finance")} target="_blank" rel="noreferrer">
              재무 집계 출처 ↗
            </a>
          </p>
          <div className={styles.metrics}>
            <div>
              <p>매출액</p>
              <strong>
                {eok(current.revenue)}
                <small>억 원</small>
              </strong>
              <span>2024년 대비 +{growth.toFixed(1)}%</span>
            </div>
            <div>
              <p>영업이익</p>
              <strong>
                {eok(current.operating)}
                <small>억 원</small>
              </strong>
              <span>
                영업이익률{" "}
                {((current.operating / current.revenue) * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <p>당기순이익</p>
              <strong>
                {eok(current.net)}
                <small>억 원</small>
              </strong>
              <span>
                순이익률 {((current.net / current.revenue) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <caption>
                한화라이프랩 회사 전체 실적 비교 · 금액 단위: 억 원
              </caption>
              <thead>
                <tr>
                  <th scope="col">결산연도</th>
                  <th scope="col">매출</th>
                  <th scope="col">영업이익</th>
                  <th scope="col">영업이익률</th>
                  <th scope="col">당기순이익</th>
                </tr>
              </thead>
              <tbody>
                {companyFinancials.map((row) => (
                  <tr key={row.year}>
                    <th scope="row">{row.year}</th>
                    <td>{eok(row.revenue)}</td>
                    <td>{eok(row.operating)}</td>
                    <td>{((row.operating / row.revenue) * 100).toFixed(2)}%</td>
                    <td>{eok(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.insight}>
            <span>해석의 출발점</span>
            <p>
              매출 증가와 영업이익률 개선이 함께 나타납니다. 다만 순이익이
              영업이익보다 큰 이유, 상품·채널별 기여도는 손익 주석과 내부 자료를
              더 확인해야 합니다. 이 숫자만으로 특정 상품이 더 수익성이 높다고
              판단할 수 없습니다.
            </p>
          </div>
          <p className={styles.caption}>
            2024 매출·순이익은{" "}
            <a href={sourceUrl("results")} target="_blank" rel="noreferrer">
              회사가 게시한 실적 기사
            </a>
            와 반올림 수준에서 대조했습니다. 2025는 손익 주석 원문 미대조이며,{" "}
            <a href={sourceUrl("disclosure")} target="_blank" rel="noreferrer">
              공식 결산공고
            </a>
            를 함께 안내합니다.
          </p>
        </section>

        <section id="simulation" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>03 / DECISION LAB</p>
              <h2>더 많이 팔면, 더 많이 남을까</h2>
            </div>
            <span className={styles.assumptionTag}>모든 입력값은 가정</span>
          </div>
          <p className={styles.sectionIntro}>
            실제 회사의 요율이나 예측이 아닌 의사결정 연습입니다. 가정을 바꾸고,
            결과가 뒤집히는 지점을 확인해 보세요.
          </p>
          <InsuranceSimulator />
        </section>

        <section id="strategy" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>04 / SALES STRATEGY</p>
              <h2>숫자를 현장 운영으로 연결하기</h2>
            </div>
            <span className={styles.tag}>영업관리 · 마케팅 · 전략</span>
          </div>
          <div className={styles.strategyGrid}>
            <article>
              <span className={styles.step}>01</span>
              <h3>진단할 대상을 나눈다</h3>
              <p>
                지점·유입 채널·상품군·모집 월을 나눠 전환율과 계약 유지율을
                비교합니다. 신규 지점과 성숙 지점을 같은 기준으로 순위 매기지
                않습니다.
              </p>
            </article>
            <article>
              <span className={styles.step}>02</span>
              <h3>판촉의 효과를 비교한다</h3>
              <p>
                조건이 비슷한 지점군을 기준안과 실행안으로 배정합니다. 가능하면
                무작위 배정하고, 어렵다면 기존 생산성·상품 구성·시즌 차이를
                맞춥니다.
              </p>
            </article>
            <article>
              <span className={styles.step}>03</span>
              <h3>품질을 확인한 뒤 확대한다</h3>
              <p>
                초기에는 청약철회·설명 누락·민원을 점검합니다. 충분한 관찰 기간
                뒤 유지율과 환수를 확인하고 증분 공헌액이 개선되는지 판단합니다.
              </p>
            </article>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.kpiTable}>
              <caption>
                운영 대시보드에 넣을 지표 정의안 · 실제 회사 산식과 별도
              </caption>
              <thead>
                <tr>
                  <th scope="col">지표</th>
                  <th scope="col">산식·정의</th>
                  <th scope="col">분석 목적</th>
                  <th scope="col">비교 전 확인</th>
                </tr>
              </thead>
              <tbody>
                {managementKpis.map((kpi) => (
                  <tr key={kpi.name}>
                    <th scope="row">{kpi.name}</th>
                    <td>{kpi.definition}</td>
                    <td>{kpi.use}</td>
                    <td>{kpi.caveat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.interview}>
            <p className={styles.eyebrow}>면접에서 설명할 분석 관점</p>
            <h3>“판매량과 판매의 질을 함께 관리하겠습니다.”</h3>
            <p>
              원수사 프로모션을 설계할 때 판매 건수만 목표로 두지 않고, 유지 후
              남는 공헌액과 소비자보호 지표를 함께 보겠습니다. 지점별 차이를
              통제한 소규모 비교부터 시작하고, 단기 반응과 장기 유지 성과를
              구분해 확대 여부를 결정하겠습니다.
            </p>
            <p className={styles.caption}>
              이 페이지는 공개 자료와 가상 실험을 활용한 제안입니다. 회사 내부
              데이터로 검증한 성과나 실제 수행 경력으로 표현하지 않습니다.
            </p>
          </div>
        </section>

        <section id="sources" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>RESEARCH NOTES</p>
              <h2>출처와 분석의 범위</h2>
            </div>
            <span className={styles.caption}>
              확인일 {reviewedAt} · 수동 조사
            </span>
          </div>
          <div className={styles.sourceList}>
            {insuranceSources.map((source, index) => (
              <article key={source.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title} ↗
                  </a>
                  <p>{source.note}</p>
                </div>
                <small>{source.kind}</small>
              </article>
            ))}
          </div>
          <p className={styles.caption}>
            판매 영역은 공식 사업 소개, 재무 비교는 출처가 표시된 집계 자료,
            시뮬레이션과 운영 지표는 작성자의 가정을 사용했습니다.
            제휴·상품·정책은 변경될 수 있으며, 이 페이지는 실시간 공시나 보험
            가입 상담 서비스가 아닙니다.
          </p>
        </section>
        <footer className={styles.footer}>
          <span>김승현 · 금융·데이터 분석 포트폴리오</span>
          <Link href="/">다른 프로젝트 보기 ↗</Link>
        </footer>
      </div>
    </main>
  );
}
