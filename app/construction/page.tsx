import type { Metadata } from "next";
import Link from "next/link";
import { ConstructionLab } from "./construction-lab";
import styles from "./construction.module.css";

export const metadata: Metadata = {
  title: "GS건설 현장관리 · 원가와 자금수지 | 김승현",
  description:
    "AI를 활용해 설계한 가상 건설 현장의 원가·수금·지급 시나리오 분석과 협력업체 정산 점검 포트폴리오. 가정·산식·검증·분석 한계를 공개합니다.",
};

const questions = [
  [
    "무엇을 분석했나요?",
    "가상 도급공사를 대상으로 미발주 자재의 가격 변화와 공사대금 수금 지연을 나눠 분석했습니다. 예상 공사손익, 월별 자금 잔액, 최대 추가 필요자금이 어떻게 달라지는지 비교했습니다.",
  ],
  [
    "어떤 결과를 얻었나요?",
    "기본 예시에서는 도급금액 100억 원, 원가 90억 원으로 예상 공사손익은 10억 원입니다. 수금을 한 달 늦추면 이 손익은 그대로지만, 기초자금 5억 원을 반영해도 최대 15억 원의 추가 자금이 필요했습니다. 미발주 자재비 30억 원의 가격이 10% 오르면 예상 공사손익은 7억 원으로 줄었습니다. 모두 가상 조건의 계산 결과입니다.",
  ],
  [
    "AI를 어디에 활용했나요?",
    "현장관리 직무에 맞는 주제와 기능 범위를 정하고, AI를 활용해 공개자료 탐색, 가정과 계산 구조 설계, 가상 데이터 작성, 웹 구현과 검산을 진행했습니다. 결과는 공개된 산식으로 다시 확인할 수 있게 구성했습니다. AI가 실제 현장 수익을 예측하는 서비스는 아닙니다.",
  ],
  [
    "현장관리 업무와 어떻게 연결되나요?",
    "숫자를 보고 부족 시점을 발견한 다음, 발주처 수금 일정과 협력업체 기성·정산 자료를 확인하고, 공무·구매·재경 등 관련 담당자와 협의할 사항을 정리하는 흐름입니다. 정산 점검표에는 확인 항목과 지급예정일, 협의 담당을 함께 표시했습니다.",
  ],
  [
    "계산이 맞는지는 어떻게 확인했나요?",
    "프로젝트에 자동 검산을 포함했습니다. 전체 수금이 도급금액과 맞는지, 전체 지급이 예상 원가와 맞는지, 마지막 잔액이 기초자금과 공사손익의 합인지 확인합니다. 수금 지연만으로 공사손익이 바뀌지 않는지, 가장 큰 자금 부족을 월별 부족액의 합으로 잘못 계산하지 않는지도 점검합니다.",
  ],
  [
    "실제 회사에서 사용할 수 있나요?",
    "현재는 직무 이해를 위한 프로토타입입니다. 실무 적용에는 실제 계약 조건과 기성 승인, 지급기일, 선수금·유보금, 세금·금융비용, 일별 자금 일정이 필요합니다. 현장 자료와 권한자의 검토를 거쳐 모델을 조정해야 합니다.",
  ],
];

