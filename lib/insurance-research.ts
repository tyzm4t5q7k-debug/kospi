import {
  closingStatements,
  disclosuresReviewedAt,
  retentionEvidence,
} from "./insurance-disclosures";

export const reviewedAt = "2026.11.18";

export const insuranceSources = [
  {
    id: "life",
    title: "한화라이프랩 · 생명보험영업",
    url: "https://www.hanwhalifelab.co.kr/field/life.asp",
    kind: "회사 공식",
    note: "생명보험 판매 영역 및 게시된 제휴사. 현재 판매 가능한 개별 상품 목록과 수수료 약정은 별도 확인 필요.",
  },
  {
    id: "nonlife",
    title: "한화라이프랩 · 손해보험영업",
    url: "https://www.hanwhalifelab.co.kr/field/nonlife.asp",
    kind: "회사 공식",
    note: "손해보험 판매 영역 및 게시된 제휴사. 홈페이지와 상세 페이지의 제휴사 수가 달라 총수는 사용하지 않음.",
  },
  {
    id: "guarantee",
    title: "한화라이프랩 · 보증보험영업",
    url: "https://www.hanwhalifelab.co.kr/field/guarantee.asp",
    kind: "회사 공식",
    note: "SGI서울보증 대리점 및 채무불이행 관련 보증보험 사업 설명.",
  },
  {
    id: "ga",
    title: "한화라이프랩 · GA Business",
    url: "https://www.hanwhalifelab.co.kr/field/GA.asp",
    kind: "회사 공식",
    note: "수수료, 지사 개설·교육·운영 지원에 관한 사업 소개. 요율표는 확인하지 못함.",
  },
  {
    id: "results",
    title: "한화라이프랩 · 2024 실적 발표 기사",
    url: "https://www.hanwhalifelab.co.kr/promotion/news_view.asp?aidx=43",
    kind: "회사 게시 · 2025.03.20",
    note: "2024 매출 약 1,683억 원, 순이익 약 68억 원. 아래 2차 집계의 2024 수치와 반올림 기준 대조.",
  },
  {
    id: "finance",
    title: "사람인 · NICE평가정보 재무 집계",
    url: "https://www.saramin.co.kr/zf_user/company-info/view-inner-finance/csn/WVVsMkV6U2MyNWg4cFVRUWxCZVhYUT09/company_nm/%ED%95%9C%ED%99%94%EB%9D%BC%EC%9D%B4%ED%94%84%EB%9E%A9%28%EC%A3%BC%29",
    kind: "2차 자료 · 2025 결산",
    note: "2024·2025 회사 전체 매출, 영업이익, 순이익. 2025 손익 원문 주석까지 대조한 값은 아니므로 면접 인용 전 감사보고서 재확인 권장.",
  },
  {
    id: "disclosure",
    title: "한화라이프랩 · 제21기 결산공고",
    url: "https://www.hanwhalifelab.co.kr/company/notice_view.asp?aidx=36",
    kind: "회사 공식 · 2026.03.23",
    note: "2025.12.31 재무상태표 원문 대조. 자산·부채·자본·현금·이연법인세자산 등을 확인했으며, 손익 주석과 상품별 이익은 확인 대상에 포함되지 않음. 확인 2026.11.22.",
  },
  ...closingStatements.slice(0, 2).map((statement) => ({
    id: `closing-${statement.year}`,
    title: `한화라이프랩 · ${statement.period} 결산공고`,
    url: statement.url,
    kind: `회사 공식 · ${statement.publishedAt}`,
    note: `${statement.year}.12.31 재무상태표 원문 대조. 억 원 환산 및 재무비율 직접 계산. 확인 ${disclosuresReviewedAt}.`,
  })),
  {
    id: "retention-report",
    title: "보험저널 · 한화생명 산하 GA 유지율 비교 보도",
    url: retentionEvidence.url,
    kind: `2차 자료 · ${retentionEvidence.publishedAt}`,
    note: "2025·2026 상반기 한화라이프랩 유지율과 설계사 수. 협회 공시를 분석한 기사 수치를 확인했으며 협회 원문 직접 대조는 미완료. 확인 2026.11.22. 시뮬레이션 기본값과 별도.",
  },
  {
    id: "ifrs",
    title: "IFRS Foundation · IFRS 17 Insurance Contracts",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-17-insurance-contracts/",
    kind: "회계기준 제정기관",
    note: "보험서비스 제공 기간에 따른 이익 인식, 보험수익·서비스비용·보험금융손익 및 CSM의 구분.",
  },
  {
    id: "commission",
    title: "금융위원회 · 보험 판매수수료 개편안",
    url: "https://www.fsc.go.kr/po010101/84721?srchCtgry=1",
    kind: "정책 발표 · 2025",
    note: "유지관리와 수수료 정보공개 중심의 정책 방향 참고. 이후 개정·시행일 확인이 필요한 자료로, 계산기에 법정 한도를 적용한 것은 아님.",
  },
] as const;

