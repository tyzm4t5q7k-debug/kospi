// All monetary values are in KRW 100 million (억원). Synthetic project, not GS data.
export type SiteScenario = {
  contract: number;
  budget: number;
  exposedMaterials: number;
  materialChange: number;
  receiptDelay: number;
  openingCash: number;
};

export const defaultSiteScenario: SiteScenario = {
  contract: 100,
  budget: 90,
  exposedMaterials: 30,
  materialChange: 0,
  receiptDelay: 0,
  openingCash: 5,
};

export const receiptShares = [0.15, 0.2, 0.2, 0.2, 0.15, 0.1];
export const paymentWeights = [16, 19, 20, 17, 11, 7];
export const materialShares = [0, 0, 0.35, 0.35, 0.2, 0.1];
const rounded = (n: number) => Math.round(n * 1e8) / 1e8;

export function validateSiteScenario(s: SiteScenario): string[] {
  const errors: string[] = [];
  if (Object.values(s).some((n) => !Number.isFinite(n)))
    return ["모든 입력란에 유효한 숫자를 입력해 주세요."];
  if (s.contract <= 0 || s.contract > 1000)
    errors.push("도급금액은 0 초과 1,000억 원 이하로 입력해 주세요.");
  if (s.budget < 0 || s.budget > 1000)
    errors.push("기준 공사원가는 0~1,000억 원으로 입력해 주세요.");
  if (s.exposedMaterials < 0 || s.exposedMaterials > s.budget)
    errors.push("변동 대상 자재비는 기준 공사원가 이하여야 합니다.");
  // M3–M6 base payments must contain the affected materials, even at a 100% fall.
  if (
    materialShares.some(
      (share, i) =>
        s.exposedMaterials * share > (s.budget * paymentWeights[i]) / 90 + 1e-8,
    )
  )
    errors.push(
      "미발주 자재의 월별 배분이 기준 지급액을 넘습니다. 대상 자재비를 줄이거나 기준 공사원가를 늘려주세요.",
    );
  if (s.materialChange < -100 || s.materialChange > 100)
    errors.push("자재 가격 변화율은 -100~100%로 입력해 주세요.");
  if (
    !Number.isInteger(s.receiptDelay) ||
    s.receiptDelay < 0 ||
    s.receiptDelay > 3
  )
    errors.push("수금 지연은 0~3개월의 정수로 선택해 주세요.");
  if (s.openingCash < 0 || s.openingCash > 1000)
    errors.push("기초 가용자금은 0~1,000억 원으로 입력해 주세요.");
  return errors;
}

export function siteEconomics(s: SiteScenario) {
  const errors = validateSiteScenario(s);
  if (errors.length) throw new RangeError(errors.join(" "));
  const costChange = rounded((s.exposedMaterials * s.materialChange) / 100);
  const totalCost = rounded(s.budget + costChange);
  let cash = s.openingCash;
  let cumulativeReceipt = 0;
  const rows = Array.from({ length: 6 + s.receiptDelay }, (_, i) => {
    const plannedReceipt = rounded(s.contract * (receiptShares[i] ?? 0));
    const receipt = rounded(
      s.contract * (receiptShares[i - s.receiptDelay] ?? 0),
    );
    const basePayment = rounded((s.budget * (paymentWeights[i] ?? 0)) / 90);
    const additionalPayment = rounded(costChange * (materialShares[i] ?? 0));
    const payment = rounded(basePayment + additionalPayment);
    const opening = cash;
    cash = rounded(cash + receipt - payment);
    cumulativeReceipt = rounded(cumulativeReceipt + receipt);
    return {
      month: i + 1,
      plannedReceipt,
      receipt,
      basePayment,
      additionalPayment,
      payment,
      opening,
      cash,
      shortfall: rounded(Math.max(0, -cash)),
      cumulativeReceipt,
    };
  });
  const minCash = Math.min(s.openingCash, ...rows.map((r) => r.cash));
  return {
    rows,
    costChange,
    totalCost,
    profit: rounded(s.contract - totalCost),
    margin: rounded(((s.contract - totalCost) / s.contract) * 100),
    minCash,
    peakFunding: rounded(Math.max(0, -minCash)),
    firstShortfall: rows.find((r) => r.cash < 0)?.month ?? null,
    peakMonth: rows.find((r) => r.cash === minCash)?.month ?? null,
    unpaidAtCompletion: rounded(s.contract - rows[5].cumulativeReceipt),
    finalCash: cash,
  };
}
export type SiteResult = ReturnType<typeof siteEconomics>;

export type SettlementItem = {
  id: string;
  vendor: string;
  work: string;
  share: number;
  dueDay: number;
  owner: string;
  evidence: string;
  workConfirmed: boolean;
  invoiceReceived: boolean;
  amountsReconciled: boolean;
};
export type SettlementCheck =
  | "workConfirmed"
  | "invoiceReceived"
  | "amountsReconciled";
