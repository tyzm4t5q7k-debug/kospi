import type { Candle, Flow } from "./stock-types";
type N = number | null;
type Series = N[];
export type Indicator = {
  id: string;
  name: string;
  keys: string[];
  note: string;
  unit?: string;
};
export const OVERLAYS: Indicator[] = [
  {
    id: "ma",
    name: "이동평균선",
    keys: ["ma5", "ma20", "ma60"],
    note: "종가 단순평균 5·20·60봉",
  },
  {
    id: "ema",
    name: "지수이동평균선",
    keys: ["ema12", "ema26"],
    note: "12·26봉 EMA, 최초 기간 단순평균으로 시작",
  },
  {
    id: "bb",
    name: "볼린저 밴드",
    keys: ["bbUpper", "ma20", "bbLower"],
    note: "20봉 평균 ± 2×모표준편차",
  },
  {
    id: "ichimoku",
    name: "일목균형표",
    keys: ["tenkan", "kijun", "spanA", "spanB", "chikou"],
    note: "9·26·52봉 / 선행스팬 +26봉, 후행스팬 −26봉. 미래 영역은 표시하지 않음",
  },
  {
    id: "supertrend",
    name: "슈퍼트렌드",
    keys: ["supertrend"],
    note: "Wilder ATR 10봉, 배수 3",
  },
  {
    id: "profile",
    name: "매물대분석",
    keys: [],
    note: "표시 구간 봉의 고가~저가에 거래량을 균등 배분한 18구간 근사치. 실제 가격별 체결량과 다름",
  },
  {
    id: "envelope",
    name: "엔벨로프",
    keys: ["envUpper", "ma20", "envLower"],
    note: "20봉 단순평균 ± 3%",
  },
  {
    id: "fractal",
    name: "윌리엄스 프랙탈",
    keys: ["fractalHigh", "fractalLow"],
    note: "좌우 2봉보다 높은 고점·낮은 저점. 2봉 뒤 확정되므로 최신 2봉에는 미표시",
  },
  {
    id: "sar",
    name: "파라볼릭 SAR",
    keys: ["sar"],
    note: "가속계수 0.02, 증가 0.02, 최대 0.2",
  },
  {
    id: "channel",
    name: "프라이스 채널",
    keys: ["channelHigh", "channelLow"],
    note: "최근 20봉 최고·최저 (현재 봉 포함)",
  },
  {
    id: "vwap",
    name: "VWAP",
    keys: ["vwap"],
    note: "분봉 전용. 한국시간 거래일마다 초기화. 조회가 장 중간부터면 해당 날짜는 생략",
  },
  {
    id: "avwap",
    name: "고정된 VWAP",
    keys: ["avwap"],
    note: "선택한 기준일 이후 (고가+저가+종가)/3 × 거래량의 누적 가중평균",
  },
];
export const OSCILLATORS: Indicator[] = [
  {
    id: "volume",
    name: "거래량",
    keys: ["volume"],
    note: "봉별 거래량",
    unit: "주",
  },
  {
    id: "rsi",
    name: "RSI",
    keys: ["rsi"],
    note: "Wilder 14봉, 30·70 참고선",
    unit: "0~100",
  },
  {
    id: "macd",
    name: "MACD",
    keys: ["macd", "signal", "histogram"],
    note: "EMA 12−26 / 신호 EMA 9",
    unit: "원",
  },
  {
    id: "stochastic",
    name: "스토캐스틱",
    keys: ["stochK", "stochD"],
    note: "14봉 Fast %K / 3봉 %D",
    unit: "0~100",
  },
  {
    id: "stochRsi",
    name: "스토캐스틱 RSI",
    keys: ["stochRsi"],
    note: "RSI 14의 최근 14봉 범위 내 위치",
    unit: "0~100",
  },
  {
    id: "williams",
    name: "윌리엄스 R",
    keys: ["williams"],
    note: "14봉 최고·최저 대비 종가 위치",
    unit: "−100~0",
  },
  {
    id: "disparity",
    name: "이격도",
    keys: ["disparity"],
    note: "종가 ÷ 20봉 평균 × 100",
    unit: "%",
  },
  {
    id: "mass",
    name: "매스 인덱스",
    keys: ["mass"],
    note: "고저폭의 EMA9 ÷ 이중 EMA9, 25봉 합",
  },
  {
    id: "momentum",
    name: "모멘텀",
    keys: ["momentum"],
    note: "종가 − 10봉 전 종가",
    unit: "원",
  },
  {
    id: "vo",
    name: "볼륨 오실레이터",
    keys: ["vo"],
    note: "(거래량 EMA5−EMA10) ÷ EMA10 × 100",
    unit: "%",
  },
  {
    id: "percentB",
    name: "볼린저 밴드 %B",
    keys: ["percentB"],
    note: "(종가−하단) ÷ 밴드폭 × 100",
    unit: "%",
  },
  {
    id: "bandwidth",
    name: "볼린저 밴드폭",
    keys: ["bandwidth"],
    note: "(상단−하단) ÷ 20봉 평균 × 100",
    unit: "%",
  },
  {
    id: "intensity",
    name: "일중 강도 지수",
    keys: ["intensity"],
    note: "(2×종가−고가−저가) ÷ 고저폭 × 거래량",
    unit: "주",
  },
  {
    id: "chaikin",
    name: "체이킨 오실레이터",
    keys: ["chaikin"],
    note: "AD 라인의 EMA3 − EMA10",
    unit: "주",
  },
  {
    id: "trix",
    name: "트릭스",
    keys: ["trix"],
    note: "종가의 3중 EMA15, 전봉 대비 변화율",
    unit: "%",
  },
  {
    id: "ppo",
    name: "프라이스 오실레이터",
    keys: ["ppo"],
    note: "(EMA12−EMA26) ÷ EMA26 × 100 (PPO)",
    unit: "%",
  },
  {
    id: "ad",
    name: "AD 라인",
    keys: ["ad"],
    note: "일중 강도 지수 누적. 고저폭 0이면 증분 0",
    unit: "주",
  },
  { id: "adx", name: "ADX", keys: ["adx"], note: "Wilder 14봉, 추세 강도" },
  {
    id: "atr",
    name: "ATR",
    keys: ["atr"],
    note: "Wilder 14봉, 갭을 포함한 진폭 평균",
    unit: "원",
  },
  {
    id: "cci",
    name: "CCI",
    keys: ["cci"],
    note: "20봉 대표가격 평균편차, 계수 0.015",
  },
  {
    id: "dmi",
    name: "DMI",
    keys: ["plusDI", "minusDI", "adx"],
    note: "Wilder 14봉 +DI·−DI·ADX",
  },
  {
    id: "mfi",
    name: "MFI",
    keys: ["mfi"],
    note: "14봉 양·음의 대표가격×거래량",
    unit: "0~100",
  },
  {
    id: "obv",
    name: "OBV",
    keys: ["obv"],
    note: "상승봉 거래량 가산 / 하락봉 차감, 최초 0",
    unit: "주",
  },
  {
    id: "roc",
    name: "ROC",
    keys: ["roc"],
    note: "12봉 전 종가 대비 변화율",
    unit: "%",
  },
  {
    id: "rmi",
    name: "RMI",
    keys: ["rmi"],
    note: "5봉 모멘텀의 Wilder 14봉 상대강도",
    unit: "0~100",
  },
];
export const KEY_LABELS: Record<string, string> = {
  ma5: "MA 5",
  ma20: "MA 20",
  ma60: "MA 60",
  ema12: "EMA 12",
  ema26: "EMA 26",
  bbUpper: "BB 상단",
  bbLower: "BB 하단",
  tenkan: "전환선",
  kijun: "기준선",
  spanA: "선행 A",
  spanB: "선행 B",
  chikou: "후행스팬",
  envUpper: "엔벨로프 상단",
  envLower: "엔벨로프 하단",
  fractalHigh: "상단 프랙탈",
  fractalLow: "하단 프랙탈",
  channelHigh: "채널 상단",
  channelLow: "채널 하단",
  stochK: "%K",
  stochD: "%D",
  signal: "신호선",
  histogram: "히스토그램",
  plusDI: "+DI",
  minusDI: "−DI",
};
export function sma(values: Series, period: number): Series {
  return values.map((_, i) => {
    const w = values.slice(i - period + 1, i + 1);
    return i >= period - 1 && w.every((v) => v !== null)
      ? (w as number[]).reduce((a, b) => a + b, 0) / period
      : null;
  });
}
export function ema(values: Series, period: number, wilder = false): Series {
  let prev: N = null;
  let seed: number[] = [];
  const alpha = wilder ? 1 / period : 2 / (period + 1);
  return values.map((v) => {
    if (v === null) {
      prev = null;
      seed = [];
      return null;
    }
    if (prev === null) {
      seed.push(v);
      if (seed.length < period) return null;
      prev = seed.reduce((a, b) => a + b, 0) / period;
    } else prev += alpha * (v - prev);
    return prev;
  });
}
const ratio = (a: N, b: N, scale = 1): N =>
  a === null || b === null || b === 0 ? null : (scale * a) / b;