export function sourceUrl(id: (typeof insuranceSources)[number]["id"]) {
  return insuranceSources.find((source) => source.id === id)!.url;
}

// KRW, as displayed by NICE/Saramin. These are company-wide results, not product margins.
export const companyFinancials = [
  { year: 2024, revenue: 168272950000, operating: 7105300000, net: 6797880000 },
  {
    year: 2025,
    revenue: 208643700000,
    operating: 9869580000,
    net: 16078760000,
  },
];

export const businessLines = [
  {
    number: "01",
    title: "생명보험",
    english: "LIFE",
    source: "life" as const,
    partners: "게시 제휴사 예: 한화생명 · 삼성생명 · 교보생명 · 하나생명",
    description:
      "사망보장, 질병보장, 노후소득 등 고객의 장기적인 보장 필요를 다루는 영역.",
    families: "상품군 이해 예시: 종신·정기 / 건강·암 / 연금",
    management: "납입 지속 가능성, 13·25회차 유지율, 상품 설명의 충실도",
    economics: "장기 유지에 따른 수수료와 초기 판매·관리 비용을 함께 확인",
  },
  {
    number: "02",
    title: "손해보험",
    english: "NON-LIFE",
    source: "nonlife" as const,
    partners: "게시 제휴사 예: 한화손해보험 · 삼성화재 · 현대해상 · DB손해보험",
    description:
      "질병·상해와 차량·재산 등 다양한 위험을 다루며 상품군마다 갱신·손해 특성이 다른 영역.",
    families: "상품군 이해 예시: 건강·상해 / 자동차·운전자 / 화재·재물",
    management: "상품군별 전환율, 갱신율, 중복보장 점검, 민원 발생률",
    economics: "판매 채널의 수수료 수익과 보험사의 손해율을 분리해서 분석",
  },
  {
    number: "03",
    title: "보증보험",
    english: "GUARANTEE",
    source: "guarantee" as const,
    partners: "공식 사업 소개: SGI서울보증 대리점",
    description:
      "계약·의무 불이행으로 발생하는 채권자의 손해를 보장하는 사업 영역.",
    families: "보장 목적: 기업·개인의 거래에 필요한 신용 보완",
    management: "상담→청약→인수 전환율, 처리 시간, 고객군별 재이용",
    economics: "대리점의 판매 대가와 보증보험사의 신용위험 부담을 구분",
  },
];

export const managementKpis = [
  {
    name: "상담→계약 전환율",
    definition: "같은 유입 집단의 성립 계약 수 ÷ 유효 상담 수",
    use: "채널·지점·상품군별 비교",
    caveat: "전환 관찰 기간과 중복 상담 제외 기준을 통일",
  },
  {
    name: "유지율",
    definition: "해당 회차까지 유지된 계약 수 ÷ 해당 회차 관찰 대상 계약 수",
    use: "13·25회차별 모집 월 집단 비교",
    caveat:
      "여기서는 건수 기준 제안. 실제 회사의 금액 기준·제외 기준 확인 필요",
  },
  {
    name: "증분 공헌액",
    definition: "프로모션안 공헌액 − 비교 기준 공헌액",
    use: "판매 확대가 추가 비용을 상쇄하는지 평가",
    caveat: "단순 전후 비교는 계절성·지점 차이를 제거하지 못함",
  },
  {
    name: "불완전판매·민원",
    definition: "동일 모집 집단의 확정 건수 ÷ 성립 계약 수",
    use: "성과 확대 전 점검할 품질 기준",
    caveat: "미확정 민원과 확정 사례 구분, 관찰 기간·표본 수 함께 표시",
  },
];
