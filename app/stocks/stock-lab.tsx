"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  ArrowUpRight,
  Activity,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  BarChart3,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import {
  STOCKS,
  koreanDate,
  type StockData,
  type Stock,
  type Interval,
} from "../../lib/stock-types";
import {
  OVERLAYS,
  OSCILLATORS,
  KEY_LABELS,
  calculateIndicators,
  evaluateSignal,
  volumeProfile,
} from "../../lib/stock-indicators";
import styles from "./stocks.module.css";

const colors = [
  "#67e8d2",
  "#c4b5fd",
  "#fbbf24",
  "#60a5fa",
  "#f472b6",
  "#a3e635",
];
const fmt = (n: unknown, digits = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("ko-KR", { maximumFractionDigits: digits })
    : "—";
const compact = (n: number) =>
  Math.abs(n) >= 1e8
    ? `${fmt(n / 1e8, 1)}억`
    : Math.abs(n) >= 1e4
      ? `${fmt(n / 1e4, 1)}만`
      : fmt(n, 1);
const clock = (date: string | null) =>
  date
    ? new Date(date).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "시각 미제공";
const label = (key: string) =>
  KEY_LABELS[key] ??
  [...OVERLAYS, ...OSCILLATORS].find((x) => x.keys[0] === key)?.name ??
  key;
function CandleShape({ x, y, width, height, payload }: any) {
  if (!payload || !Number.isFinite(y)) return null;
  const up = payload.close >= payload.open,
    color = up ? "#fb7185" : "#60a5fa",
    range = payload.high - payload.low;
  const py = (price: number) =>
    range ? y + ((payload.high - price) / range) * height : y;
  return (
    <g>
      <line
        x1={x + width / 2}
        x2={x + width / 2}
        y1={y}
        y2={y + height}
        stroke={color}
      />
      <rect
        x={x + width * 0.12}
        y={Math.min(py(payload.open), py(payload.close))}
        width={Math.max(1, width * 0.76)}
        height={Math.max(1, Math.abs(py(payload.open) - py(payload.close)))}
        fill={color}
      />
    </g>
  );
}
function ChartTip({ active, payload, label: date }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <strong>{date}</strong>
      {row.open !== undefined && (
        <div>
          시 {fmt(row.open)}　고 {fmt(row.high)}
          <br />저 {fmt(row.low)}　종 {fmt(row.close)}
          <br />
          거래량 {fmt(row.volume)}주
        </div>
      )}
      {payload
        .filter((p: any) => p.dataKey !== "range")
        .map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {label(String(p.dataKey))}: {fmt(p.value, 2)}
          </div>
        ))}
    </div>
  );
}
type ScreenResult = {
  rows: {
    stock: Stock;
    signal: ReturnType<typeof evaluateSignal>;
    source: string;
    price: number;
  }[];
  failed: string[];
  universe: number;
  asOf: string;
};
const FLOW_OPTIONS = [
  {
    id: "net",
    name: "외국인·기관·개인 순매수량",
    keys: ["foreigner", "institution", "individual"],
  },
  { id: "short", name: "일별 공매도 거래량", keys: ["short"] },
  { id: "holding", name: "외국인 보유수량", keys: ["foreignHolding"] },
  { id: "rate", name: "외국인 지분율", keys: ["foreignRate"] },
  { id: "credit", name: "일별 신용잔고 수량", keys: ["credit"] },
  { id: "lending", name: "일별 대차잔고 수량", keys: ["lending"] },
];
const FLOW_LABELS: Record<string, string> = {
  foreigner: "외국인",
  institution: "기관",
  individual: "개인",
  short: "공매도 거래량",
  foreignHolding: "외국인 보유수량",
  foreignRate: "외국인 지분율 (%)",
  credit: "신용융자 잔고",
  lending: "대차잔고",
};

