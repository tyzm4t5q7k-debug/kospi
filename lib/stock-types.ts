export type Candle = {
  // Interval start in milliseconds, normalized across providers.
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type Interval = "1d" | "1m";
export type Stock = {
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  sector: string;
};
export type Flow = {
  date: string;
  updatedAt: string;
  individual: number | null;
  institution: number | null;
  foreigner: number | null;
  foreignHolding: number | null;
  foreignRate: number | null;
  short: number | null;
  credit: number | null;
  lending: number | null;
};
export type StockData = {
  stock: Stock;
  candles: Candle[];
  interval: Interval;
  source: "Toss" | "Yahoo";
  fetchedAt: string;
  candlesAsOf: string;
  quote: { price: number; at: string | null } | null;
  flows: Flow[];
  notices: string[];
};
export const STOCKS: Stock[] = [
  ["005930", "삼성전자", "KOSPI", "반도체"],
  ["000660", "SK하이닉스", "KOSPI", "반도체"],
  ["005380", "현대차", "KOSPI", "자동차"],
  ["000270", "기아", "KOSPI", "자동차"],
  ["035420", "NAVER", "KOSPI", "플랫폼"],
  ["035720", "카카오", "KOSPI", "플랫폼"],
  ["373220", "LG에너지솔루션", "KOSPI", "2차전지"],
  ["006400", "삼성SDI", "KOSPI", "2차전지"],
  ["247540", "에코프로비엠", "KOSDAQ", "2차전지"],
  ["012450", "한화에어로스페이스", "KOSPI", "방산"],
  ["064350", "현대로템", "KOSPI", "방산"],
  ["079550", "LIG넥스원", "KOSPI", "방산"],
  ["329180", "HD현대중공업", "KOSPI", "조선"],
  ["010140", "삼성중공업", "KOSPI", "조선"],
  ["042660", "한화오션", "KOSPI", "조선"],
  ["267260", "HD현대일렉트릭", "KOSPI", "전력"],
  ["010120", "LS ELECTRIC", "KOSPI", "전력"],
  ["298040", "효성중공업", "KOSPI", "전력"],
  ["207940", "삼성바이오로직스", "KOSPI", "바이오"],
  ["068270", "셀트리온", "KOSPI", "바이오"],
  ["105560", "KB금융", "KOSPI", "금융"],
  ["055550", "신한지주", "KOSPI", "금융"],
  ["086790", "하나금융지주", "KOSPI", "금융"],
  ["034020", "두산에너빌리티", "KOSPI", "원전"],
  ["052690", "한전기술", "KOSPI", "원전"],
  ["032820", "우리기술", "KOSDAQ", "원전"],
  ["454910", "두산로보틱스", "KOSPI", "로봇"],
  ["277810", "레인보우로보틱스", "KOSDAQ", "로봇"],
  ["108490", "로보티즈", "KOSDAQ", "로봇"],
  ["000100", "유한양행", "KOSPI", "바이오"],
].map(([code, name, market, sector]) => ({
  code,
  name,
  market: market as Stock["market"],
  sector,
}));
export function findStock(code: string, market = "KOSPI"): Stock {
  return (
    STOCKS.find((s) => s.code === code) ?? {
      code,
      name: code,
      market: market === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
      sector: "직접 조회",
    }
  );
}
export const koreanDate = (time: number) =>
  new Date(time + 9 * 3600000).toISOString().slice(0, 10);
export function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? n : null;
}
export function cleanCandles(rows: Candle[]): Candle[] {
  return [
    ...new Map(
      rows
        .filter(
          (c) =>
            Number.isFinite(c.time) &&
            [c.open, c.high, c.low, c.close].every(
              (x) => Number.isFinite(x) && x > 0,
            ) &&
            Number.isFinite(c.volume) &&
            c.volume >= 0 &&
            c.low <= Math.min(c.open, c.close) &&
            c.high >= Math.max(c.open, c.close),
        )
        .map((c) => [c.time, c]),
    ).values(),
  ].sort((a, b) => a.time - b.time);
}
