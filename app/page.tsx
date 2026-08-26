"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { RefreshCcw } from "lucide-react";

type MarketData = {
  updatedAt: string;
  source: string;
  indexCorrelation: number | null;
  indexData: any[];
  sectors: Record<string, any>;
  stockPairs?: Record<string, any>;
  macroIndicators?: Record<string, any>;
};

const fallback: MarketData = {
  updatedAt: "",
  source: "",
  indexCorrelation: null,
  indexData: [],
  sectors: {},
  stockPairs: {},
  macroIndicators: {}
};

const periodOptions = [
  { key: "1M", label: "1개월", days: 30 },
  { key: "3M", label: "3개월", days: 90 },
  { key: "6M", label: "6개월", days: 180 },
  { key: "1Y", label: "1년", days: 365 },
  { key: "ALL", label: "전체", days: null }
];

function filterByPeriod(rows: any[], periodKey: string) {
  const option = periodOptions.find((item) => item.key === periodKey);

  if (!option || option.days === null || rows.length === 0) {
    return rows;
  }

  const lastDate = new Date(rows[rows.length - 1].month);
  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - option.days);

  return rows.filter((row) => new Date(row.month) >= cutoff);
}

function rebaseRows(rows: any[], keys: string[]) {
  if (rows.length === 0) return [];

  const base = rows[0];

  return rows.map((row) => {
    const rebased: any = { month: row.month };

    for (const key of keys) {
      const baseValue = Number(base[key]);
      const currentValue = Number(row[key]);

      rebased[key] = baseValue
        ? Number(((currentValue / baseValue) * 100).toFixed(2))
        : null;
    }

    if (keys.length >= 2) {
      rebased.spread = Number(
        (Number(rebased[keys[0]]) - Number(rebased[keys[1]])).toFixed(2)
      );
    }

    return rebased;
  });
}

function calculateReturn(rows: any[], key: string) {
  if (rows.length < 2) return null;

  const first = Number(rows[0][key]);
  const last = Number(rows[rows.length - 1][key]);

  if (!first) return null;

  return Number((((last / first) - 1) * 100).toFixed(1));
}

function formatReturn(value: number | null) {
  if (value === null) return "-";
  return `${value.toFixed(1)}%`;
}

function mergeMarketMacro(marketRows: any[], macroRows: any[], marketKey: string) {
  const macroMap = new Map(macroRows.map((row) => [row.month, row.value]));

  return marketRows
    .filter((row) => macroMap.has(row.month))
    .map((row) => ({
      month: row.month,
      market: row[marketKey],
      macro: macroMap.get(row.month)
    }));
}

function makeIndexInsight(kospiReturn: number | null, nasdaqReturn: number | null) {
  if (kospiReturn === null || nasdaqReturn === null) {
    return "데이터를 불러오면 선택 기간 기준의 시장 흐름 해석이 표시됩니다.";
  }

  const gap = Number((kospiReturn - nasdaqReturn).toFixed(1));

  if (gap > 3) {
    return `선택 기간 동안 KOSPI는 NASDAQ보다 ${gap.toFixed(1)}%p 강한 흐름을 보였습니다. 이 구간에서는 한국 시장의 반등 탄력이 미국 성장주 중심 시장보다 상대적으로 컸다고 해석할 수 있습니다.`;
  }

  if (gap < -3) {
    return `선택 기간 동안 NASDAQ은 KOSPI보다 ${Math.abs(gap).toFixed(1)}%p 강한 흐름을 보였습니다. 이 구간에서는 미국 기술주 중심의 상승 모멘텀이 한국 시장보다 우세했다고 해석할 수 있습니다.`;
  }

  return `선택 기간 동안 KOSPI와 NASDAQ의 수익률 격차는 ${Math.abs(gap).toFixed(1)}%p 수준입니다. 두 시장이 비교적 비슷한 방향으로 움직인 구간으로 볼 수 있습니다.`;
}

function makeSectorInsight(
  sectorName: string,
  koreaReturn: number | null,
  usReturn: number | null
) {
  if (koreaReturn === null || usReturn === null) {
    return "섹터 데이터를 불러오면 한국 테마와 미국 테마의 상대적 강도 해석이 표시됩니다.";
  }

  const gap = Number((koreaReturn - usReturn).toFixed(1));

  if (gap > 5) {
    return `${sectorName} 섹터에서는 선택 기간 동안 한국 테마 바스켓이 미국 테마 바스켓보다 ${gap.toFixed(1)}%p 강했습니다. 국내 종목군이 해당 테마에서 상대적으로 더 민감하게 반응한 구간입니다.`;
  }

  if (gap < -5) {
    return `${sectorName} 섹터에서는 선택 기간 동안 미국 테마 바스켓이 한국 테마 바스켓보다 ${Math.abs(gap).toFixed(1)}%p 강했습니다. 글로벌 선도주 중심의 모멘텀이 더 뚜렷했던 구간으로 볼 수 있습니다.`;
  }

  return `${sectorName} 섹터에서는 한국과 미국 테마 바스켓의 수익률 격차가 ${Math.abs(gap).toFixed(1)}%p 수준입니다. 양국 테마주가 비교적 유사한 방향성을 보인 구간입니다.`;
}

