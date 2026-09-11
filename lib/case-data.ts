// Frozen observations for the submission studies. Dates are observation dates,
// except annual year labels, which mean each market's own final close of that year.
// This file is deliberately independent of the live Yahoo Finance response.
export const reviewedOn = "2026-09-11";
export const annualCloses = [
  { year: 2014, kospi: 1915.59, nasdaq: 4736.05 },
  { year: 2015, kospi: 1961.31, nasdaq: 5007.41 },
  { year: 2016, kospi: 2026.46, nasdaq: 5383.12 },
  { year: 2017, kospi: 2467.49, nasdaq: 6903.39 },
  { year: 2018, kospi: 2041.04, nasdaq: 6635.28 },
  { year: 2019, kospi: 2197.67, nasdaq: 8972.60 },
  { year: 2020, kospi: 2873.47, nasdaq: 12888.28 },
  { year: 2021, kospi: 2977.65, nasdaq: 15644.97 },
  { year: 2022, kospi: 2236.40, nasdaq: 10466.48 },
  { year: 2023, kospi: 2655.28, nasdaq: 15011.35 },
  { year: 2024, kospi: 2399.49, nasdaq: 19310.79 }
];

export const currencyCloses = [
  {
    "month": "2023-12-29",
    "nasdaq": 15011.35,
    "fx": 1290.97
  },
  {
    "month": "2024-01-31",
    "nasdaq": 15164.01,
    "fx": 1334.9
  },
  {
    "month": "2024-02-29",
    "nasdaq": 16091.92,
    "fx": 1336.19
  },
  {
    "month": "2024-03-28",
    "nasdaq": 16379.46,
    "fx": 1346.01
  },
  {
    "month": "2024-04-30",
    "nasdaq": 15657.82,
    "fx": 1381.92
  },
  {
    "month": "2024-05-31",
    "nasdaq": 16735.02,
    "fx": 1385.43
  },
  {
    "month": "2024-06-28",
    "nasdaq": 17732.6,
    "fx": 1376.55
  },
  {
    "month": "2024-07-31",
    "nasdaq": 17599.4,
    "fx": 1369.29
  },
  {
    "month": "2024-08-30",
    "nasdaq": 17713.62,
    "fx": 1336
  },
  {
    "month": "2024-09-30",
    "nasdaq": 18189.17,
    "fx": 1314.94
  },
  {
    "month": "2024-10-31",
    "nasdaq": 18095.15,
    "fx": 1377.57
  },
  {
    "month": "2024-11-29",
    "nasdaq": 19218.17,
    "fx": 1396.99
  },
  {
    "month": "2024-12-31",
    "nasdaq": 19310.79,
    "fx": 1477.86
  }
];

export const caseSources = [
  { id: "kospi", title: "KOSPI 연말 종가 · Wikipedia 연간 성과표", url: "https://en.wikipedia.org/wiki/KOSPI#Annual_returns", detail: "사례 01의 KOSPI 연말 종가. 2차 편집 자료이며 KRX 원자료와의 전수 대조는 수행하지 않았습니다." },
  { id: "nasdaq-annual", title: "NASDAQ 연말 종가 · Wikipedia 연간 성과표", url: "https://en.wikipedia.org/wiki/Nasdaq_Composite#Annual_returns", detail: "사례 01의 NASDAQ 연말 종가. 2023·2024년 말은 FRED NASDAQCOM과도 일치 여부를 확인했습니다." },
  { id: "nasdaq", title: "Nasdaq, Inc. / FRED · NASDAQCOM", url: "https://fred.stlouisfed.org/series/NASDAQCOM", detail: "사례 02의 NASDAQ Composite 일별 종가에서 월별 마지막 공통 관측일을 선택했습니다. 배당 재투자 지수가 아닙니다." },
  { id: "fx", title: "Federal Reserve / FRED · DEXKOUS", url: "https://fred.stlouisfed.org/series/DEXKOUS", detail: "사례 02의 원/달러 환율(원/USD). 미국 뉴욕 정오 매입률로 서울 외환시장 종가 및 실제 고객 적용 환율과 다릅니다." },
  { id: "sec", title: "SEC Investor.gov · International Investing", url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/international-investing", detail: "해외투자의 환율 위험에 대한 개념 참고. 사례 02의 수치는 별도 계산했습니다." },
  { id: "trade", title: "미국 상무부 ITA · Foreign Exchange Risk", url: "https://www.trade.gov/foreign-exchange-risk", detail: "계약과 결제 사이 환율 위험에 대한 개념 참고. 사례 03의 기업과 입력값은 모두 가정입니다." }
];
