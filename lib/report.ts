import { jsPDF } from "jspdf";
import { gunzipSync } from "fflate";
import { calculateReturn, maxDrawdown, returnCorrelation, formatReturn, formatCorrelation, type SeriesRow } from "./analytics";
import { perspectives, type Perspective, type ResearchNote } from "./research";
import type { ScenarioSnapshot } from "./scenarios";

export type ReportInput = { rows: SeriesRow[]; currencyBasis: "local" | "krw"; periodLabel: string; perspective: Perspective; commentary: string; note: ResearchNote | null; scenario: ScenarioSnapshot | null; updatedAt: string; stale: boolean; failedSymbols: string[] };

export function fontBase64(compressed: Uint8Array) {
  const bytes = compressed[0] === 0x1f && compressed[1] === 0x8b ? gunzipSync(compressed) : compressed;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
export async function fetchReportFont() {
  const res = await fetch("/fonts/report-korean.ttf.gz");
  if (!res.ok) throw new Error("PDF 한글 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.");
  return fontBase64(new Uint8Array(await res.arrayBuffer()));
}

export function createMarketPdf(input: ReportInput, font: string) {
  const { rows, currencyBasis, note, scenario } = input;
  if (rows.length < 2 || rows.some((row) => !Number.isFinite(Number(row.kospi)) || !Number.isFinite(Number(row.nasdaq)) || Number(row.kospi) <= 0 || Number(row.nasdaq) <= 0)) throw new Error("비교 가능한 지수 데이터가 필요합니다.");
  if (input.commentary.length > 300) throw new Error("리포트 해석은 300자 이하로 작성해 주세요.");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS("report.ttf", font); doc.addFont("report.ttf", "Report", "normal"); doc.setFont("Report");
  doc.setProperties({ title: "금융시장 분석 리포트 | 김승현", author: "김승현", subject: "KOSPI × NASDAQ Coupling Lab" });
  const text = (value: string, x: number, y: number, size = 10, color = "#16304c") => { doc.setFontSize(size); doc.setTextColor(color); doc.text(value.normalize("NFC").replace(/[−–—]/g, "-"), x, y); };
  const wrap = (value: string, x: number, y: number, width: number, size = 9, leading = 4.5) => {
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(value.normalize("NFC").replace(/[−–—]/g, "-"), width);
    lines.forEach((line, index) => text(line, x, y + index * leading, size));
    return lines.length;
  };
  const title = (label: string, y: number) => { text(label, 18, y, 10, "#0f766e"); doc.setDrawColor("#cbd5e1"); doc.line(18, y + 3, 192, y + 3); };
  const range = `${rows[0].month} ~ ${rows.at(-1)!.month}`;
  const basis = currencyBasis === "krw" ? "KOSPI 원화 / NASDAQ 원화 환산" : "KOSPI 원화 / NASDAQ 달러";
  const perspective = perspectives.find((p) => p.key === input.perspective)!;
  doc.setFillColor("#10263f"); doc.rect(0, 0, 210, 29, "F");
  text("금융시장 분석 리포트", 18, 14, 19, "#ffffff");
  text("KOSPI × NASDAQ Coupling Lab  |  김승현", 18, 22, 9, "#d7e5f3");
  text(range + `  ·  ${input.periodLabel}  ·  ${rows.length}개 공통 관측일`, 18, 37, 9);
  text(`${basis}  ·  ${perspective.label}`, 18, 43, 9);

  const metrics = [
    ["KOSPI 수익률", formatReturn(calculateReturn(rows, "kospi")), `최대 낙폭 ${formatReturn(maxDrawdown(rows, "kospi"))}`],
    ["NASDAQ 수익률", formatReturn(calculateReturn(rows, "nasdaq")), `최대 낙폭 ${formatReturn(maxDrawdown(rows, "nasdaq"))}`],
    ["수익률 상관계수", formatCorrelation(returnCorrelation(rows, "kospi", "nasdaq")), "공통 관측 구간 수익률 기준"]
  ];
  metrics.forEach(([label, value, detail], i) => {
    const x = 18 + i * 59;
    doc.setFillColor("#eff5fa"); doc.roundedRect(x, 49, 56, 26, 2, 2, "F");
    text(label, x + 4, 56, 8); text(value, x + 4, 65, 17); text(detail, x + 4, 71, 7.2);
  });
  title("01  시장 흐름 | 공통 시작일 = 100", 84);
  text("KOSPI", 126, 84, 8, "#2563eb"); text(currencyBasis === "krw" ? "NASDAQ (KRW)" : "NASDAQ (USD)", 149, 84, 8, "#0f766e");
  const plot = { x: 29, y: 94, w: 160, h: 38 };
  const values = rows.flatMap((row) => [Number(row.kospi), Number(row.nasdaq)]);
  const low = Math.min(...values), high = Math.max(...values), pad = Math.max(1, (high - low) * .1);
  const minimum = low - pad, maximum = high + pad;
  const start = Date.parse(rows[0].month), end = Date.parse(rows.at(-1)!.month);
  const xFor = (month: string) => plot.x + (Date.parse(month) - start) / (end - start || 1) * plot.w;
  const yFor = (value: number) => plot.y + (maximum - value) / (maximum - minimum) * plot.h;
  for (let tick = 0; tick <= 3; tick++) {
    const value = minimum + (maximum - minimum) * tick / 3, y = yFor(value);
    doc.setDrawColor("#dbe4ec"); doc.setLineWidth(.2); doc.line(plot.x, y, plot.x + plot.w, y);
    text(value.toFixed(0), 18, y + 1, 7, "#64748b");
  }
  for (const [key, color] of [["kospi", "#2563eb"], ["nasdaq", "#0f766e"]]) {
    doc.setDrawColor(color); doc.setLineWidth(.6);
    for (let i = 1; i < rows.length; i++) doc.line(xFor(rows[i - 1].month), yFor(Number(rows[i - 1][key])), xFor(rows[i].month), yFor(Number(rows[i][key])));
  }
  if (note && note.date >= rows[0].month && note.date <= rows.at(-1)!.month) {
    const after = rows.find((row) => row.month >= note.date)!;
    doc.setDrawColor("#b45309"); doc.setLineDashPattern([1, 1], 0); doc.line(xFor(after.month), plot.y, xFor(after.month), plot.y + plot.h); doc.setLineDashPattern([], 0);
    text("N", Math.min(185, xFor(after.month) + 1), plot.y + 3, 8, "#b45309");
  }
  text(rows[0].month, plot.x, 139, 7, "#64748b"); text(rows.at(-1)!.month, 171, 139, 7, "#64748b");
  title("02  작성자의 해석", 149);
  const commentLines = wrap(input.commentary.trim() || "아직 해석을 작성하지 않았습니다. 관측 사실과 원인 가설을 구분해 보완하세요.", 18, 159, 174, 9, 4.5);
  if (commentLines > 8) throw new Error("해석의 줄바꿈을 줄여 주세요. 한 장에 담으려면 8줄 이내가 필요합니다.");
  title("03  연결한 경제 이슈", 199);
  if (note) {
    wrap(`${note.date} | ${note.title}`, 18, 209, 174, 8.5, 4.1);
    text("기사·공시 원문 보기 (클릭)", 18, 222, 8, "#0f766e"); doc.link(18, 218, 64, 5, { url: note.source });
  } else text("연결된 이슈가 없습니다. 노트를 작성하고 리포트에 연결할 수 있습니다.", 18, 211, 8.5);
  title("04  선택한 시나리오 | 실제 전망이 아닌 입력 가정", 231);
  if (scenario) {
    text(scenario.results.map((r) => `${r.label}: ${r.value}`).join("  /  "), 18, 241, 9);
    wrap(scenario.assumptions.join("\n"), 18, 248, 174, 7.5, 3.8);
  } else text("유효한 시나리오가 선택되지 않았습니다.", 18, 241, 8.5);
  const time = input.updatedAt ? input.updatedAt.replace("T", " ").slice(0, 19) + " UTC" : "미확인";
  text(`데이터: Yahoo Finance | 수집: ${time}${input.stale ? " | 이전 수집 데이터" : ""}`, 18, 269, 7, "#64748b");
  wrap("공통 관측일의 종가 비교이며 장 마감 시각은 다릅니다. 상관관계는 인과관계가 아닙니다. 낙폭에는 장중 및 제외된 거래일 하락이 반영되지 않을 수 있습니다. 시나리오는 세금·비용·환헤지를 제외한 단순 가정입니다.", 18, 275, 174, 7, 3.4);
  if (input.failedSymbols.length) text(`일부 종목 수집 누락 ${input.failedSymbols.length}개: 사이트의 데이터 상태를 확인하세요.`, 18, 286, 7, "#9a3412");
  text("개인 분석 포트폴리오  |  과거 성과는 미래 성과를 보장하지 않습니다.", 18, 292, 7, "#64748b");
  text("1 / 1", 182, 292, 7, "#64748b");
  return doc;
}