function makeMacroInsight(
  macroLabel: string,
  marketName: string,
  marketReturn: number | null,
  macroReturn: number | null
) {
  if (marketReturn === null || macroReturn === null) {
    return "금리·환율 데이터를 불러오면 시장 흐름과의 비교 해석이 표시됩니다.";
  }

  if (macroLabel.includes("환율") && macroReturn > 0 && marketReturn < 0) {
    return `선택 기간 동안 ${macroLabel}이 상승하고 ${marketName}은 하락했습니다. 원/달러 환율 상승 구간에서 국내 위험자산이 부담을 받을 수 있다는 점을 확인할 수 있습니다.`;
  }

  if (macroLabel.includes("국채금리") && macroReturn > 0) {
    return `선택 기간 동안 ${macroLabel}이 상승했습니다. 금리 상승은 성장주와 위험자산의 밸류에이션 부담으로 연결될 수 있어 ${marketName} 흐름과 함께 볼 필요가 있습니다.`;
  }

  if (macroLabel.includes("달러인덱스") && macroReturn > 0) {
    return `선택 기간 동안 ${macroLabel}가 상승했습니다. 달러 강세 구간에서는 글로벌 자금이 안전자산을 선호할 가능성이 있어 한국 시장과 신흥국 자산에 부담이 될 수 있습니다.`;
  }

  return `선택 기간 동안 ${macroLabel} 변화율은 ${formatReturn(macroReturn)}, ${marketName} 수익률은 ${formatReturn(marketReturn)}입니다. 금리·환율 지표와 주가지수를 함께 비교하면 시장 변동의 배경을 더 입체적으로 볼 수 있습니다.`;
}