export const settlementChecks: { key: SettlementCheck; label: string }[] = [
  { key: "workConfirmed", label: "기성 확인자료" },
  { key: "invoiceReceived", label: "청구·증빙 확보" },
  { key: "amountsReconciled", label: "계약·정산 대조" },
];
export const sampleSettlements: SettlementItem[] = [
  {
    id: "A",
    vendor: "협력사 A",
    work: "골조",
    share: 0.3,
    dueDay: 10,
    owner: "현장관리 ↔ 공무·시공",
    evidence: "기성 확인자료를 받아 청구 범위와 대조",
    workConfirmed: false,
    invoiceReceived: true,
    amountsReconciled: false,
  },
  {
    id: "B",
    vendor: "협력사 B",
    work: "자재",
    share: 0.25,
    dueDay: 13,
    owner: "현장관리 ↔ 구매·협력사",
    evidence: "납품 확인자료와 누락 청구 증빙 보완",
    workConfirmed: true,
    invoiceReceived: false,
    amountsReconciled: true,
  },
  {
    id: "C",
    vendor: "협력사 C",
    work: "장비",
    share: 0.2,
    dueDay: 18,
    owner: "현장관리 ↔ 재경",
    evidence: "확인자료를 첨부해 권한자 승인 절차 진행",
    workConfirmed: true,
    invoiceReceived: true,
    amountsReconciled: true,
  },
  {
    id: "D",
    vendor: "협력사 D",
    work: "기타 공종·경비",
    share: 0.25,
    dueDay: 23,
    owner: "현장관리 ↔ 공무·구매",
    evidence: "변경계약·기지급 내역을 이번 청구와 대조",
    workConfirmed: true,
    invoiceReceived: true,
    amountsReconciled: false,
  },
];

export function settlementReview(
  items: SettlementItem[],
  monthPayment: number,
) {
  const rows = items.map((item) => {
    const missing = settlementChecks
      .filter((check) => !item[check.key])
      .map((check) => check.label);
    return {
      ...item,
      amount: rounded(monthPayment * item.share),
      missing,
      urgent: missing.length > 0 && item.dueDay - 8 <= 7,
    };
  });
  return {
    rows,
    unresolvedCount: rows.filter((r) => r.missing.length > 0).length,
    reviewAmount: rounded(
      rows
        .filter((r) => r.missing.length > 0)
        .reduce((sum, r) => sum + r.amount, 0),
    ),
    urgentCount: rows.filter((r) => r.urgent).length,
  };
}

export function siteAnalysisText(s: SiteScenario, items: SettlementItem[]) {
  const r = siteEconomics(s);
  const review = settlementReview(items, r.rows[2].payment);
  return [
    "GS건설 현장관리 | 김승현의 개인 분석 포트폴리오",
    "모델 v1.0 · 2026-11-18 · 가상 도급공사 / 실제 GS건설 현장 자료 아님",
    "분석 질문: 원가 상승과 수금 지연이 손익·필요자금에 각각 미치는 영향은?",
    "단위: 억 원. 수금은 전액 회수하며 지급기일은 유지하는 가정.",
    `도급금액 ${s.contract} / 기준 공사원가 ${s.budget} / 가격변동 대상 자재비 ${s.exposedMaterials}`,
    `자재 가격 변화 ${s.materialChange}% / 수금 지연 ${s.receiptDelay}개월 / 기초 가용자금 ${s.openingCash}`,
    `예상 공사손익 ${r.profit} / 추가 원가 ${r.costChange} / 최대 추가 필요자금 ${r.peakFunding}`,
    `첫 부족 월 ${r.firstShortfall ? `M${r.firstShortfall}` : "없음"} / M6 미수금 ${r.unpaidAtCompletion} / 최종 잔액 ${r.finalCash}`,
    "",
    "월,기준수금,시나리오수금,기준지급,자재증감,총지급,조달전월말잔액",
    ...r.rows.map((m) =>
      [
        m.month,
        m.plannedReceipt,
        m.receipt,
        m.basePayment,
        m.additionalPayment,
        m.payment,
        m.cash,
      ].join(","),
    ),
    "",
    `M3 정산 점검: ${review.unresolvedCount}건 미완료 / 점검 대상 ${review.reviewAmount}억 원 / 7일 내 지급예정 중 미완료 ${review.urgentCount}건`,
    ...review.rows.map(
      (row) =>
        `${row.vendor} (${row.work}): ${row.amount}억 / M3 ${row.dueDay}일 / ${row.missing.join("·") || "점검 완료(가상)"} / ${row.owner}`,
    ),
    "체크 여부는 현금계획을 바꾸지 않으며 실제 승인·지급을 실행하지 않습니다.",
    "",
    "해석: 수금 지연은 이 모델의 공사손익을 바꾸지 않지만 중간 자금 부족을 키울 수 있습니다. 가격 변화는 변동 대상 자재에만 적용됩니다.",
    "대응 검토: 발주처 수금 일정 확인 → 기성·정산 증빙 대조 → 본사 재경과 자금계획 협의 → 담당자·기한 추적.",
    "범위: 본사 공통비·세금·금융비용·보증/유보금·대손·선수금·계약변경·월중 자금 최저점 제외. 회계상 당기순이익이나 실제 차입 필요액이 아닙니다.",
    "공사손익=도급금액-(기준원가+변동대상자재비×가격변화율). 월말잔액=전월잔액+수금-지급.",
    "최대 추가 필요자금=max(0,-최저 조달전 월말잔액). 월별 부족액을 합산하지 않습니다.",
    "",
    "AI 활용: 사용자가 현장관리 직무와 프로젝트 범위를 선택했고, AI가 자료 탐색·모델 초안·가상 데이터·구현·검산을 지원했습니다. 예측 AI나 현장 운영 자동화가 아닙니다.",
    "출처와 모델 설명: https://kospi-swart.vercel.app/construction#sources",
    "면접 설명 가이드: https://kospi-swart.vercel.app/guides/gs-field-interview.txt",
  ].join("\n");
}
