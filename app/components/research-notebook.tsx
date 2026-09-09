"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_NOTES, notebookJson, parseNotebook, perspectives, validateNote, type ResearchNote, type Perspective } from "../../lib/research";
import { downloadText } from "../../lib/download";

type Draft = Omit<ResearchNote, "id" | "updatedAt">;
const emptyDraft = (): Draft => ({ date: "", title: "", source: "", fact: "", interpretation: "", followUp: "", perspective: "market" });
export function ResearchNotebook({ notes, onChange, selectedId, onSelect }: { notes: ResearchNote[]; onChange: (notes: ResearchNote[]) => void; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState("[]");
  const [deleted, setDeleted] = useState<ResearchNote | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(notes) !== saved || !!draft.title || !!draft.source || !!draft.fact || !!draft.interpretation || !!draft.followUp;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const note: ResearchNote = { ...draft, title: draft.title.trim(), source: draft.source.trim(), id: editingId || crypto.randomUUID(), updatedAt: new Date().toISOString() };
    if (!validateNote(note)) { setStatus("날짜·제목·기사 URL을 확인해 주세요. 출처는 http 또는 https 주소로 입력합니다."); return; }
    if (!editingId && notes.length >= MAX_NOTES) { setStatus("한 파일에는 최대 50개 노트를 담을 수 있습니다."); return; }
    onChange(editingId ? notes.map((n) => n.id === editingId ? note : n) : [...notes, note]);
    onSelect(note.id); setDraft(emptyDraft()); setEditingId(null);
    setStatus("노트가 추가·수정되었습니다. 보관하려면 ‘노트 파일 저장’을 눌러 주세요.");
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("노트 파일은 1MB 이하만 불러올 수 있습니다.");
      const imported = parseNotebook(await file.text());
      const ids = new Set(notes.map((n) => n.id));
      const additions = imported.filter((n) => !ids.has(n.id));
      if (notes.length + additions.length > MAX_NOTES) throw new Error("노트 합계가 50개를 초과합니다.");
      const next = [...notes, ...additions];
      onChange(next);
      if (!notes.length) setSaved(JSON.stringify(next));
      if (!selectedId && next.length) onSelect(next[0].id);
      setStatus(`${additions.length}개 노트를 불러왔습니다. 같은 ID의 기존 노트는 덮어쓰지 않았습니다.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "파일을 읽지 못했습니다."); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  }
  function saveFile() {
    downloadText(notebookJson(notes), "coupling-lab-notes.json", "application/json");
    setSaved(JSON.stringify(notes)); setStatus("노트 파일 다운로드를 시작했습니다. 다운로드한 파일을 보관해 주세요.");
  }
  function edit(note: ResearchNote) {
    setDraft({ date: note.date, title: note.title, source: note.source, fact: note.fact, interpretation: note.interpretation, followUp: note.followUp, perspective: note.perspective });
    setEditingId(note.id); setStatus("선택한 노트를 편집하고 있습니다.");
    document.getElementById("note-title")?.focus();
  }

  return <section id="research-notes" className="analysis-panel" aria-labelledby="notes-heading">
    <div className="analysis-heading"><div><p className="eyebrow">Research Notebook</p><h2 id="notes-heading">경제 이슈를 나의 해석으로</h2></div><div className="memo-actions"><button onClick={saveFile} disabled={!notes.length}>노트 파일 저장</button><button onClick={() => fileInput.current?.click()}>노트 파일 불러오기</button><input hidden ref={fileInput} type="file" accept=".json,application/json" aria-label="저장한 노트 파일" onChange={(e) => importFile(e.target.files?.[0])} /></div></div>
    <p className="muted">기사에서 확인한 사실과 본인의 판단을 구분해 기록합니다. 노트 날짜는 위 지수 차트에 번호로 표시됩니다. 휴장일은 이후 첫 공통 관측일에 연결합니다.</p>
    <p className="storage-note">노트는 현재 페이지에서 편집하고 파일로 보관합니다. 페이지를 떠나기 전 ‘노트 파일 저장’을 누르세요. 다음 방문에 파일을 불러오면 이어서 작성할 수 있습니다. 공개 사이트에 자동 게시되지는 않습니다.</p>
    <form onSubmit={submit} className="note-form">
      <div className="input-grid"><label className="field">이슈 날짜<input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label className="field">분석 관점<select value={draft.perspective} onChange={(e) => setDraft({ ...draft, perspective: e.target.value as Perspective })}>{perspectives.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label></div>
      <label className="field" htmlFor="note-title">이슈 제목<input id="note-title" required maxLength={100} value={draft.title} placeholder="예: 금리 발표 이후 시장의 반응에서 확인한 점" onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="field">기사·공시 출처 URL<input type="url" required maxLength={1000} value={draft.source} placeholder="https://" onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></label>
      <div className="note-writing-grid">{([['fact', '관측된 사실', '기사·공시에서 확인한 내용과 차트 수치를 기록하세요.'], ['interpretation', '나의 해석', '어떤 가설을 세웠으며 그 근거는 무엇인가요?'], ['followUp', '추가 확인·사후 점검', '반대 근거, 이후 지표와 예상이 달랐던 점을 기록하세요.']] as const).map(([key, label, placeholder]) => <label className="field" key={key}>{label}<textarea rows={5} maxLength={1000} value={draft[key]} placeholder={placeholder} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /><span className="muted">{draft[key].length}/1,000자</span></label>)}</div>
      <div className="memo-actions"><button type="submit">{editingId ? "수정 반영" : "노트 추가"}</button>{editingId && <button type="button" onClick={() => { setDraft(emptyDraft()); setEditingId(null); }}>편집 취소</button>}</div>
    </form>
    <p role="status" className="muted">{status}</p>
    {deleted && <p className="muted">노트를 목록에서 삭제했습니다. <button className="secondary-action" onClick={() => { if (notes.length < MAX_NOTES) { onChange([...notes, deleted]); setDeleted(null); } }}>실행 취소</button></p>}
    {!notes.length ? <div className="empty-note">아직 작성한 노트가 없습니다. 기사를 읽고 떠올린 첫 번째 가설을 기록해 보세요.</div> : <div className="note-list">{notes.map((note, index) => <article key={note.id} className={`note-card ${selectedId === note.id ? "selected-note" : ""}`}>
      <p className="eyebrow">{index + 1}. {note.date} · {perspectives.find((p) => p.key === note.perspective)?.label}</p><h3>{note.title}</h3><a href={note.source} target="_blank" rel="noopener noreferrer">기사·공시 원문</a>
      <dl>{([['fact', '관측 사실'], ['interpretation', '나의 해석'], ['followUp', '추가 확인']] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{note[key] || "미작성"}</dd></div>)}</dl>
      <div className="memo-actions"><button aria-pressed={selectedId === note.id} onClick={() => onSelect(selectedId === note.id ? null : note.id)}>{selectedId === note.id ? "리포트 연결됨" : "리포트에 연결"}</button><button onClick={() => edit(note)}>편집</button><button onClick={() => { setDeleted(note); onChange(notes.filter((n) => n.id !== note.id)); if (selectedId === note.id) onSelect(null); if (editingId === note.id) { setDraft(emptyDraft()); setEditingId(null); } }}>삭제</button></div>
    </article>)}</div>}
  </section>;
}