export default function Page() {
  const [data, setData] = useState<MarketData>(fallback);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"index" | "spread">("index");
  const [sectorKey, setSectorKey] = useState("semiconductor");
  const [stockPairKey, setStockPairKey] = useState("samsungNvidia");
  const [macroKey, setMacroKey] = useState("usdkrw");
  const [macroMarketKey, setMacroMarketKey] = useState<"kospi" | "nasdaq">("kospi");
  const [periodKey, setPeriodKey] = useState("ALL");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/market-data", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("market data api error");
      }

      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredIndexData = useMemo(() => {
    const filtered = filterByPeriod(data.indexData, periodKey);
    return rebaseRows(filtered, ["kospi", "nasdaq"]);
  }, [data.indexData, periodKey]);

  const kospiReturn = useMemo(() => {
    return calculateReturn(filteredIndexData, "kospi");
  }, [filteredIndexData]);

  const nasdaqReturn = useMemo(() => {
    return calculateReturn(filteredIndexData, "nasdaq");
  }, [filteredIndexData]);

  const macroList = Object.values(data.macroIndicators || {});
  const selectedMacro = data.macroIndicators?.[macroKey] || macroList[0];

  const filteredMacroData = useMemo(() => {
    if (!selectedMacro?.data) return [];

    const filtered = filterByPeriod(selectedMacro.data, periodKey);
    return rebaseRows(filtered, ["value"]);
  }, [selectedMacro, periodKey]);

  const macroChartData = useMemo(() => {
    return mergeMarketMacro(filteredIndexData, filteredMacroData, macroMarketKey);
  }, [filteredIndexData, filteredMacroData, macroMarketKey]);

  const selectedMarketReturn = useMemo(() => {
    return calculateReturn(filteredIndexData, macroMarketKey);
  }, [filteredIndexData, macroMarketKey]);

  const macroReturn = useMemo(() => {
    return calculateReturn(filteredMacroData, "value");
  }, [filteredMacroData]);

  const macroInsight = useMemo(() => {
    return makeMacroInsight(
      selectedMacro?.label || "금리·환율 지표",
      macroMarketKey === "kospi" ? "KOSPI" : "NASDAQ",
      selectedMarketReturn,
      macroReturn
    );
  }, [selectedMacro, macroMarketKey, selectedMarketReturn, macroReturn]);

  const sectorList = Object.values(data.sectors || {});
  const selectedSector = data.sectors?.[sectorKey] || sectorList[0];

  const filteredSectorData = useMemo(() => {
    if (!selectedSector?.data) return [];

    const filtered = filterByPeriod(selectedSector.data, periodKey);
    return rebaseRows(filtered, ["korea", "us"]);
  }, [selectedSector, periodKey]);

  const koreaThemeReturn = useMemo(() => {
    return calculateReturn(filteredSectorData, "korea");
  }, [filteredSectorData]);

  const usThemeReturn = useMemo(() => {
    return calculateReturn(filteredSectorData, "us");
  }, [filteredSectorData]);

  const stockPairList = Object.values(data.stockPairs || {});
  const selectedStockPair = data.stockPairs?.[stockPairKey] || stockPairList[0];

  const filteredStockPairData = useMemo(() => {
    if (!selectedStockPair?.data) return [];

    const filtered = filterByPeriod(selectedStockPair.data, periodKey);
    return rebaseRows(filtered, ["korea", "us"]);
  }, [selectedStockPair, periodKey]);

  const koreaStockReturn = useMemo(() => {
    return calculateReturn(filteredStockPairData, "korea");
  }, [filteredStockPairData]);

  const usStockReturn = useMemo(() => {
    return calculateReturn(filteredStockPairData, "us");
  }, [filteredStockPairData]);

  const indexInsight = useMemo(() => {
    return makeIndexInsight(kospiReturn, nasdaqReturn);
  }, [kospiReturn, nasdaqReturn]);

  const sectorInsight = useMemo(() => {
    return makeSectorInsight(
      selectedSector?.label || "선택 섹터",
      koreaThemeReturn,
      usThemeReturn
    );
  }, [selectedSector, koreaThemeReturn, usThemeReturn]);

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <nav style={styles.nav}>
          <div>
            <p style={styles.subText}>Financial Market Portfolio</p>
            <h1 style={styles.title}>KOSPI × NASDAQ Coupling Lab</h1>
            <p style={styles.ownerText}>Built by Seunghyun Kim</p>
          </div>

          <button onClick={loadData} style={styles.refreshButton}>
            <RefreshCcw size={16} />
            실제 데이터 새로고침
          </button>
        </nav>

        <section style={styles.hero}>
          <div style={styles.heroMain}>
            <p style={styles.badge}>Yahoo Finance 자동 연동 · 일별 데이터</p>

            <h2 style={styles.heroTitle}>
              코스피와 나스닥, 그리고 섹터별 테마주의 연동성
            </h2>

            <p style={styles.description}>
              KOSPI와 NASDAQ 지수를 같은 기준일 100으로 환산하고,
              한국 상장 테마주와 미국 상장 테마주의 흐름을 섹터별로 비교합니다.
              기간별 수익률 흐름을 선택할 수 있도록 1개월, 3개월, 6개월, 1년,
              전체 보기 기능을 추가했습니다.
            </p>

            <div style={styles.periodBox}>
              {periodOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setPeriodKey(option.key)}
                  style={periodKey === option.key ? styles.activeButton : styles.button}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={styles.stats}>
              <div style={styles.statBox}>
                <p style={styles.subText}>선택 기간 KOSPI 수익률</p>
                <h3>{formatReturn(kospiReturn)}</h3>
              </div>

              <div style={styles.statBox}>
                <p style={styles.subText}>선택 기간 NASDAQ 수익률</p>
                <h3>{formatReturn(nasdaqReturn)}</h3>
              </div>

              <div style={styles.statBox}>
                <p style={styles.subText}>전체 기간 상관계수</p>
                <h3>{data.indexCorrelation ?? "-"}</h3>
              </div>
            </div>

            <p style={styles.notice}>
              {loading && "데이터를 불러오는 중입니다."}
              {error && `오류: ${error}`}
              {!loading && !error && data.updatedAt
                ? `마지막 업데이트: ${new Date(data.updatedAt).toLocaleString("ko-KR")}`
                : ""}
            </p>
          </div>

          <div style={styles.heroSide}>
            <div style={styles.card}>
              <p style={styles.subText}>분석 기준</p>
              <h3>선택 기간 첫날 = 100</h3>
              <p style={styles.cardText}>
                기간을 바꾸면 해당 기간의 첫 거래일을 100으로 다시 환산합니다.
              </p>
            </div>

            <div style={styles.card}>
              <p style={styles.subText}>은행권 연결</p>
              <h3>시장·금리·환율</h3>
              <p style={styles.cardText}>
                주가지수뿐 아니라 환율, 미국 장기금리, 달러 흐름까지 함께 비교합니다.
              </p>
            </div>
          </div>
        </section>

        <section style={styles.insightSection}>
          <div style={styles.insightCard}>
            <p style={styles.subText}>Market Insight</p>
            <h2 style={styles.insightTitle}>시장 자동 분석 코멘트</h2>
            <p style={styles.insightText}>{indexInsight}</p>
          </div>

          <div style={styles.insightCard}>
            <p style={styles.subText}>Sector Insight</p>
            <h2 style={styles.insightTitle}>섹터 자동 분석 코멘트</h2>
            <p style={styles.insightText}>{sectorInsight}</p>
          </div>
        </section>

        <section style={styles.summarySection}>
          <div>
            <p style={styles.subText}>Project Summary</p>
            <h2 style={styles.sectionTitle}>프로젝트 요약</h2>
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <p style={styles.subText}>Data Source</p>
              <h3>Yahoo Finance</h3>
              <p>일별 시장 데이터를 자동으로 불러와 지수와 테마주 흐름을 비교합니다.</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.subText}>Method</p>
              <h3>Indexing · Return · Correlation</h3>
              <p>기준일 100 지수화, 기간별 수익률, 상관계수, 섹터 바스켓 비교를 활용합니다.</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.subText}>Tech Stack</p>
              <h3>Next.js · TypeScript · Recharts · Vercel</h3>
              <p>웹 배포, API 라우트, 차트 시각화, 자동 데이터 호출 구조로 구성했습니다.</p>
            </div>

            <div style={styles.summaryCard}>
              <p style={styles.subText}>Purpose</p>
              <h3>금융권 취업 포트폴리오</h3>
              <p>시장 데이터를 해석하고 고객에게 설명할 수 있는 금융 실무형 사고를 보여줍니다.</p>
            </div>
          </div>
        </section>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.subText}>Indexed Price Movement</p>
              <h2>KOSPI · NASDAQ 지수화 비교</h2>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setView("index")}
                style={view === "index" ? styles.activeButton : styles.button}
              >
                지수 비교
              </button>

              <button
                onClick={() => setView("spread")}
                style={view === "spread" ? styles.activeButton : styles.button}
              >
                격차 보기
              </button>
            </div>
          </div>

          <div style={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              {view === "index" ? (
                <LineChart data={filteredIndexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="kospi" name="KOSPI" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="nasdaq" name="NASDAQ" strokeWidth={3} dot={false} />
                </LineChart>
              ) : (
                <BarChart data={filteredIndexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="spread" name="KOSPI - NASDAQ" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.subText}>Macro Indicators</p>
              <h2>금리·환율 지표와 시장 흐름</h2>
            </div>

            <div style={styles.buttonGroup}>
              {macroList.map((indicator: any) => (
                <button
                  key={indicator.key}
                  onClick={() => setMacroKey(indicator.key)}
                  style={macroKey === indicator.key ? styles.activeButton : styles.button}
                >
                  {indicator.label}
                </button>
              ))}
            </div>
          </div>

          {selectedMacro ? (
            <>
              <div style={styles.buttonGroup}>
                <button
                  onClick={() => setMacroMarketKey("kospi")}
                  style={macroMarketKey === "kospi" ? styles.activeButton : styles.button}
                >
                  KOSPI와 비교
                </button>

                <button
                  onClick={() => setMacroMarketKey("nasdaq")}
                  style={macroMarketKey === "nasdaq" ? styles.activeButton : styles.button}
                >
                  NASDAQ과 비교
                </button>
              </div>

              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 지표</p>
                  <h3>{selectedMacro.label}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 기간 시장 수익률</p>
                  <h3>{formatReturn(selectedMarketReturn)}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 기간 지표 변화율</p>
                  <h3>{formatReturn(macroReturn)}</h3>
                </div>
              </div>

              <div style={styles.insightCard}>
                <p style={styles.subText}>Macro Insight</p>
                <h2 style={styles.insightTitle}>금리·환율 자동 분석 코멘트</h2>
                <p style={styles.insightText}>{macroInsight}</p>
              </div>

              <div style={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={macroChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="market"
                      name={macroMarketKey === "kospi" ? "KOSPI" : "NASDAQ"}
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="macro"
                      name={selectedMacro.label}
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p style={styles.notice}>{selectedMacro.description}</p>
            </>
          ) : (
            <p style={styles.notice}>금리·환율 데이터를 불러오는 중입니다.</p>
          )}
        </section>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.subText}>Sector Theme Stocks</p>
              <h2>섹터별 한국·미국 테마주 비교</h2>
            </div>

            <div style={styles.buttonGroup}>
              {sectorList.map((sector: any) => (
                <button
                  key={sector.key}
                  onClick={() => setSectorKey(sector.key)}
                  style={sectorKey === sector.key ? styles.activeButton : styles.button}
                >
                  {sector.label}
                </button>
              ))}
            </div>
          </div>

          {selectedSector ? (
            <>
              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <p style={styles.subText}>한국 대표 종목</p>
                  <h3>{selectedSector.koreaName}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>미국 대표 종목</p>
                  <h3>{selectedSector.usName}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>전체 기간 섹터 상관계수</p>
                  <h3>{selectedSector.correlation ?? "-"}</h3>
                </div>
              </div>

              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 기간 한국 테마 수익률</p>
                  <h3>{formatReturn(koreaThemeReturn)}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 기간 미국 테마 수익률</p>
                  <h3>{formatReturn(usThemeReturn)}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>상대 강도</p>
                  <h3>
                    {koreaThemeReturn !== null && usThemeReturn !== null
                      ? `${(koreaThemeReturn - usThemeReturn).toFixed(1)}%p`
                      : "-"}
                  </h3>
                </div>
              </div>

              <div style={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredSectorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="korea" name="Korea Theme Basket" strokeWidth={3} fillOpacity={0.2} />
                    <Area type="monotone" dataKey="us" name="U.S. Theme Basket" strokeWidth={3} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p style={styles.notice}>섹터 데이터를 불러오는 중입니다.</p>
          )}
        </section>

        <section style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div>
              <p style={styles.subText}>Single Stock Comparison</p>
              <h2>개별 종목 한국·미국 비교</h2>
            </div>

            <div style={styles.buttonGroup}>
              {stockPairList.map((pair: any) => (
                <button
                  key={pair.key}
                  onClick={() => setStockPairKey(pair.key)}
                  style={stockPairKey === pair.key ? styles.activeButton : styles.button}
                >
                  {pair.label}
                </button>
              ))}
            </div>
          </div>

          {selectedStockPair ? (
            <>
              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <p style={styles.subText}>한국 종목</p>
                  <h3>{selectedStockPair.koreaName}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>미국 종목</p>
                  <h3>{selectedStockPair.usName}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>전체 기간 상관계수</p>
                  <h3>{selectedStockPair.correlation ?? "-"}</h3>
                </div>
              </div>

              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 기간 한국 종목 수익률</p>
                  <h3>{formatReturn(koreaStockReturn)}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>선택 기간 미국 종목 수익률</p>
                  <h3>{formatReturn(usStockReturn)}</h3>
                </div>

                <div style={styles.statBox}>
                  <p style={styles.subText}>상대 강도</p>
                  <h3>
                    {koreaStockReturn !== null && usStockReturn !== null
                      ? `${(koreaStockReturn - usStockReturn).toFixed(1)}%p`
                      : "-"}
                  </h3>
                </div>
              </div>

              <div style={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredStockPairData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" minTickGap={28} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="korea"
                      name={selectedStockPair.koreaName}
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="us"
                      name={selectedStockPair.usName}
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p style={styles.notice}>개별 종목 데이터를 불러오는 중입니다.</p>
          )}
        </section>
<section style={styles.backgroundSection}>
  <div>
    <p style={styles.subText}>Project Motivation</p>
    <h2 style={styles.sectionTitle}>제작 배경</h2>
    <p style={styles.aboutText}>
      국내 증시는 미국 증시, 특히 NASDAQ과 기술주 흐름의 영향을 크게 받는다고 알려져 있습니다.
      그러나 실제로 어느 시기에 두 시장이 함께 움직이고, 어느 구간에서 차이가 벌어지는지는
      직관적으로 확인하기 어렵다고 느꼈습니다. 그래서 KOSPI와 NASDAQ, 주요 섹터별 한국·미국
      테마주, 그리고 금리·환율 지표를 같은 기준으로 비교하는 웹 기반 분석 포트폴리오를
      제작했습니다.
    </p>
  </div>

  <div style={styles.backgroundGrid}>
    <div style={styles.backgroundCard}>
      <h3>문제의식</h3>
      <p>
        국내 시장을 볼 때 미국 증시, 환율, 금리 흐름을 함께 봐야 하지만 이를 한 화면에서
        비교하기 어렵다고 느꼈습니다.
      </p>
    </div>

    <div style={styles.backgroundCard}>
      <h3>분석 방향</h3>
      <p>
        가격 단위가 다른 자산을 선택 기간 첫날 100으로 지수화해 상대적인 흐름을 비교했습니다.
      </p>
    </div>

    <div style={styles.backgroundCard}>
      <h3>활용 목적</h3>
      <p>
        금융시장 흐름을 단순히 보는 데서 그치지 않고, 고객에게 설명 가능한 형태로 정리하는
        것을 목표로 했습니다.
      </p>
    </div>
  </div>
</section>

<section style={styles.howToSection}>
  <div>
    <p style={styles.subText}>How to Read</p>
    <h2 style={styles.sectionTitle}>사용 방법</h2>
  </div>

  <div style={styles.howToGrid}>
    <div style={styles.howToCard}>
      <p style={styles.stepNumber}>01</p>
      <h3>기간 선택</h3>
      <p>1개월, 3개월, 6개월, 1년, 전체 기간 중 하나를 선택해 분석 구간을 정합니다.</p>
    </div>

    <div style={styles.howToCard}>
      <p style={styles.stepNumber}>02</p>
      <h3>시장 비교</h3>
      <p>KOSPI와 NASDAQ의 수익률과 상대 강도를 비교해 국내외 시장 흐름을 확인합니다.</p>
    </div>

    <div style={styles.howToCard}>
      <p style={styles.stepNumber}>03</p>
      <h3>금리·환율 확인</h3>
      <p>원/달러 환율, 미국 10년물 금리, 달러인덱스를 주가지수와 함께 비교합니다.</p>
    </div>

    <div style={styles.howToCard}>
      <p style={styles.stepNumber}>04</p>
      <h3>섹터·종목 분석</h3>
      <p>한국과 미국의 섹터별 테마주 및 대표 종목 흐름을 비교해 세부 차이를 확인합니다.</p>
    </div>
  </div>
</section>
        <section style={styles.customerSection}>
  <div>
    <p style={styles.subText}>Customer Explanation</p>
    <h2 style={styles.sectionTitle}>고객 설명용 요약</h2>
    <p style={styles.aboutText}>
      같은 시장 데이터라도 고객의 투자성향에 따라 설명 방식은 달라져야 합니다.
      이 섹션은 KOSPI·NASDAQ·금리·환율 흐름을 은행 상담 상황에서 어떻게 쉽게
      설명할 수 있는지 정리한 예시입니다.
    </p>
  </div>

  <div style={styles.customerGrid}>
    <div style={styles.customerCard}>
      <p style={styles.customerLabel}>보수형 고객</p>
      <h3>안정성과 원금 보전 중심</h3>
      <p>
        시장 변동성이 커지는 구간에서는 예금·적금, 단기 채권형 상품, 현금성 자산의
        비중을 우선적으로 설명할 수 있습니다. 투자형 상품은 원금손실 가능성을 충분히
        안내한 뒤 소액·분산 접근을 제안하는 방식이 적절합니다.
      </p>
    </div>

    <div style={styles.customerCard}>
      <p style={styles.customerLabel}>중립형 고객</p>
      <h3>분산투자와 적립식 접근</h3>
      <p>
        KOSPI와 NASDAQ의 흐름이 엇갈리는 구간에서는 한 시장에 집중하기보다 국내외
        자산을 나누어 투자하는 관점을 설명할 수 있습니다. 변동성을 줄이기 위해
        적립식 펀드나 ETF를 활용하는 방식도 함께 안내할 수 있습니다.
      </p>
    </div>

    <div style={styles.customerCard}>
      <p style={styles.customerLabel}>적극형 고객</p>
      <h3>섹터·글로벌 테마 활용</h3>
      <p>
        반도체, AI, 조선, 전력기기처럼 특정 섹터의 상대 강도가 뚜렷한 경우에는
        관련 펀드나 ETF를 관심 상품으로 연결할 수 있습니다. 다만 테마형 상품은
        변동성이 크기 때문에 투자기간과 손실 감내 수준을 함께 확인해야 합니다.
      </p>
    </div>

    <div style={styles.customerCard}>
      <p style={styles.customerLabel}>상담 유의사항</p>
      <h3>설명 의무와 적합성 원칙</h3>
      <p>
        과거 수익률과 상관관계만으로 상품을 권유해서는 안 됩니다. 고객의 투자목적,
        투자기간, 소득 안정성, 유동성 필요성, 위험수용도를 확인한 뒤 적합한 상품을
        설명해야 합니다.
      </p>
    </div>
  </div>
</section>
        <section style={styles.bankSection}>
          <div>
            <p style={styles.subText}>Banking Perspective</p>
            <h2 style={styles.sectionTitle}>은행권 관점에서의 활용</h2>
            <p style={styles.aboutText}>
              이 프로젝트는 단순히 주가 흐름을 보여주는 데 그치지 않고, 시장 데이터를 고객에게
              설명할 수 있는 형태로 정리하는 데 목적이 있습니다. 은행권에서는 투자 성과 자체보다
              고객의 투자성향, 투자기간, 위험수용도를 고려해 시장 흐름을 쉽게 설명하는 역량이
              중요하다고 생각했습니다.
            </p>
          </div>

          <div style={styles.bankGrid}>
            <div style={styles.bankCard}>
              <h3>고객 상담</h3>
              <p>복잡한 시장 흐름을 KOSPI, NASDAQ, 섹터별 테마주 비교로 단순화해 설명할 수 있습니다.</p>
            </div>

            <div style={styles.bankCard}>
              <h3>자산관리</h3>
              <p>국내외 시장의 상대 흐름을 바탕으로 분산투자와 장기투자 관점을 설명할 수 있습니다.</p>
            </div>

            <div style={styles.bankCard}>
              <h3>리스크 인식</h3>
              <p>수익률뿐 아니라 변동성, 상관관계, 시장 간 차이를 함께 보며 위험 요인을 고려합니다.</p>
            </div>

            <div style={styles.bankCard}>
              <h3>상품 이해</h3>
              <p>예금, 펀드, ETF, ISA, 연금저축 등 금융상품과 시장 흐름을 연결해 설명할 수 있습니다.</p>
            </div>
          </div>
        </section>

        <section style={styles.productSection}>
          <div>
            <p style={styles.subText}>Financial Product Linkage</p>
            <h2 style={styles.sectionTitle}>시장 흐름과 금융상품 연결</h2>
          </div>

          <div style={styles.productGrid}>
            <div style={styles.productCard}>
              <p style={styles.productLabel}>안정성 중심</p>
              <h3>예금 · 적금</h3>
              <p>금리 상승기나 시장 변동성이 큰 구간에서는 안정적인 현금흐름과 원금 보전을 중시하는 고객에게 설명하기 적합합니다.</p>
            </div>

            <div style={styles.productCard}>
              <p style={styles.productLabel}>분산투자</p>
              <h3>펀드 · ETF</h3>
              <p>KOSPI와 NASDAQ, 섹터별 테마 흐름을 비교해 국내외 자산을 나누어 투자하는 관점을 설명할 수 있습니다.</p>
            </div>

            <div style={styles.productCard}>
              <p style={styles.productLabel}>절세 관점</p>
              <h3>ISA</h3>
              <p>투자 성향이 있는 고객에게 시장 흐름과 절세 계좌 활용을 함께 안내하는 방식으로 연결할 수 있습니다.</p>
            </div>

            <div style={styles.productCard}>
              <p style={styles.productLabel}>장기 자산관리</p>
              <h3>연금저축 · IRP</h3>
              <p>단기 시장 변동보다 장기 복리와 분산투자를 중시하는 고객에게 장기 자산관리 관점으로 설명할 수 있습니다.</p>
            </div>
          </div>
        </section>

        <section style={styles.riskSection}>
          <div>
            <p style={styles.subText}>Risk Notice</p>
            <h2 style={styles.sectionTitle}>리스크 및 유의사항</h2>
          </div>

          <div style={styles.riskBox}>
            <p>
              본 프로젝트는 투자 권유가 아니라 국내외 시장 흐름을 비교하기 위한 개인 분석
              포트폴리오입니다. 주식형 상품과 투자성 금융상품은 원금손실 가능성이 있으며,
              과거 수익률이 미래 수익률을 보장하지 않습니다.
            </p>

            <p>
              Yahoo Finance 데이터를 기준으로 하므로 일부 데이터는 지연되거나 누락될 수 있습니다.
              또한 상관관계는 인과관계를 의미하지 않으며, 실제 금융상품 선택 시에는 고객의
              투자성향, 투자기간, 유동성 필요성, 위험수용도를 함께 고려해야 합니다.
            </p>
          </div>
        </section>

        <section style={styles.aboutSection}>
          <div>
            <p style={styles.subText}>About This Project</p>
            <h2 style={styles.sectionTitle}>프로젝트 소개</h2>
            <p style={styles.profileLine}>
              김승현 | 경제통상학 전공 · 금융권 취업 포트폴리오
            </p>
            <p style={styles.aboutText}>
              이 프로젝트는 경제통상학 전공자로서 국내외 주식시장의 연동성을 데이터 기반으로
              해석하기 위해 제작한 금융시장 분석 포트폴리오입니다. 단순히 지수 수준을 비교하는
              것이 아니라, 서로 다른 가격 단위와 통화를 가진 시장을 동일 기준으로 지수화하고,
              기간별 수익률과 섹터별 테마 흐름을 함께 비교하는 데 초점을 두었습니다.
            </p>
          </div>

          <div style={styles.aboutGrid}>
            <div style={styles.aboutCard}>
              <h3>시장 이해도</h3>
              <p>한국 시장이 미국 기술주, 금리, 환율, 글로벌 섹터 모멘텀에 어떤 영향을 받는지 시각적으로 확인합니다.</p>
            </div>

            <div style={styles.aboutCard}>
              <h3>데이터 활용 역량</h3>
              <p>Yahoo Finance 데이터를 자동으로 불러오고, 지수화·수익률·상관계수 계산을 통해 분석합니다.</p>
            </div>

            <div style={styles.aboutCard}>
              <h3>금융권 직무 연결</h3>
              <p>은행·증권·자산관리 직무에서 필요한 시장 설명력, 상품 이해력, 고객 커뮤니케이션 역량과 연결할 수 있습니다.</p>
            </div>
          </div>
        </section>
               <section style={styles.linkSection}>
  <div>
    <p style={styles.subText}>Contact & Links</p>
    <h2 style={styles.sectionTitle}>포트폴리오 링크</h2>
    <p style={styles.aboutText}>
      블로그 기록과 이메일을 통해 프로젝트와 관련 활동을 확인할 수 있습니다.
    </p>
  </div>

  <div style={styles.linkButtonGroup}>
    <a
      style={styles.linkButton}
      href="https://blog.naver.com/snghnkm"
      target="_blank"
    >
      Blog
    </a>

    <a
      style={styles.linkButton}
      href="mailto:rlatmdgus26@naver.com"
    >
      Email
    </a>
  </div>
</section>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 45%, #1e293b 100%)",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif"
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "clamp(16px, 4vw, 32px)"
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
    flexWrap: "wrap"
  },
  title: {
    margin: 0,
    fontSize: "clamp(24px, 5vw, 28px)"
  },
  subText: {
    color: "#a8b7cf",
    margin: 0,
    fontSize: 14
  },
  ownerText: {
    color: "#dbeafe",
    margin: "6px 0 0 0",
    fontSize: 14
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: 0,
    borderRadius: 16,
    padding: "12px 16px",
    background: "#ffffff",
    color: "#020617",
    fontWeight: 700
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginBottom: 24
  },
  heroMain: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)"
  },
  heroSide: {
    display: "grid",
    gap: 16
  },
  badge: {
    display: "inline-block",
    padding: "8px 12px",
    border: "1px solid #475569",
    borderRadius: 999,
    color: "#dbeafe",
    marginBottom: 16
  },
  heroTitle: {
    fontSize: "clamp(32px, 7vw, 44px)",
    lineHeight: 1.15,
    margin: "0 0 16px 0"
  },
  description: {
    color: "#dbeafe",
    lineHeight: 1.7,
    fontSize: "clamp(15px, 3.6vw, 17px)"
  },
  periodBox: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 20
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 20,
    marginBottom: 20
  },
  statBox: {
    background: "#263449",
    borderRadius: 18,
    padding: 16
  },
  card: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 24,
    padding: 24
  },
  cardText: {
    color: "#a8b7cf",
    lineHeight: 1.6
  },
  notice: {
    color: "#a8b7cf",
    marginTop: 12
  },
  insightSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    marginBottom: 24
  },
  insightCard: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(20px, 4vw, 28px)",
    marginBottom: 16
  },
  insightTitle: {
    fontSize: "clamp(20px, 4vw, 22px)",
    margin: "8px 0 12px 0"
  },
  insightText: {
    color: "#dbeafe",
    lineHeight: 1.8,
    fontSize: "clamp(15px, 3.6vw, 16px)"
  },
  summarySection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 28px)",
    marginBottom: 24
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  summaryCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  chartCard: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(20px, 4vw, 28px)",
    marginBottom: 24,
    overflowX: "auto"
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap"
  },
  buttonGroup: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16
  },
  button: {
    border: 0,
    borderRadius: 14,
    padding: "10px 14px",
    background: "#263449",
    color: "#e2e8f0",
    fontWeight: 700
  },
  activeButton: {
    border: 0,
    borderRadius: 14,
    padding: "10px 14px",
    background: "#ffffff",
    color: "#020617",
    fontWeight: 700
  },
  chartBox: {
    height: 360,
    minWidth: 720
  },
  bankSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  bankGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  bankCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  productSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  productCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  productLabel: {
    color: "#a8b7cf",
    fontSize: 13,
    margin: "0 0 8px 0"
  },
  riskSection: {
    border: "1px solid #475569",
    background: "#182235",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  riskBox: {
    background: "#263449",
    borderRadius: 18,
    padding: 20,
    color: "#dbeafe",
    lineHeight: 1.8,
    marginTop: 16
  },
  aboutSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: "clamp(24px, 5vw, 28px)",
    margin: "8px 0 8px 0"
  },
  profileLine: {
    color: "#e2e8f0",
    margin: "0 0 14px 0",
    fontSize: 15,
    fontWeight: 700
  },
  aboutText: {
    color: "#dbeafe",
    lineHeight: 1.8,
    fontSize: "clamp(15px, 3.6vw, 16px)"
  },
  aboutGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  aboutCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  customerSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  customerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  customerCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  customerLabel: {
    color: "#a8b7cf",
    fontSize: 13,
    margin: "0 0 8px 0",
    fontWeight: 700
  },
  backgroundSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  backgroundGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  backgroundCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  howToSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  howToGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 20
  },
  howToCard: {
    background: "#263449",
    borderRadius: 18,
    padding: 18,
    color: "#dbeafe",
    lineHeight: 1.6
  },
  stepNumber: {
    color: "#a8b7cf",
    fontSize: 13,
    fontWeight: 700,
    margin: "0 0 8px 0"
  },
  linkSection: {
    border: "1px solid #334155",
    background: "#162033",
    borderRadius: 28,
    padding: "clamp(22px, 4vw, 32px)",
    marginBottom: 24
  },
  linkButtonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20
  },
  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 16,
    padding: "12px 18px",
    background: "#ffffff",
    color: "#020617",
    fontWeight: 700
  }
};