export function StockLab() {
  const [stock, setStock] = useState<Stock>(STOCKS[0]),
    [query, setQuery] = useState(""),
    [market, setMarket] = useState("KOSPI"),
    [interval, setIntervalValue] = useState<Interval>("1d");
  const [data, setData] = useState<StockData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [quoteError, setQuoteError] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [overlays, setOverlays] = useState(["ma"]),
    [oscillator, setOscillator] = useState("rsi"),
    [showSettings, setShowSettings] = useState(false),
    [bars, setBars] = useState(100),
    [anchor, setAnchor] = useState("");
  const [tab, setTab] = useState("chart"),
    [screen, setScreen] = useState<ScreenResult | null>(null),
    [scanning, setScanning] = useState(false),
    [scanError, setScanError] = useState(""),
    [flowId, setFlowId] = useState("net");
  const [automatic, setAutomatic] = useState(true);
  const automaticRef = useRef(automatic);
  automaticRef.current = automatic;
  useEffect(() => {
    setAnchor("");
  }, [stock, interval]);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    setData(null);
    setError("");
    setLoading(true);
    setQuoteError(false);
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch(
          `/api/stocks?code=${stock.code}&market=${stock.market}&interval=${interval}`,
          { signal: controller.signal },
        );
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
        if (!controller.signal.aborted) {
          setData(json);
          setError("");
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "시세 조회 실패");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        busy = false;
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (automaticRef.current && !document.hidden) void load();
    }, 60000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [stock, interval, refresh]);
  useEffect(() => {
    if (data?.source !== "Toss" || !automatic) return;
    const controller = new AbortController();
    let busy = false;
    const timer = window.setInterval(async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const r = await fetch(`/api/stocks/quote?code=${stock.code}`, {
          signal: controller.signal,
        });
        const j = await r.json();
        if (!r.ok || !j.quote) throw new Error();
        if (!controller.signal.aborted) {
          setData((prev) =>
            prev && prev.stock.code === stock.code
              ? { ...prev, quote: j.quote }
              : prev,
          );
          setQuoteError(false);
        }
      } catch {
        if (!controller.signal.aborted) setQuoteError(true);
      } finally {
        busy = false;
      }
    }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [data?.source, stock.code, automatic]);
  const rows = useMemo(
    () =>
      calculateIndicators(
        data?.candles ?? [],
        anchor || data?.candles[0]?.date || "",
        interval,
      ),
    [data?.candles, anchor, interval],
  );
  const visible = useMemo(
    () =>
      rows
        .slice(-bars)
        .map((r) => ({
          ...r,
          display:
            interval === "1d"
              ? r.date
              : new Date(r.time).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
        })),
    [rows, bars, interval],
  );
  const signal = useMemo(
    () =>
      interval === "1d" && data && !error
        ? evaluateSignal(data.candles, koreanDate(Date.now()))
        : null,
    [data, interval, error],
  );
  const selected = OSCILLATORS.find((o) => o.id === oscillator)!;
  const lines = [
    ...new Set(
      OVERLAYS.filter(
        (o) =>
          overlays.includes(o.id) && !(o.id === "vwap" && interval === "1d"),
      ).flatMap((o) => o.keys),
    ),
  ];
  const last = rows.at(-1),
    profile = useMemo(() => volumeProfile(visible), [visible]);
  const flow = FLOW_OPTIONS.find((f) => f.id === flowId)!,
    flowRows = data?.flows ?? [],
    hasFlow = flowRows.some((r) => flow.keys.some((k) => r[k] !== null));
  const results = STOCKS.filter((s) =>
    `${s.code} ${s.name} ${s.sector}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const choose = (s: Stock) => {
    setStock(s);
    setTab("chart");
    setQuery("");
  };
  const toggle = (id: string) =>
    setOverlays((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  const scan = useCallback(async () => {
    setScanning(true);
    setScanError("");
    try {
      const r = await fetch("/api/stocks/screen");
      if (!r.ok) throw new Error();
      setScreen(await r.json());
    } catch {
      setScanError("후보 분석을 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setScanning(false);
    }
  }, []);
  const quote = data?.quote?.price,
    prior =
      interval === "1d"
        ? data?.candles
            .filter(
              (c) =>
                c.date <
                koreanDate(
                  Date.parse(data?.quote?.at ?? new Date().toISOString()),
                ),
            )
            .at(-1)?.close
        : null;
  const change = quote && prior ? (quote / prior - 1) * 100 : null;
  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="/">
          <span className={styles.logo}>
            <Activity size={21} />
          </span>
          <span>
            SEUNGHYUN <b>MARKET LAB</b>
          </span>
        </a>
        <a className={styles.back} href="/">
          <ArrowLeft size={15} /> 포트폴리오로
        </a>
      </header>
      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>KOREA EQUITY RESEARCH</p>
          <h1>
            가격의 움직임을,
            <br className={styles.mobileBreak} /> 판단의 근거로.
          </h1>
          <p className={styles.subtitle}>
            차트부터 수급까지. 국내 주식의 신호를 한곳에서 살펴보세요.
          </p>
        </div>
        <div className={styles.connection}>
          <span
            className={data?.source === "Toss" ? styles.dot : styles.idleDot}
          />
          <div>
            <strong>
              {data?.source === "Toss"
                ? "토스증권 연결"
                : data?.source === "Yahoo"
                  ? "Yahoo 시세 · 지연 가능"
                  : "시세 연결 확인 중"}
            </strong>
            <small>
              {data?.source === "Toss"
                ? "현재가 15초 · 차트 60초 자동 갱신"
                : "제공처의 마지막 데이터 시각 기준"}
            </small>
          </div>
        </div>
      </section>
      <nav className={styles.tabs} aria-label="분석 메뉴">
        <button aria-selected={tab === "chart"} onClick={() => setTab("chart")}>
          <BarChart3 size={17} /> 종목 분석
        </button>
        <button
          aria-selected={tab === "screen"}
          onClick={() => {
            setTab("screen");
            if (!screen && !scanning) void scan();
          }}
        >
          <Activity size={17} /> 매수 검토 후보 <span>30</span>
        </button>
        <span className={styles.tabNote}>KOSPI · KOSDAQ</span>
      </nav>
      {tab === "chart" ? (
        <div className={styles.workspace}>
          <aside className={styles.watchlist}>
            <div className={styles.sidebarHeading}>
              <h2>종목 탐색</h2>
              <span>{STOCKS.length}</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results.length) choose(results[0]);
                else if (/^[A-Z0-9]{6}$/i.test(query.trim()))
                  choose({
                    code: query.trim().toUpperCase(),
                    name: query.trim().toUpperCase(),
                    market: market as Stock["market"],
                    sector: "직접 조회",
                  });
              }}
            >
              <label className={styles.search}>
                <Search size={16} />
                <input
                  aria-label="종목명 또는 종목코드"
                  placeholder="종목명 / 코드 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {query && !results.length && (
                <div className={styles.directSearch}>
                  <select
                    aria-label="직접 조회 시장"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                  >
                    <option>KOSPI</option>
                    <option>KOSDAQ</option>
                  </select>
                  <button type="submit">코드로 조회</button>
                </div>
              )}
            </form>
            <div className={styles.stockList}>
              {results.map((s) => (
                <button
                  key={s.code}
                  className={stock.code === s.code ? styles.stockActive : ""}
                  onClick={() => choose(s)}
                >
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {s.code} · {s.market}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
            <p className={styles.listNote}>
              기본 목록 외 종목도
              <br />
              6자리 코드로 조회할 수 있어요.
            </p>
          </aside>
          <div className={styles.center}>
            <section className={styles.chartCard} aria-label="종목 차트">
              <div className={styles.stockHeader}>
                <div>
                  <p className={styles.marketTag}>
                    {stock.market} <span> / {stock.code}</span>
                  </p>
                  <h2>{stock.name}</h2>
                  <div className={styles.price}>
                    {fmt(quote)}
                    <small>원</small>
                    {change !== null && (
                      <span className={change >= 0 ? styles.up : styles.down}>
                        {change >= 0 ? "+" : ""}
                        {fmt(change, 2)}%
                      </span>
                    )}
                  </div>
                  <p className={styles.priceTime}>
                    현재가 기준 {clock(data?.quote?.at ?? null)} KST
                    {quoteError ? " · 갱신 실패" : ""}
                    {change !== null ? " · 전일 종가 대비" : ""}
                  </p>
                </div>
                <button
                  className={styles.iconButton}
                  aria-label="시세 새로고침"
                  onClick={() => setRefresh((n) => n + 1)}
                  disabled={loading}
                >
                  <RefreshCw size={18} className={loading ? styles.spin : ""} />
                </button>
              </div>
              <div className={styles.chartToolbar}>
                <div className={styles.segment}>
                  <button
                    aria-pressed={interval === "1d"}
                    onClick={() => setIntervalValue("1d")}
                  >
                    일봉
                  </button>
                  <button
                    aria-pressed={interval === "1m"}
                    onClick={() => setIntervalValue("1m")}
                  >
                    1분봉
                  </button>
                </div>
                <select
                  aria-label="표시할 봉 수"
                  value={bars}
                  onChange={(e) => setBars(Number(e.target.value))}
                >
                  <option value={60}>60봉</option>
                  <option value={100}>100봉</option>
                  <option value={200}>200봉</option>
                  <option value={500}>500봉</option>
                </select>
                <button
                  className={styles.settingsButton}
                  aria-expanded={showSettings}
                  onClick={() => setShowSettings((v) => !v)}
                >
                  <SlidersHorizontal size={15} /> 지표 설정
                </button>
              </div>
              {showSettings && (
                <div className={styles.settings}>
                  <h3>
                    상단 지표 <small>여러 개 선택</small>
                  </h3>
                  <div className={styles.indicatorGrid}>
                    {OVERLAYS.map((o) => (
                      <label key={o.id} title={o.note}>
                        <input
                          type="checkbox"
                          checked={overlays.includes(o.id)}
                          onChange={() => toggle(o.id)}
                          disabled={o.id === "vwap" && interval === "1d"}
                        />
                        {o.name}
                      </label>
                    ))}
                  </div>
                  {overlays.includes("avwap") && (
                    <label className={styles.anchor}>
                      고정 VWAP 기준일{" "}
                      <input
                        type="date"
                        min={data?.candles[0]?.date}
                        max={data?.candles.at(-1)?.date}
                        value={anchor || data?.candles[0]?.date || ""}
                        onChange={(e) => setAnchor(e.target.value)}
                      />
                    </label>
                  )}
                  <p>VWAP는 거래일별 누적이므로 1분봉에서 선택하세요.</p>
                </div>
              )}
              <div className={styles.legend}>
                {lines.map((key, i) => (
                  <span key={key}>
                    <i style={{ background: colors[i % colors.length] }} />
                    {label(key)} <b>{fmt(last?.[key], 1)}</b>
                  </span>
                ))}
              </div>
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                  {data
                    ? " 마지막 차트를 유지하며 추천 점수는 보류합니다."
                    : ""}
                  <button onClick={() => setRefresh((n) => n + 1)}>
                    다시 시도
                  </button>
                </div>
              )}
              {loading ? (
                <div className={styles.chartEmpty}>
                  <RefreshCw className={styles.spin} />
                  <p>시세와 차트를 불러오고 있어요.</p>
                </div>
              ) : !data ? (
                <div className={styles.chartEmpty}>연결된 시세가 없습니다.</div>
              ) : (
                <>
                  <div className={styles.priceChart}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={visible}
                        margin={{ top: 12, right: 6, left: 0, bottom: 0 }}
                        syncId="stock-chart"
                      >
                        <CartesianGrid stroke="#202c3e" vertical={false} />
                        <XAxis
                          dataKey="display"
                          tick={{ fill: "#8191a9", fontSize: 11 }}
                          minTickGap={65}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          orientation="right"
                          domain={["auto", "auto"]}
                          tickFormatter={compact}
                          tick={{ fill: "#8191a9", fontSize: 11 }}
                          width={67}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTip />} />
                        <Bar
                          dataKey="range"
                          name="캔들"
                          shape={<CandleShape />}
                          isAnimationActive={false}
                        />
                        {lines.map((key, i) => (
                          <Line
                            key={key}
                            dataKey={key}
                            stroke={colors[i % colors.length]}
                            strokeWidth={1.3}
                            dot={
                              key === "sar" || key.startsWith("fractal")
                                ? { r: 2.5 }
                                : false
                            }
                            strokeOpacity={
                              key === "sar" || key.startsWith("fractal") ? 0 : 1
                            }
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.oscHeading}>
                    <select
                      aria-label="하단 지표 선택"
                      value={oscillator}
                      onChange={(e) => setOscillator(e.target.value)}
                    >
                      {OSCILLATORS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <span>{selected.note}</span>
                    <b>
                      {fmt(last?.[selected.keys[0]], 2)} {selected.unit}
                    </b>
                  </div>
                  <div className={styles.oscChart}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={visible}
                        margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
                        syncId="stock-chart"
                      >
                        <CartesianGrid stroke="#202c3e" vertical={false} />
                        <XAxis dataKey="display" hide />
                        <YAxis
                          orientation="right"
                          tickFormatter={compact}
                          tick={{ fill: "#8191a9", fontSize: 11 }}
                          width={67}
                          axisLine={false}
                          tickLine={false}
                          domain={
                            selected.id === "rsi" ? [0, 100] : ["auto", "auto"]
                          }
                        />
                        <Tooltip content={<ChartTip />} />
                        {selected.id === "rsi" && (
                          <>
                            <ReferenceLine
                              y={30}
                              stroke="#45617b"
                              strokeDasharray="4 4"
                            />
                            <ReferenceLine
                              y={70}
                              stroke="#45617b"
                              strokeDasharray="4 4"
                            />
                          </>
                        )}
                        {selected.keys.map((key, i) =>
                          key === "volume" || key === "histogram" ? (
                            <Bar
                              key={key}
                              dataKey={key}
                              fill="#4ba99c"
                              isAnimationActive={false}
                            >
                              {visible.map((r, j) => (
                                <Cell
                                  key={j}
                                  fill={
                                    (r[key] as number) >= 0
                                      ? "#4ba99c"
                                      : "#617ace"
                                  }
                                />
                              ))}
                            </Bar>
                          ) : (
                            <Line
                              key={key}
                              dataKey={key}
                              stroke={colors[i % colors.length]}
                              dot={false}
                              isAnimationActive={false}
                            />
                          ),
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  {!visible.some((r) =>
                    selected.keys.some((k) => typeof r[k] === "number"),
                  ) && (
                    <p className={styles.smallNote}>
                      이 지표를 계산할 봉이 부족하거나 분모가 0입니다.
                    </p>
                  )}
                  {overlays.includes("profile") && (
                    <div className={styles.profile}>
                      <h3>매물대 · 봉 범위 균등 배분 추정</h3>
                      {profile.map((p, i) => (
                        <div key={i}>
                          <span>{fmt(p.price)}원</span>
                          <div>
                            <i
                              style={{
                                width: `${(p.volume / Math.max(...profile.map((x) => x.volume), 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <small>{compact(p.volume)}주</small>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className={styles.chartFooter}>
                <label>
                  <input
                    type="checkbox"
                    checked={automatic}
                    onChange={(e) => setAutomatic(e.target.checked)}
                  />{" "}
                  자동 갱신
                </label>
                <span>
                  마지막 차트 수신 {data ? clock(data.fetchedAt) : "—"} KST
                </span>
              </div>
            </section>
            <section className={styles.flowCard}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>INVESTOR FLOW</p>
                  <h2>수급과 보유 현황</h2>
                </div>
                <select
                  aria-label="수급 지표"
                  value={flowId}
                  onChange={(e) => setFlowId(e.target.value)}
                >
                  {FLOW_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.legend}>
                {flow.keys.map((key, i) => (
                  <span key={key}>
                    <i style={{ background: colors[i] }} />
                    {FLOW_LABELS[key]}
                  </span>
                ))}
              </div>
              {hasFlow ? (
                <div className={styles.flowChart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={flowRows}
                      margin={{ right: 5, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#202c3e" />
                      <XAxis
                        dataKey="date"
                        minTickGap={70}
                        tick={{ fill: "#8191a9", fontSize: 11 }}
                      />
                      <YAxis
                        orientation="right"
                        width={67}
                        tickFormatter={compact}
                        tick={{ fill: "#8191a9", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#162338",
                          border: "1px solid #34465d",
                          color: "#e2e8f0",
                        }}
                        formatter={(v: any, n: any) => [
                          fmt(v, 2),
                          FLOW_LABELS[n],
                        ]}
                      />
                      <ReferenceLine y={0} stroke="#40516c" />
                      {flow.keys.map((key, i) =>
                        flowId === "net" || flowId === "short" ? (
                          <Bar
                            key={key}
                            dataKey={key}
                            fill={colors[i]}
                            isAnimationActive={false}
                          />
                        ) : (
                          <Line
                            key={key}
                            dataKey={key}
                            stroke={colors[i]}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        ),
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.flowEmpty}>
                  <ShieldCheck size={24} />
                  <strong>
                    {data?.source === "Toss"
                      ? "해당 수급 자료가 아직 제공되지 않았어요"
                      : "토스증권 API 연결 후 확인할 수 있어요"}
                  </strong>
                  <p>미제공 값은 0으로 채우지 않습니다.</p>
                </div>
              )}
              <p className={styles.smallNote}>
                수량은 주, 외국인 지분율은 %. 당일 수급은 잠정치이며 신용잔고는
                다음 영업일 반영됩니다. 기관·개인 보유수량은 API 미제공으로
                표시하지 않습니다.
              </p>
              <details className={styles.details}>
                <summary>최근 수급 수치 확인</summary>
                <div className={styles.tableScroll}>
                  <table>
                    <thead>
                      <tr>
                        <th>일자</th>
                        {flow.keys.map((k) => (
                          <th key={k}>{FLOW_LABELS[k]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flowRows
                        .slice(-10)
                        .reverse()
                        .map((r) => (
                          <tr key={r.date}>
                            <td>{r.date}</td>
                            {flow.keys.map((k) => (
                              <td key={k}>{fmt(r[k], 2)}</td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          </div>
          <aside className={styles.insight}>
            <section className={styles.signalCard}>
              <p className={styles.eyebrow}>TECHNICAL SIGNAL</p>
              <h2>지금의 기술적 신호</h2>
              <div className={styles.score}>
                <strong>{signal?.score ?? "—"}</strong>
                <span>/ 100</span>
              </div>
              <div className={styles.signalLabel}>
                {signal?.label ??
                  (interval === "1m" ? "일봉에서 분석합니다" : "분석 대기")}
              </div>
              <p className={styles.scoreNote}>
                조건 충족 점수입니다.
                <br />
                상승 확률이나 기대 수익률이 아닙니다.
              </p>
              <hr />
              <h3>충족한 조건</h3>
              {signal?.reasons.length ? (
                <ul className={styles.reasons}>
                  {signal.reasons.map((r) => (
                    <li key={r}>
                      <span>✓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.smallNote}>
                  충족한 조건이 없거나 데이터가 부족합니다.
                </p>
              )}
              <h3>함께 확인할 위험</h3>
              {signal?.risks.length ? (
                <ul className={styles.risks}>
                  {signal.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.smallNote}>
                  실적·공시·시장 급변은 기술적 점수에 반영되지 않습니다.
                </p>
              )}
              <p className={styles.asOf}>
                분석 기준 {signal?.date ?? "—"}
                <br />
                완료된 일봉만 사용
              </p>
            </section>
            <section className={styles.methodCard}>
              <CircleHelp size={18} />
              <h3>점수는 어떻게 계산하나요?</h3>
              <dl>
                <div>
                  <dt>종가·20·60일선 정배열</dt>
                  <dd>25점</dd>
                </div>
                <div>
                  <dt>20일선 상승</dt>
                  <dd>15점</dd>
                </div>
                <div>
                  <dt>RSI 45~65</dt>
                  <dd>20점</dd>
                </div>
                <div>
                  <dt>MACD 신호선 상회</dt>
                  <dd>20점</dd>
                </div>
                <div>
                  <dt>상승 + 거래량 확대</dt>
                  <dd>20점</dd>
                </div>
              </dl>
              <p>
                80점 이상 매수 검토 · 55점 이상 관찰. 과거 성과 검증 전의
                규칙이며 매수 여부는 추가 확인이 필요합니다.
              </p>
            </section>
          </aside>
        </div>
      ) : (
        <section className={styles.screener}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>STOCK SCREENER</p>
              <h2>조건에 맞는 종목부터 살펴보세요.</h2>
              <p>
                기본 목록 30종목을 같은 규칙으로 비교합니다. 전체 시장 순위가
                아닙니다.
              </p>
            </div>
            <button
              className={styles.primaryButton}
              onClick={() => void scan()}
              disabled={scanning}
            >
              <RefreshCw size={16} className={scanning ? styles.spin : ""} />
              {scanning ? "분석 중…" : "후보 다시 분석"}
            </button>
          </div>
          {scanError && (
            <p role="alert" className={styles.error}>
              {scanError}
            </p>
          )}
          {scanning && !screen ? (
            <div className={styles.chartEmpty}>
              <RefreshCw className={styles.spin} />
              <p>30종목의 일봉을 확인하고 있어요.</p>
            </div>
          ) : (
            screen && (
              <>
                <p className={styles.smallNote}>
                  분석 {screen.rows.length}/{screen.universe}종목 · 수집{" "}
                  {clock(screen.asOf)} KST · 5분 캐시
                  {screen.failed.length
                    ? ` · 조회 실패 ${screen.failed.length}종목 (${screen.failed.join(", ")})`
                    : ""}
                </p>
                <div className={styles.screenRows}>
                  {screen.rows.map((r, i) => (
                    <button key={r.stock.code} onClick={() => choose(r.stock)}>
                      <span className={styles.rank}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className={styles.screenStock}>
                        <strong>{r.stock.name}</strong>
                        <small>
                          {r.stock.code} · {r.stock.sector}
                        </small>
                      </div>
                      <div className={styles.screenReason}>
                        {r.signal.reasons.slice(0, 2).join(" · ") ||
                          "충족 조건 없음"}
                        <small>
                          {r.signal.date} 기준 · {r.source} ·{" "}
                          {r.signal.risks[0] ?? "실적·공시 추가 확인"}
                        </small>
                      </div>
                      <span className={styles.screenScore}>
                        {r.signal.score ?? "—"}
                        <small>{r.signal.label}</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
              </>
            )
          )}
        </section>
      )}
      <section className={styles.notes}>
        {data?.notices.map((n) => (
          <p key={n}>{n}</p>
        ))}
        <details>
          <summary>지표 계산 기준과 데이터 안내</summary>
          <ul>
            {OVERLAYS.filter((o) => overlays.includes(o.id)).map((o) => (
              <li key={o.id}>
                <strong>{o.name}</strong> — {o.note}
              </li>
            ))}
          </ul>
          <p>
            지표 초기 구간은 충분한 봉이 쌓일 때까지 비워 둡니다. 미완료 봉의
            값은 장중 바뀔 수 있습니다. 토스 차트는 수정주가 적용, Yahoo 대체
            차트는 제공된 OHLC를 사용합니다. 제공처가 바뀌면 과거 가격과
            지표값도 달라질 수 있습니다.
          </p>
          <p>
            토스 REST 현재가를 15초마다 조회하며 체결 틱을 실시간 스트리밍하는
            방식은 아닙니다. 1분봉 차트는 60초마다 갱신됩니다. 데이터
            지연·미제공·휴장 여부는 기준 시각과 함께 확인하세요.
          </p>
          <p>
            <a
              href="https://developers.tossinvest.com/docs/market-data"
              target="_blank"
              rel="noreferrer"
            >
              토스증권 공식 API 안내
            </a>
          </p>
        </details>
        <p>
          기술적 조건에 따른 매수 검토 후보이며 수익을 보장하지 않습니다.
          가격·수급의 기준 시각과 기업의 공시를 함께 확인하세요.
        </p>
      </section>
      <footer className={styles.footer}>
        SEUNGHYUN MARKET LAB <span>데이터를 읽고, 근거를 남깁니다.</span>
      </footer>
    </main>
  );
}
