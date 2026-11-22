// Snapshot of public evidence; never used as the simulator's defaults.
// Amounts preserve the KRW values printed in the original closing notices.
export const disclosuresReviewedAt = "2026.11.22";

export const closingStatements = [
  {
    year: 2023,
    period: "제19기",
    publishedAt: "2024.03.20",
    url: "https://www.hanwhalifelab.co.kr/company/notice_view.asp?aidx=32",
    assets: 39084620926,
    liabilities: 18863148228,
    equity: 20221472698,
    retainedEarnings: -30131477386,
    cash: 7078613279,
    shortTermDeposits: 6000000000,
    currentAssets: 32372040792,
    currentLiabilities: 17634331297,
  },
  {
    year: 2024,
    period: "제20기",
    publishedAt: "2025.03.19",
    url: "https://www.hanwhalifelab.co.kr/company/notice_view.asp?aidx=34",
    assets: 60708383201,
    liabilities: 34152898774,
    equity: 26555484427,
    retainedEarnings: -23797465657,
    cash: 2955977538,
    shortTermDeposits: 14000000000,
    currentAssets: 52411131993,
    currentLiabilities: 33454308854,
  },
  {
    year: 2025,
    period: "제21기",
    publishedAt: "2026.03.23",
    url: "https://www.hanwhalifelab.co.kr/company/notice_view.asp?aidx=36",
    assets: 86533965537,
    liabilities: 43995855122,
    equity: 42538110415,
    retainedEarnings: -7814839669,
    cash: 18698053193,
    shortTermDeposits: 12000000000,
    currentAssets: 72936137186,
    currentLiabilities: 42786510393,
  },
] as const;

export const deferredTaxAsset2025 = 6152032078;
export const paidInCapital2025 = 42000000000;

export const retentionEvidence = {
  url: "https://www.insjournal.co.kr/news/articleView.html?idxno=33431",
  publisher: "보험저널",
  // The current article header was rechecked on 2026-11-22.
  publishedAt: "2026.10.15",
  scope: "2025년 상반기와 2026년 상반기 GA 경영공시를 비교한 보도",
  previousAgents: 3730,
  currentAgents: 3920,
  rows: [
    { label: "생명보험 13회차", previous: 88.4, current: 85.6 },
    { label: "손해보험 13회차", previous: 86.69, current: 80.51 },
    { label: "생명보험 25회차", previous: 64.96, current: 75.71 },
    { label: "손해보험 25회차", previous: 71.04, current: 74.87 },
  ],
} as const;