const diff = (a: Series, b: Series) =>
  a.map((v, i) => (v === null || b[i] === null ? null : v - b[i]!));
const windowExtreme = (a: number[], i: number, n: number, max = true): N =>
  i < n - 1 ? null : (max ? Math.max : Math.min)(...a.slice(i - n + 1, i + 1));
function relativeStrength(close: number[], period = 14, lag = 1): Series {
  const moves = close.map((v, i) => (i < lag ? null : v - close[i - lag]));
  const gain = ema(
      moves.map((v) => (v === null ? null : Math.max(0, v))),
      period,
      true,
    ),
    loss = ema(
      moves.map((v) => (v === null ? null : Math.max(0, -v))),
      period,
      true,
    );
  return gain.map((g, i) =>
    g === null || loss[i] === null
      ? null
      : g === 0 && loss[i] === 0
        ? 50
        : loss[i] === 0
          ? 100
          : 100 - 100 / (1 + g / loss[i]!),
  );
}
export type IndicatorRow = Candle &
  Record<string, number | string | null | number[]>;
export function calculateIndicators(
  candles: Candle[],
  anchor: string,
  interval: "1d" | "1m" = "1d",
): IndicatorRow[] {
  const c = candles.map((x) => x.close),
    h = candles.map((x) => x.high),
    l = candles.map((x) => x.low),
    v = candles.map((x) => x.volume),
    tp = c.map((x, i) => (x + h[i] + l[i]) / 3);
  const out: Record<string, Series> = {};
  for (const p of [5, 20, 60]) out[`ma${p}`] = sma(c, p);
  out.ema12 = ema(c, 12);
  out.ema26 = ema(c, 26);
  out.rsi = relativeStrength(c);
  out.rmi = relativeStrength(c, 14, 5);
  const mid = out.ma20,
    sd = c.map((_, i) =>
      i < 19
        ? null
        : Math.sqrt(
            c
              .slice(i - 19, i + 1)
              .reduce((sum, x) => sum + (x - mid[i]!) ** 2, 0) / 20,
          ),
    );
  out.bbUpper = mid.map((x, i) => (x === null ? null : x + 2 * sd[i]!));
  out.bbLower = mid.map((x, i) => (x === null ? null : x - 2 * sd[i]!));
  out.envUpper = mid.map((x) => (x === null ? null : x * 1.03));
  out.envLower = mid.map((x) => (x === null ? null : x * 0.97));
  out.percentB = c.map((x, i) =>
    ratio(
      out.bbLower[i] === null ? null : x - out.bbLower[i]!,
      sd[i] === null ? null : 4 * sd[i]!,
      100,
    ),
  );
  out.bandwidth = sd.map((x, i) =>
    ratio(x === null ? null : 4 * x, mid[i], 100),
  );
  out.disparity = c.map((x, i) => ratio(x, mid[i], 100));
  out.macd = diff(out.ema12, out.ema26);
  out.signal = ema(out.macd, 9);
  out.histogram = diff(out.macd, out.signal);
  out.ppo = out.macd.map((x, i) => ratio(x, out.ema26[i], 100));
  out.momentum = c.map((x, i) => (i < 10 ? null : x - c[i - 10]));
  out.roc = c.map((x, i) => (i < 12 ? null : 100 * (x / c[i - 12] - 1)));
  const ev5 = ema(v, 5),
    ev10 = ema(v, 10);
  out.vo = ev5.map((x, i) =>
    ratio(x === null || ev10[i] === null ? null : x - ev10[i]!, ev10[i], 100),
  );
  const tr = c.map((_, i) =>
    i === 0
      ? h[i] - l[i]
      : Math.max(
          h[i] - l[i],
          Math.abs(h[i] - c[i - 1]),
          Math.abs(l[i] - c[i - 1]),
        ),
  );
  out.atr = ema(tr, 14, true);
  const dmPlus = h.map((x, i) =>
    i === 0
      ? null
      : x - h[i - 1] > l[i - 1] - l[i]
        ? Math.max(0, x - h[i - 1])
        : 0,
  );
  const dmMinus = l.map((x, i) =>
    i === 0
      ? null
      : l[i - 1] - x > h[i] - h[i - 1]
        ? Math.max(0, l[i - 1] - x)
        : 0,
  );
  const dtr = ema(
      tr.map((x, i) => (i === 0 ? null : x)),
      14,
      true,
    ),
    dp = ema(dmPlus, 14, true),
    dn = ema(dmMinus, 14, true);
  out.plusDI = dp.map((x, i) => (dtr[i] === 0 ? 0 : ratio(x, dtr[i], 100)));
  out.minusDI = dn.map((x, i) => (dtr[i] === 0 ? 0 : ratio(x, dtr[i], 100)));
  const dx = out.plusDI.map((x, i) =>
    x === null || out.minusDI[i] === null
      ? null
      : x + out.minusDI[i] === 0
        ? 0
        : (100 * Math.abs(x - out.minusDI[i]!)) / (x + out.minusDI[i]!),
  );
  out.adx = ema(dx, 14, true);
  out.stochK = c.map((x, i) => {
    const hi = windowExtreme(h, i, 14),
      lo = windowExtreme(l, i, 14, false);
    return hi === null || lo === null
      ? null
      : hi === lo
        ? 50
        : (100 * (x - lo)) / (hi - lo);
  });
  out.stochD = sma(out.stochK, 3);
  out.williams = out.stochK.map((x) => (x === null ? null : x - 100));
  out.stochRsi = out.rsi.map((x, i) => {
    const w = out.rsi.slice(i - 13, i + 1);
    if (i < 13 || w.some((x) => x === null) || x === null) return null;
    const lo = Math.min(...(w as number[])),
      hi = Math.max(...(w as number[]));
    return hi === lo ? 50 : (100 * (x - lo)) / (hi - lo);
  });
  const tpMean = sma(tp, 20);
  out.cci = tp.map((x, i) => {
    if (i < 19) return null;
    const dev =
      tp
        .slice(i - 19, i + 1)
        .reduce((a, b) => a + Math.abs(b - tpMean[i]!), 0) / 20;
    return dev === 0 ? 0 : (x - tpMean[i]!) / (0.015 * dev);
  });
  out.intensity = c.map((x, i) =>
    h[i] === l[i] ? 0 : ((2 * x - h[i] - l[i]) / (h[i] - l[i])) * v[i],
  );
  let ad = 0,
    obv = 0;
  out.ad = out.intensity.map((x) => (ad += x!));
  out.obv = c.map((x, i) => {
    if (i) obv += Math.sign(x - c[i - 1]) * v[i];
    return obv;
  });
  out.chaikin = diff(ema(out.ad, 3), ema(out.ad, 10));
  out.mfi = tp.map((_, i) => {
    if (i < 14) return null;
    let pos = 0,
      neg = 0;
    for (let j = i - 13; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += tp[j] * v[j];
      else if (tp[j] < tp[j - 1]) neg += tp[j] * v[j];
    }
    return pos === 0 && neg === 0
      ? 50
      : neg === 0
        ? 100
        : 100 - 100 / (1 + pos / neg);
  });
  const triple = ema(ema(ema(c, 15), 15), 15);
  out.trix = triple.map((x, i) =>
    i === 0 || x === null || triple[i - 1] === null
      ? null
      : ratio(x - triple[i - 1]!, triple[i - 1], 100),
  );
  const rangeEMA = ema(
      h.map((x, i) => x - l[i]),
      9,
    ),
    rangeDouble = ema(rangeEMA, 9),
    massRatio = rangeEMA.map((x, i) => ratio(x, rangeDouble[i]));
  out.mass = sma(massRatio, 25).map((x) => (x === null ? null : 25 * x));
  out.channelHigh = h.map((_, i) => windowExtreme(h, i, 20));
  out.channelLow = l.map((_, i) => windowExtreme(l, i, 20, false));
  const midRange = (i: number, p: number) =>
    i < p - 1
      ? null
      : (windowExtreme(h, i, p)! + windowExtreme(l, i, p, false)!) / 2;
  out.tenkan = c.map((_, i) => midRange(i, 9));
  out.kijun = c.map((_, i) => midRange(i, 26));
  out.spanA = c.map((_, i) =>
    i < 51 ? null : (out.tenkan[i - 26]! + out.kijun[i - 26]!) / 2,
  );
  out.spanB = c.map((_, i) => (i < 77 ? null : midRange(i - 26, 52)));
  out.chikou = c.map((_, i) => (i + 26 < c.length ? c[i + 26] : null));
  out.fractalHigh = h.map((x, i) =>
    i >= 2 &&
    i + 2 < h.length &&
    [i - 2, i - 1, i + 1, i + 2].every((j) => x > h[j])
      ? x
      : null,
  );
  out.fractalLow = l.map((x, i) =>
    i >= 2 &&
    i + 2 < l.length &&
    [i - 2, i - 1, i + 1, i + 2].every((j) => x < l[j])
      ? x
      : null,
  );
  let pv = 0,
    vol = 0,
    day = "",
    completeSession = false,
    av = 0,
    ap = 0;
  out.vwap = [];
  out.avwap = [];
  candles.forEach((bar, i) => {
    if (bar.date !== day) {
      day = bar.date;
      pv = 0;
      vol = 0;
      const hhmm = new Date(bar.time + 9 * 3600000).toISOString().slice(11, 16);
      completeSession = hhmm <= "09:00";
    }
    pv += tp[i] * v[i];
    vol += v[i];
    out.vwap.push(
      interval === "1m" && completeSession && vol ? pv / vol : null,
    );
    if (bar.date >= anchor) {
      ap += tp[i] * v[i];
      av += v[i];
      out.avwap.push(av ? ap / av : null);
    } else out.avwap.push(null);
  });
  const a10 = ema(tr, 10, true);
  let upper = 0,
    lower = 0,
    st: N = null;
  out.supertrend = c.map((x, i) => {
    if (a10[i] === null) return null;
    const bu = (h[i] + l[i]) / 2 + 3 * a10[i]!,
      bl = (h[i] + l[i]) / 2 - 3 * a10[i]!;
    if (st === null) {
      upper = bu;
      lower = bl;
      st = x >= (h[i] + l[i]) / 2 ? lower : upper;
    } else {
      const oldUpper = upper;
      upper = bu < upper || c[i - 1] > upper ? bu : upper;
      lower = bl > lower || c[i - 1] < lower ? bl : lower;
      st =
        st === oldUpper
          ? x > upper
            ? lower
            : upper
          : x < lower
            ? upper
            : lower;
    }
    return st;
  });
  let up = c.length > 1 && c[1] >= c[0],
    sar = up ? l[0] : h[0],
    ep = up ? h[0] : l[0],
    af = 0.02;
  out.sar = c.map((_, i) => {
    if (i === 0) return null;
    sar += af * (ep - sar);
    sar = up
      ? Math.min(sar, l[i - 1], l[Math.max(0, i - 2)])
      : Math.max(sar, h[i - 1], h[Math.max(0, i - 2)]);
    if (up && l[i] < sar) {
      up = false;
      sar = ep;
      ep = l[i];
      af = 0.02;
    } else if (!up && h[i] > sar) {
      up = true;
      sar = ep;
      ep = h[i];
      af = 0.02;
    } else if ((up && h[i] > ep) || (!up && l[i] < ep)) {
      ep = up ? h[i] : l[i];
      af = Math.min(0.2, af + 0.02);
    }
    return sar;
  });
  return candles.map((bar, i) => ({
    ...bar,
    range: [bar.low, bar.high],
    ...Object.fromEntries(
      Object.entries(out).map(([key, values]) => [key, values[i] ?? null]),
    ),
  }));
}
export function volumeProfile(candles: Candle[], bins = 18) {
  if (!candles.length) return [];
  const low = Math.min(...candles.map((c) => c.low)),
    high = Math.max(...candles.map((c) => c.high));
  const size = (high - low || 1) / bins;
  const result = Array.from({ length: bins }, (_, i) => ({
    price: low + (i + 0.5) * size,
    volume: 0,
  }));
  for (const bar of candles) {
    const start = Math.min(bins - 1, Math.floor((bar.low - low) / size)),
      end = Math.min(bins - 1, Math.floor((bar.high - low) / size));
    for (let i = start; i <= end; i++)
      result[i].volume += bar.volume / (end - start + 1);
  }
  return result.reverse();
}
export type Signal = {
  score: number | null;
  label: string;
  reasons: string[];
  risks: string[];
  date: string | null;
  atr: number | null;
  strategies: StrategySignal[];
  flow: FlowSignal;
  eligible: boolean;
  metrics: {
    adx: N;
    atrPercent: N;
    volumeRatio: N;
    resistance: N;
    support: N;
    bandwidthPercentile: N;
  };
};
export type StrategySignal = {
  name: string;
  checks: { label: string; passed: boolean }[];
  matched: number;
};
export type FlowSignal = {
  status: "동반 순매수" | "동반 순매도" | "엇갈린 수급" | "자료 부족";
  days: number;
  start: string | null;
  end: string | null;
  foreigner: N;
  institution: N;
  shortPercent: N;
  shortDate: string | null;
  creditChange: N;
  lendingChange: N;
  balancePeriod: string | null;
};
export function summarizeFlow(
  bars: Candle[],
  flows: Flow[],
  requiredDays = 5,
): FlowSignal {
  // Require every one of the last five completed sessions; missing is never neutral/zero.
  const last = bars.slice(-requiredDays);
  const byDate = new Map(flows.map((f) => [f.date, f]));
  const records = last.map((b) => byDate.get(b.date));
  const valid = records.filter(
    (f): f is Flow => !!f && f.foreigner !== null && f.institution !== null,
  );
  const complete =
    last.length === requiredDays && valid.length === requiredDays;
  const foreigner = complete
    ? valid.reduce((s, f) => s + f.foreigner!, 0)
    : null;
  const institution = complete
    ? valid.reduce((s, f) => s + f.institution!, 0)
    : null;
  let latestShortIndex = -1;
  records.forEach((f, i) => {
    if (f?.short != null && last[i].volume > 0) latestShortIndex = i;
  });
  const shortBar = last[latestShortIndex];
  const short = records[latestShortIndex];
  const balanceRows = records.filter(
    (f): f is Flow => !!f && f.credit !== null && f.lending !== null,
  );
  const first = balanceRows.at(0),
    end = balanceRows.at(-1);
  const percent = (a: N | undefined, b: N | undefined): N =>
    a != null && b != null && a > 0 ? (b / a - 1) * 100 : null;
  return {
    status: !complete
      ? "자료 부족"
      : foreigner! > 0 && institution! > 0
        ? "동반 순매수"
        : foreigner! < 0 && institution! < 0
          ? "동반 순매도"
          : "엇갈린 수급",
    days: valid.length,
    start: last.at(0)?.date ?? null,
    end: last.at(-1)?.date ?? null,
    foreigner,
    institution,
    shortPercent:
      short && shortBar ? (short.short! / shortBar.volume) * 100 : null,
    shortDate: short?.date ?? null,
    creditChange:
      balanceRows.length >= 2 ? percent(first?.credit, end?.credit) : null,
    lendingChange:
      balanceRows.length >= 2 ? percent(first?.lending, end?.lending) : null,
    balancePeriod:
      balanceRows.length >= 2 ? `${first!.date} → ${end!.date}` : null,
  };
}
export function evaluateSignal(
  candles: Candle[],
  today: string,
  flows: Flow[] = [],
): Signal {
  // Completed days only. Forward-shifted visual indicators never enter the score.
  const bars = candles.filter((b) => b.date < today);
  const rows = calculateIndicators(bars, bars[0]?.date ?? "");
  const r = rows.at(-1),
    prev = rows.at(-2);
  const flow = summarizeFlow(bars, flows);
  const emptyMetrics = {
    adx: null,
    atrPercent: null,
    volumeRatio: null,
    resistance: null,
    support: null,
    bandwidthPercentile: null,
  };
  if (!r || !prev || bars.length < 90)
    return {
      score: null,
      label: "자료 부족",
      reasons: [],
      risks: ["완료된 일봉 90개 이상 필요"],
      date: r?.date ?? null,
      atr: null,
      strategies: [],
      flow,
      eligible: false,
      metrics: emptyMetrics,
    };
  const risks: string[] = [];
  const n = (key: string) => r[key] as number;
  const p = (key: string) => prev[key] as number;
  const avgVol = bars.slice(-21, -1).reduce((s, b) => s + b.volume, 0) / 20;
  const volumeRatio = avgVol > 0 ? r.volume / avgVol : null;
  const prior20 = bars.slice(-21, -1);
  const resistance = Math.max(...prior20.map((b) => b.high));
  const support = Math.min(...prior20.map((b) => b.low));
  const widths = rows
    .slice(-62, -2)
    .map((v) => v.bandwidth as N)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  // Compare yesterday's squeeze to the preceding 60 sessions, excluding today's breakout.
  const bandwidthPercentile =
    widths.length === 60
      ? (widths.filter((v) => v <= p("bandwidth")).length / 60) * 100
      : null;
  const strategy = (
    name: string,
    checks: [string, boolean][],
  ): StrategySignal => ({
    name,
    checks: checks.map(([label, passed]) => ({ label, passed })),
    matched: checks.filter(([, yes]) => yes).length,
  });
  const strategies = [
    strategy("추세 지속", [
      [
        "종가 > MA20 > MA60, MA20 상승",
        r.close > n("ma20") && n("ma20") > n("ma60") && n("ma20") > p("ma20"),
      ],
      ["ADX 20 이상 · +DI > -DI", n("adx") >= 20 && n("plusDI") > n("minusDI")],
      [
        "MACD 히스토그램 양수·증가, RSI 40~70",
        n("histogram") > 0 &&
          n("histogram") > p("histogram") &&
          n("rsi") >= 40 &&
          n("rsi") <= 70,
      ],
      [
        "거래량 평균 이상 · OBV 5봉 전보다 상승",
        volumeRatio !== null &&
          volumeRatio >= 1 &&
          n("obv") > (rows.at(-6)!.obv as number),
      ],
    ]),
    strategy("변동성 수축 후 돌파", [
      ["종가가 이전 20봉 최고가 돌파", r.close > resistance],
      [
        "전일 BB 폭이 앞선 60봉 하위 30%",
        bandwidthPercentile !== null && bandwidthPercentile <= 30,
      ],
      [
        "종가 > MA60 · +DI > -DI",
        r.close > n("ma60") && n("plusDI") > n("minusDI"),
      ],
      [
        "거래량 1.5배 이상 · MFI 50~80",
        volumeRatio !== null &&
          volumeRatio >= 1.5 &&
          n("mfi") >= 50 &&
          n("mfi") <= 80,
      ],
    ]),
    strategy("상승 추세 눌림목", [
      [
        "MA20 > MA60 · 종가 > MA60",
        n("ma20") > n("ma60") && r.close > n("ma60"),
      ],
      [
        "최근 5봉 MA20 접근 후 MA20 위 양봉",
        rows
          .slice(-6, -1)
          .some(
            (v) =>
              v.low <= (v.ma20 as number) * 1.02 && v.low >= (v.ma60 as number),
          ) &&
          r.close >= n("ma20") &&
          r.close > r.open,
      ],
      [
        "RSI 40~65 상승 · 스토캐스틱 상향 교차",
        n("rsi") >= 40 &&
          n("rsi") <= 65 &&
          n("rsi") > p("rsi") &&
          p("stochK") <= p("stochD") &&
          p("stochK") <= 50 &&
          n("stochK") > n("stochD"),
      ],
      [
        "거래량 평균의 0.8배 이상 · OBV 상승",
        volumeRatio !== null && volumeRatio >= 0.8 && n("obv") > p("obv"),
      ],
    ]),
  ];
  const best = [...strategies].sort((a, b) => b.matched - a.matched)[0];
  const reasons = best.checks
    .filter((c) => c.passed)
    .map((c) => `${best.name}: ${c.label}`);
  const atrPercent = (n("atr") / r.close) * 100;
  if (atrPercent > 5) risks.push("ATR/종가 5% 초과: 변동성 위험으로 후보 제외");
  if (n("rsi") > 75) risks.push("RSI 75 초과: 과열로 후보 제외");
  if (n("atr") > 0 && r.close - n("ma20") > 2 * n("atr"))
    risks.push("MA20에서 2ATR 이상 이격: 추격 위험으로 후보 제외");
  if (r.volume <= 0 || avgVol <= 0) risks.push("거래량 부족으로 후보 제외");
  const avgTurnover = prior20.reduce((s, b) => s + b.close * b.volume, 0) / 20;
  if (avgTurnover < 1e9)
    risks.push("20일 평균 추정 거래대금 10억원 미만: 유동성 기준 미달");
  const blocked = risks.length > 0;
  if (flow.status === "동반 순매도")
    risks.push("최근 5거래일 외국인·기관 동반 순매도: 후보 제외");
  if (flow.status === "자료 부족")
    risks.push(
      `완료된 최근 5거래일 수급 ${flow.days}/5개: 매수 검토 판정 보류`,
    );
  const eligible =
    best.matched === 4 && !blocked && flow.status === "동반 순매수";
  const metrics = {
    adx: n("adx"),
    atrPercent,
    volumeRatio,
    resistance,
    support,
    bandwidthPercentile,
  };
  const elapsed = (Date.parse(today) - Date.parse(r.date)) / 86400000;
  if (elapsed > 7)
    return {
      score: null,
      label: "데이터 오래됨",
      reasons,
      risks: [...risks, "최종 일봉이 7일 이상 지연되어 점수 보류"],
      date: r.date,
      atr: n("atr"),
      strategies,
      flow,
      eligible: false,
      metrics,
    };
  return {
    score: best.matched * 25,
    label: eligible
      ? "매수 검토"
      : blocked || flow.status === "동반 순매도"
        ? "위험 조건 · 제외"
        : best.matched === 4
          ? "기술조건 일치 · 수급 대기"
          : "조건 관찰",
    reasons,
    risks,
    date: r.date,
    atr: n("atr"),
    strategies,
    flow,
    eligible,
    metrics,
  };
}
