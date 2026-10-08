import {
  calculateIndicators,
  evaluateSignal,
  sma,
  summarizeFlow,
  type Signal,
  type StrategySignal,
} from "./stock-indicators";
import { koreanDate, type Candle, type Flow } from "./stock-types";

export type Horizon = "day" | "swing" | "position";
export const HORIZONS = [
  { id: "day", name: "단타", detail: "당일 · 1분봉" },
  { id: "swing", name: "스윙", detail: "수일~수주 · 일봉" },
  { id: "position", name: "수개월", detail: "수개월 · 일봉·주봉" },
] as const;
export type HorizonSignal = Signal & {
  horizon: Horizon;
  method: string;
  riskMethod: string;
  flowDays: number;
  basisLabel: string;
};
const methods = {
  day: {
    method:
      "1분봉 추세 돌파·VWAP 눌림목을 각각 4조건으로 확인합니다. 당일 완료된 1분봉 60개와 장 시작 09:00부터의 VWAP가 필요합니다. 일별 수급은 단타 판정에 쓰지 않습니다.",
    riskMethod:
      "1분봉 ATR/종가 1% 초과, VWAP에서 2ATR 초과 이격, 거래량 0, 이전 20분 추정 거래대금 평균 1억원 미만은 제외합니다. 최종 완료 봉이 5분 넘게 지연되면 판정을 보류합니다. 호가·체결비용은 미반영입니다.",
    flowDays: 0,
  },
  swing: {
    method:
      "일봉 추세 지속·수축 후 돌파·눌림목 중 하나의 4조건 모두 일치하고, 최근 5거래일 외국인·기관이 각각 순매수이며 위험 기준을 통과해야 매수 검토입니다.",
    riskMethod:
      "ATR/종가 5% 초과, RSI 75 초과, MA20에서 2ATR 초과 이격, 거래량 0, 이전 20일 평균 추정 거래대금 10억원 미만은 제외합니다.",
    flowDays: 5,
  },
  position: {
    method:
      "장기 추세·120일 돌파를 각각 4조건으로 확인합니다. 60·120·200일선과 이번 주를 제외한 완료 주봉을 사용하며, 최근 20거래일 외국인·기관이 각각 순매수해야 합니다. 완료 일봉 220개 이상이 필요합니다.",
    riskMethod:
      "일봉 ATR/종가 7% 초과, RSI 80 초과, MA60에서 4ATR 초과 이격, 거래량 0, 이전 20일 평균 추정 거래대금 10억원 미만은 제외합니다. 실적·밸류에이션을 포함하지 않은 기술적 분석입니다.",
    flowDays: 20,
  },
};
function strategy(name: string, pairs: [string, boolean][]): StrategySignal {
  return {
    name,
    checks: pairs.map(([label, passed]) => ({ label, passed })),
    matched: pairs.filter(([, v]) => v).length,
  };
}
function weekStart(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
export function completedWeeks(candles: Candle[], today: string): Candle[] {
  const weeks = new Map<string, Candle>();
  for (const c of candles) {
    const key = weekStart(c.date);
    if (c.date >= today || key >= weekStart(today)) continue;
    const current = weeks.get(key);
    weeks.set(
      key,
      current
        ? {
            ...current,
            time: c.time,
            date: c.date,
            high: Math.max(current.high, c.high),
            low: Math.min(current.low, c.low),
            close: c.close,
            volume: current.volume + c.volume,
          }
        : { ...c },
    );
  }
  return [...weeks.values()];
}
export function analyzeHorizon(
  candles: Candle[],
  flows: Flow[],
  horizon: Horizon,
  now: number,
): HorizonSignal {
  const today = koreanDate(now),
    settings = methods[horizon];
  if (horizon === "swing")
    return {
      ...evaluateSignal(candles, today, flows),
      horizon,
      ...settings,
      basisLabel: "완료된 일봉",
    };
  const bars = candles.filter((c) =>
    horizon === "day"
      ? c.date === today && c.time + 60000 <= now
      : c.date < today,
  );
  const flow = summarizeFlow(
    bars,
    horizon === "day" ? [] : flows,
    settings.flowDays || 5,
  );
  const result: HorizonSignal = {
    score: null,
    label: "자료 부족",
    reasons: [],
    risks: [],
    date: bars.at(-1)?.date ?? null,
    atr: null,
    strategies: [],
    flow,
    eligible: false,
    metrics: {
      adx: null,
      atrPercent: null,
      volumeRatio: null,
      resistance: null,
      support: null,
      bandwidthPercentile: null,
    },
    horizon,
    ...settings,
    basisLabel:
      horizon === "day" ? "완료된 당일 1분봉" : "완료된 일봉·이번 주 제외 주봉",
  };
  const minimum = horizon === "day" ? 60 : 220;
  if (bars.length < minimum) {
    result.risks.push(
      `완료된 ${horizon === "day" ? "당일 1분봉" : "일봉"} ${minimum}개 이상 필요`,
    );
    return result;
  }
  const rows = calculateIndicators(
    bars,
    bars[0].date,
    horizon === "day" ? "1m" : "1d",
  );
  const r = rows.at(-1)!,
    prev = rows.at(-2)!;
  const n = (key: string) => r[key] as number,
    p = (key: string) => prev[key] as number;
  const prior = bars.slice(-21, -1);
  const avgVolume = prior.reduce((s, b) => s + b.volume, 0) / 20;
  const volumeRatio = avgVolume > 0 ? r.volume / avgVolume : null;
  result.atr = n("atr");
  result.metrics = {
    adx: n("adx"),
    atrPercent: (n("atr") / r.close) * 100,
    volumeRatio,
    resistance: Math.max(...prior.map((b) => b.high)),
    support: Math.min(...prior.map((b) => b.low)),
    bandwidthPercentile: null,
  };
  if (horizon === "day") {
    result.date = `${r.date} ${new Date(r.time).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour12: false, hour: "2-digit", minute: "2-digit" })}`;
    if (r.vwap === null || now - r.time - 60000 > 5 * 60000) {
      result.label = "단타 판정 보류";
      result.risks.push(
        r.vwap === null
          ? "09:00부터의 당일 VWAP 자료 부족"
          : "최종 완료 1분봉이 5분 이상 지연됨",
      );
      return result;
    }
    result.strategies = [
      strategy("1분봉 추세 돌파", [
        [
          "이전 20분 고가 돌파 · VWAP 위",
          r.close > result.metrics.resistance! && r.close > n("vwap"),
        ],
        [
          "EMA12 > EMA26 · EMA12 상승",
          n("ema12") > n("ema26") && n("ema12") > p("ema12"),
        ],
        [
          "RSI 50~75 · +DI > -DI",
          n("rsi") >= 50 && n("rsi") <= 75 && n("plusDI") > n("minusDI"),
        ],
        [
          "거래량 1.5배 · MFI 50~85",
          volumeRatio !== null &&
            volumeRatio >= 1.5 &&
            n("mfi") >= 50 &&
            n("mfi") <= 85,
        ],
      ]),
      strategy("VWAP 눌림목", [
        [
          "최근 3분 VWAP 접근 후 위로 복귀",
          rows
            .slice(-4, -1)
            .some(
              (v) =>
                v.low <= (v.vwap as number) * 1.001 &&
                v.low >= (v.vwap as number) - (v.atr as number),
            ) && r.close > n("vwap"),
        ],
        ["EMA12 > EMA26", n("ema12") > n("ema26")],
        [
          "양봉 · RSI 40~65 상승",
          r.close > r.open &&
            n("rsi") >= 40 &&
            n("rsi") <= 65 &&
            n("rsi") > p("rsi"),
        ],
        [
          "거래량 평균 이상 · OBV 상승",
          volumeRatio !== null && volumeRatio >= 1 && n("obv") > p("obv"),
        ],
      ]),
    ];
    if (result.metrics.atrPercent! > 1)
      result.risks.push("1분봉 변동성 1% 초과: 후보 제외");
    if (n("atr") > 0 && r.close - n("vwap") > 2 * n("atr"))
      result.risks.push("VWAP에서 2ATR 초과 이격: 후보 제외");
  } else {
    if ((Date.parse(today) - Date.parse(r.date)) / 86400000 > 7) {
      result.label = "데이터 오래됨";
      result.risks.push("최종 일봉이 7일 이상 지연됨");
      return result;
    }
    const weeks = completedWeeks(bars, today),
      weekly = calculateIndicators(weeks, weeks[0]?.date ?? "");
    const w = weekly.at(-1),
      closes = bars.map((b) => b.close),
      wc = weeks.map((b) => b.close);
    const ma60 = sma(closes, 60),
      ma120 = sma(closes, 120).at(-1),
      ma200 = sma(closes, 200).at(-1);
    const w10 = sma(wc, 10).at(-1),
      w30 = sma(wc, 30).at(-1);
    if (!w || w10 == null || w30 == null || w.signal == null || w.rsi == null) {
      result.risks.push("완료 주봉의 추세·모멘텀 자료 부족");
      return result;
    }
    const weeklyTrend = w.close > w10 && w10 > w30;
    const resistance120 = Math.max(...bars.slice(-121, -1).map((b) => b.high));
    result.strategies = [
      strategy("장기 추세 지속", [
        [
          "종가 > MA60 > MA120 > MA200 · MA60 상승",
          r.close > n("ma60") &&
            n("ma60") > ma120! &&
            ma120! > ma200! &&
            n("ma60") > ma60.at(-21)!,
        ],
        ["완료 주봉 종가 > 10주선 > 30주선", weeklyTrend],
        [
          "주봉 RSI 45~70 · MACD > 신호선",
          (w.rsi as number) >= 45 &&
            (w.rsi as number) <= 70 &&
            (w.macd as number) > (w.signal as number),
        ],
        [
          "OBV 20일 상승 · 최근 10일 거래량 유지",
          n("obv") > (rows.at(-21)!.obv as number) &&
            bars.slice(-10).reduce((s, b) => s + b.volume, 0) / 10 >=
              (bars.slice(-50, -10).reduce((s, b) => s + b.volume, 0) / 40) *
                0.8,
        ],
      ]),
      strategy("120일 가격 돌파", [
        ["종가가 이전 120일 최고가 돌파", r.close > resistance120],
        ["완료 주봉 종가 > 10주선 > 30주선", weeklyTrend],
        [
          "ADX 20 이상 · +DI > -DI",
          n("adx") >= 20 && n("plusDI") > n("minusDI"),
        ],
        [
          "거래량 1.2배 · MFI 50~80",
          volumeRatio !== null &&
            volumeRatio >= 1.2 &&
            n("mfi") >= 50 &&
            n("mfi") <= 80,
        ],
      ]),
    ];
    if (result.metrics.atrPercent! > 7)
      result.risks.push("일봉 ATR/종가 7% 초과: 후보 제외");
    if (n("rsi") > 80) result.risks.push("RSI 80 초과: 후보 제외");
    if (n("atr") > 0 && r.close - n("ma60") > 4 * n("atr"))
      result.risks.push("MA60에서 4ATR 초과 이격: 후보 제외");
    if (flow.status !== "동반 순매수")
      result.risks.push(
        flow.status === "자료 부족"
          ? `최근 20거래일 수급 ${flow.days}/20개: 판정 보류`
          : `최근 20거래일 ${flow.status}: 수급 기준 미충족`,
      );
  }
  const turnover = prior.reduce((s, b) => s + b.close * b.volume, 0) / 20;
  if (r.volume <= 0 || avgVolume <= 0)
    result.risks.push("거래량 부족: 후보 제외");
  if (turnover < (horizon === "day" ? 1e8 : 1e9))
    result.risks.push("평균 추정 거래대금 기준 미달: 후보 제외");
  const best = [...result.strategies].sort((a, b) => b.matched - a.matched)[0];
  result.score = best.matched * 25;
  result.reasons = best.checks
    .filter((c) => c.passed)
    .map((c) => `${best.name}: ${c.label}`);
  result.eligible = best.matched === 4 && result.risks.length === 0;
  result.label = result.eligible
    ? "매수 검토"
    : result.risks.length
      ? "위험·자료 조건 미충족"
      : "조건 관찰";
  return result;
}
