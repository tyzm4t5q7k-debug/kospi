export const perspectives = [
  { key: "market", label: "공통 시장 분석", heading: "분석을 확장할 질문", questions: ["관측된 변화와 원인에 대한 가설을 구분했는가?", "기간·통화·비교 기준을 바꾸어도 해석이 유지되는가?", "반대 근거와 추가로 확인할 자료는 무엇인가?"] },
  { key: "rm", label: "기업금융", heading: "기업의 현금흐름에서 확인할 질문", questions: ["외화 수취와 지급의 규모·통화·시점은 어떻게 다른가?", "차입금의 변동금리 비중과 만기 일정은 어떠한가?", "기존 환헤지와 가격 전가 가능성을 확인했는가?"] },
  { key: "personal", label: "개인 자산관리", heading: "고객의 자금 목적에서 확인할 질문", questions: ["자금 사용 시점과 감내할 수 있는 손실 범위는 얼마인가?", "기존 자산까지 포함한 해외자산·환율 노출은 어느 정도인가?", "상품의 비용·환헤지·유동성 조건을 이해했는가?"] },
  { key: "research", label: "증권 리서치", heading: "분석 가설을 점검할 질문", questions: ["가격 변화가 실적 전망·밸류에이션·수급 중 무엇과 연결되는가?", "동일 업종 안에서도 사업 구조와 매출 지역은 어떻게 다른가?", "가설을 반박할 지표와 다음 공시 일정은 무엇인가?"] },
  { key: "asset", label: "자산운용", heading: "포트폴리오 관점에서 확인할 질문", questions: ["벤치마크와 비교한 국가·섹터·환율 노출은 어떠한가?", "성과 중 자산 가격·환율·배분 효과를 구분했는가?", "낙폭·집중도·유동성을 함께 고려할 때 위험 예산은 적절한가?"] }
] as const;
export type Perspective = typeof perspectives[number]["key"];
export type ResearchNote = { id: string; date: string; title: string; source: string; fact: string; interpretation: string; followUp: string; perspective: Perspective; updatedAt: string };
export const MAX_NOTES = 50;

export function validSource(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateNote(value: unknown): value is ResearchNote {
  if (!value || typeof value !== "object") return false;
  const n = value as ResearchNote;
  return typeof n.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(n.id) && typeof n.date === "string" && validDate(n.date)
    && typeof n.title === "string" && n.title.trim().length > 0 && n.title.length <= 100
    && typeof n.source === "string" && n.source.length <= 1000 && validSource(n.source)
    && [n.fact, n.interpretation, n.followUp].every((v) => typeof v === "string" && v.length <= 1000)
    && perspectives.some((p) => p.key === n.perspective) && typeof n.updatedAt === "string" && Number.isFinite(Date.parse(n.updatedAt));
}
export function parseNotebook(text: string): ResearchNote[] {
  if (text.length > 1_000_000) throw new Error("노트 파일은 1MB 이하만 불러올 수 있습니다.");
  const data = JSON.parse(text);
  if (data.version !== 1 || !Array.isArray(data.notes) || data.notes.length > MAX_NOTES || !data.notes.every(validateNote)) throw new Error("지원하지 않는 노트 파일입니다. 저장한 원본 파일을 확인해 주세요.");
  if (new Set(data.notes.map((n: ResearchNote) => n.id)).size !== data.notes.length) throw new Error("파일에 중복된 노트가 있습니다.");
  return data.notes;
}
export function notebookJson(notes: ResearchNote[]) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes }, null, 2);
}
export function chartAnnotations(notes: ResearchNote[], rows: { month: string }[]) {
  if (!rows.length) return [];
  return notes.map((note, index) => {
    if (note.date < rows[0].month || note.date > rows.at(-1)!.month) return null;
    const point = rows.find((row) => row.month >= note.date);
    if (!point || Date.parse(point.month) - Date.parse(note.date) > 7 * 86400000) return null;
    return { ...note, chartDate: point.month, number: index + 1 };
  }).filter((n): n is ResearchNote & { chartDate: string; number: number } => n !== null);
}