export default function ConstructionPage() {
  return (
    <main className={styles.app}>
      <a className={styles.skip} href="#construction-content">
        본문 바로가기
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark}>K.</span>
          <span>
            김승현<small>FINANCE & DATA</small>
          </span>
        </Link>
        <nav aria-label="주요 메뉴">
          <Link href="/">포트폴리오</Link>
          <Link href="/insurance">보험사업 분석</Link>
          <Link href="/construction" aria-current="page">
            GS건설 현장관리
          </Link>
          <Link href="/stocks">국내 주식</Link>
        </nav>
      </header>
      <div className={styles.container} id="construction-content">
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              FIELD MANAGEMENT LAB <span>CASE 05</span>
            </p>
            <p className={styles.kicker}>GS건설 현장관리 · 직무 연구</p>
            <h1>
              이익이 남는 현장,
              <br />
              <em>자금도 충분할까요?</em>
            </h1>
            <p className={styles.lede}>
              원가의 변화와 돈이 움직이는 시간을 함께 봅니다.
              <br />
              가상 도급공사의 자금수지부터 협력업체 정산 점검까지.
            </p>
            <div className={styles.actions}>
              <a href="#simulation" className={styles.primary}>
                시나리오 비교하기 <span aria-hidden="true">↗</span>
              </a>
              <a href="#research" className={styles.secondary}>
                분석 과정과 AI 활용
              </a>
            </div>
            <p className={styles.caption}>
              김승현의 개인 포트폴리오 · GS건설 공식 서비스 아님
              <br />
              금액·협력업체·일정은 모두 가상 데이터 · 모델 v1.0 / 2026.11.18
            </p>
          </div>
          <aside className={styles.heroPanel} aria-label="가상 사례 핵심 발견">
            <div className={styles.panelTop}>
              <span>가상 현장 A · 6개월</span>
              <span className={styles.liveDot}>SCENARIO STUDY</span>
            </div>
            <div className={styles.blueprint} aria-hidden="true">
              <svg viewBox="0 0 440 180">
                <path
                  d="M20 155H420M50 155V85H135V155M155 155V45H260V155M285 155V105H370V155M170 45V15H245V45M200 15V0M65 102H120M65 120H120M65 138H120M170 65H245M170 85H245M170 105H245M170 125H245M300 122H355M300 140H355M200 65V155M225 65V155M35 165H400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M20 175H420"
                  stroke="currentColor"
                  strokeDasharray="3 5"
                />
              </svg>
            </div>
            <p>수금이 한 달 늦어졌을 때</p>
            <div className={styles.heroMetrics}>
              <div>
                <small>예상 공사손익</small>
                <strong>
                  10<span>억</span>
                </strong>
                <span>기준과 동일</span>
              </div>
              <div>
                <small>최대 추가 필요자금</small>
                <strong className={styles.amber}>
                  15<span>억</span>
                </strong>
                <span>기준 0억 → 15억</span>
              </div>
            </div>
            <p className={styles.panelFoot}>
              손익과 현금흐름은 같은 속도로 움직이지 않습니다.
            </p>
          </aside>
        </section>
        <nav className={styles.sectionNav} aria-label="현장관리 분석 목차">
          <a href="#simulation">01 원가·자금수지</a>
          <a href="#settlement">02 정산 점검</a>
          <a href="#research">03 분석 과정</a>
          <a href="#interview">04 면접 설명</a>
          <a href="#sources">출처·한계</a>
        </nav>

        <ConstructionLab />

        <section className={styles.section} id="research">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>03 / RESEARCH NOTE</p>
              <h2>질문에서 검산까지, 분석의 기록</h2>
            </div>
            <span className={styles.tag}>AI 보조 분석 · 산식 공개</span>
          </div>
          <div className={styles.researchGrid}>
            <article>
              <span>01</span>
              <h3>질문을 분리하다</h3>
              <p>
                “원가 상승”과 “수금 지연”은 같은 위험일까? 두 요인을 각각 바꾼
                뒤 동시에 바꿔, 손익과 자금에 미치는 영향을 구분했습니다.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>가정을 드러내다</h3>
              <p>
                6개월 가상 도급공사, 전액 수금, 고정 지급계획을 사용했습니다.
                실제 GS건설의 개별 현장 원가나 계약 조건을 추정값으로 채우지
                않았습니다.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>숫자를 다시 확인하다</h3>
              <p>
                수금·지급 총액, 마지막 잔액의 일치, 지연분 회수, 원가 손실
                상황을 자동 검산합니다. 최대 부족액은 월별 부족액의 합이 아닌
                최저 잔액으로 계산합니다.
              </p>
            </article>
            <article>
              <span>04</span>
              <h3>확인할 업무로 연결하다</h3>
              <p>
                자금 부족 신호를 수금 일정 확인, 기성 증빙 대조, 본사 자금계획
                협의로 연결했습니다. 정산 체크리스트는 확인 이력을 시연하며 실제
                지급을 승인하지 않습니다.
              </p>
            </article>
          </div>
          <div className={styles.aiNote}>
            <div>
              <h3>AI를 활용한 부분</h3>
              <p>
                공개자료 탐색과 요약, 모델·가상 데이터 초안, 웹 구현, 테스트
                작성 및 실행을 AI가 지원했습니다. 화면의 계산과 해석은 공개
                산식과 조건에 따라 재현되며, 접속할 때마다 생성형 AI를 호출하지
                않습니다.
              </p>
            </div>
            <div>
              <h3>작성자의 역할과 다음 확인</h3>
              <p>
                작성자는 지원 직무와 분석 목적을 제시하고, 원가·자금수지와 정산
                점검을 결합하는 범위를 선택했습니다. 면접에서는 직접 입력을
                바꿔본 조건과 이해한 결과를 설명하고, AI가 작성한 코드·검산을
                본인이 전부 수작업으로 수행했다고 표현하지 않습니다.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section} id="interview">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>04 / EXPLAIN THE WORK</p>
              <h2>면접에서 설명할 수 있는 분석</h2>
            </div>
            <a
              className={styles.secondary}
              href="/guides/gs-field-interview.txt"
              download
            >
              면접 설명 가이드 ↓
            </a>
          </div>
          <blockquote className={styles.quote}>
            “기존 금융·현금흐름 포트폴리오를 현장관리 직무로 확장했습니다. AI를
            활용해 가상의 공사 원가와 수금·지급 시나리오를 비교하는 도구를
            만들고, 수익이 예상되는 공사에서도 수금 시점에 따라 자금이 부족해질
            수 있다는 점을 분석했습니다. 여기에 협력업체 정산 점검을 연결해,
            숫자를 확인한 뒤 어떤 자료와 담당자를 확인할지 정리했습니다.”
          </blockquote>
          <p className={styles.caption}>
            아래 설명은 이 페이지의 가상 사례를 직접 확인하고 이해한 범위에서
            활용하세요. 실제 현장 운영·비용 절감 성과를 의미하지 않습니다.
          </p>
          <div className={styles.qaList}>
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.section} id="sources">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>SOURCES & SCOPE</p>
              <h2>공개자료와 가상 모델의 경계</h2>
            </div>
            <span className={styles.tag}>자료 확인 2026.11.18</span>
          </div>
          <div className={styles.sourceGrid}>
            <article>
              <span className={styles.tag}>회사 이해 · 공식 자료</span>
              <h3>GS건설 IR</h3>
              <p>
                사업과 전사 실적을 확인하는 공개자료입니다. 전사 실적을 개별
                현장의 원가율·수금률로 대입하지 않았습니다.
              </p>
              <a
                href="https://www.gsenc.com/IR/Data/earning_release.asp"
                target="_blank"
                rel="noreferrer"
              >
                공식 실적 발표 자료 ↗
              </a>
            </article>
            <article>
              <span className={styles.tag}>업무 흐름 · 공개 참고자료</span>
              <h3>건설기술정보시스템 CODIL</h3>
              <p>
                공사관리 자료의 기성 청구·확인·수금 및 현장 자금계획 흐름을
                참고했습니다. 특정 회사의 현재 내부 규정이나 법정 지급기일을
                뜻하지 않습니다.
              </p>
              <a
                href="https://www.codil.or.kr/filebank/construction/EP/CIGCEP510048/CIGCEP510048.pdf"
                target="_blank"
                rel="noreferrer"
              >
                자금조달 흐름도 · 문서 p.178 ↗
              </a>
            </article>
            <article>
              <span className={styles.tag}>분석 데이터 · 자체 가정</span>
              <h3>가상 현장 A</h3>
              <p>
                도급금액·원가·월별 비중·정산 상태는 학습용으로 구성했습니다.
                동일한 가정과 산식으로 결과를 재현할 수 있습니다.
              </p>
              <a href="/research/construction-assumptions.csv" download>
                기준 월별 가정 CSV ↓
              </a>
            </article>
          </div>
          <details className={styles.method}>
            <summary>산식·월별 배분·모델의 한계 자세히 보기</summary>
            <ul>
              <li>
                예상 공사손익 = 도급금액 − (기준 공사원가 + 변동 대상 자재비 ×
                가격 변화율). 본사 공통비·금융비용·세금 차감 전 단순 프로젝트
                차액입니다.
              </li>
              <li>
                기준 수금 비중: M1~M6에 15·20·20·20·15·10%. 기준 지급 비중:
                16·19·20·17·11·7을 합계 90으로 나눈 비율입니다.
              </li>
              <li>
                변동 대상 자재의 가격 차액은 M3~M6에 35·35·20·10%로 지급합니다.
                해당 자재의 월별 기준금액이 전체 기준지급을 넘지 않도록 입력을
                검증합니다.
              </li>
              <li>
                수금 지연은 모든 기준 수금을 선택한 개월 수만큼 옮깁니다. 지연
                후 전액 회수하며 M7~M9도 표시합니다. 부도·대손·계약금액
                변경·지급 연기는 가정하지 않습니다.
              </li>
              <li>
                월말 잔액 = 전월 잔액 + 수금 − 지급. 최대 추가 필요자금 = max(0,
                −최저 조달 전 월말 잔액). 기초자금은 손익에 포함하지 않고 추가
                차입도 잔액에 자동 반영하지 않습니다.
              </li>
              <li>
                월중 입출금 순서와 이자, 선수금·유보금·부가세·정산 차감, 공기
                연장비용은 제외합니다. 월말 기준 부족액이므로 실제 최대 자금
                수요는 더 클 수 있습니다.
              </li>
              <li>
                정산 표는 M3 총 지급계획을 30·25·20·25%로 배분한 가상 업무
                묶음입니다. 체크 상태는 현재 화면에서만 유지되며 새로고침 시
                초기화됩니다. 7일 표시는 시연용 우선순위이며 법정기한이
                아닙니다.
              </li>
            </ul>
          </details>
        </section>
        <footer className={styles.footer}>
          <span>김승현 · AI를 활용한 금융·데이터 분석 포트폴리오</span>
          <Link href="/">전체 포트폴리오로 돌아가기 ↗</Link>
        </footer>
      </div>
    </main>
  );
}
