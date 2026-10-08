"use client";
import { useEffect, useState } from "react";
import {
  LOCAL_STOCK_ORIGIN,
  PERSONAL_SESSION_KEY,
  validPersonalSession,
  type PersonalSession,
} from "../../lib/stock-client";
import styles from "./stocks.module.css";

type LocalStatus = {
  configured: boolean;
  sessions: number;
  siteOrigin: string;
};
const CONNECTION = "/api/stocks/connection";

export function PersonalConnection({
  session,
  onChange,
  connectionError,
}: {
  session: PersonalSession | null;
  onChange: (session: PersonalSession | null) => void;
  connectionError: string;
}) {
  const [local, setLocal] = useState<boolean | null>(null);
  const [status, setStatus] = useState<LocalStatus | null>(null);
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<{
    code: string;
    expiresAt: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const isLocal = window.location.origin === LOCAL_STOCK_ORIGIN;
    setLocal(isLocal);
    if (isLocal) {
      const controller = new AbortController();
      fetch(CONNECTION, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          if (!controller.signal.aborted) setStatus(data);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
      return () => controller.abort();
    }
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(PERSONAL_SESSION_KEY) ?? "null",
      );
      if (validPersonalSession(saved)) onChange(saved);
      else sessionStorage.removeItem(PERSONAL_SESSION_KEY);
    } catch {
      /* A blocked session store still permits a connection for this page. */
    }
  }, [onChange]);

  const remember = (value: PersonalSession | null) => {
    try {
      if (value)
        sessionStorage.setItem(PERSONAL_SESSION_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(PERSONAL_SESSION_KEY);
    } catch {
      /* The in-memory connection remains usable. */
    }
    onChange(value);
  };
  const send = async (base: string, action: string, pairingCode?: string) => {
    const response = await fetch(`${base}${CONNECTION}`, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...(pairingCode ? { code: pairingCode } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "개인 연결 실패");
    return data;
  };
  const issue = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setIssued(await send("", "issue"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "코드를 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const connect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!/^[a-f0-9]{18}$/i.test(code.replace(/[\s-]/g, "")))
        throw new Error(
          "토스 비밀키가 아닌, PC에서 만든 18자리 연결 코드를 입력해 주세요.",
        );
      const value = await send(LOCAL_STOCK_ORIGIN, "connect", code);
      if (!validPersonalSession(value))
        throw new Error("연결 응답을 확인하지 못했어요.");
      remember(value);
      setCode("");
      setMessage("이 탭에서 내 PC의 데이터를 조회합니다.");
    } catch (e) {
      setError(
        e instanceof TypeError ||
          (e instanceof DOMException && e.name === "TimeoutError")
          ? "PC 조회 프로그램이 실행 중인지 확인해 주세요. 브라우저가 로컬 네트워크 연결 권한을 물으면 허용해야 합니다. 지원하지 않는 브라우저에서는 PC 화면을 직접 이용해 주세요."
          : e instanceof Error
            ? e.message
            : "개인 연결 실패",
      );
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    const previous = session;
    remember(null);
    setError("");
    setMessage("개인 연결을 해제하고 공개 시세로 전환했어요.");
    if (previous) {
      try {
        await fetch(`${LOCAL_STOCK_ORIGIN}${CONNECTION}`, {
          method: "DELETE",
          credentials: "omit",
          redirect: "error",
          headers: { "X-Stock-Connection": previous.token },
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        /* The browser no longer holds the token; server sessions expire automatically. */
      }
    }
  };
  const revoke = async () => {
    setBusy(true);
    setError("");
    try {
      await send("", "revoke-all");
      setIssued(null);
      setStatus((s) => (s ? { ...s, sessions: 0 } : s));
      setMessage("발급된 코드와 모든 개인 연결을 해제했어요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결 해제 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      className={styles.personalPanel}
      id="personal-connection"
      open={local === true ? true : undefined}
    >
      <summary>
        <strong>내 PC 연결</strong>
        <span>
          {local
            ? "연결 코드 만들기"
            : session
              ? connectionError
                ? "연결 확인 필요"
                : "개인 연결 사용 중"
              : "토스 데이터를 이 홈페이지에서 보기"}
        </span>
      </summary>
      <div className={styles.personalBody}>
        {local === null ? (
          <p>연결 환경을 확인하고 있어요.</p>
        ) : local ? (
          <>
            <p>
              이 PC의 토스 설정을 사용해 홈페이지와 연결합니다. 비밀키는 PC에
              남고, 시세·차트·수급만 조회합니다.
            </p>
            <p>
              {status
                ? status.configured
                  ? "토스 API 설정 있음"
                  : "이 PC에 토스 API 설정이 필요해요."
                : "PC 설정 확인 중"}
            </p>
            <div className={styles.personalActions}>
              <button
                type="button"
                onClick={issue}
                disabled={busy || !status?.configured}
              >
                {busy ? "처리 중…" : "연결 코드 만들기"}
              </button>
              <button type="button" onClick={revoke} disabled={busy}>
                모든 개인 연결 해제
              </button>
              <a
                href={`${status?.siteOrigin ?? "https://kospi-swart.vercel.app"}/stocks#personal-connection`}
                target="_blank"
                rel="noopener noreferrer"
              >
                홈페이지 열기 ↗
              </a>
            </div>
            {issued && (
              <div className={styles.pairingCode}>
                <output aria-label="일회용 연결 코드">{issued.code}</output>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(issued.code);
                      setMessage("연결 코드를 복사했어요.");
                    } catch {
                      setMessage("코드를 선택해서 복사해 주세요.");
                    }
                  }}
                >
                  코드 복사
                </button>
                <small>
                  5분 동안 한 번 사용할 수 있어요. 새 코드를 만들면 이전 코드는
                  만료됩니다.
                </small>
              </div>
            )}
          </>
        ) : session ? (
          <>
            <p>
              이 브라우저 탭은 내 PC의 조회 프로그램에 연결되어 있어요. 연결은
              최대 8시간 유효하며 PC 프로그램이 종료되면 새 코드가 필요합니다.
            </p>
            <div className={styles.personalActions}>
              <button type="button" onClick={disconnect}>
                개인 연결 해제
              </button>
              <a
                href={`${LOCAL_STOCK_ORIGIN}/stocks#personal-connection`}
                target="_blank"
                rel="noopener noreferrer"
              >
                PC 연결 설정 ↗
              </a>
            </div>
            {connectionError && <p role="alert">{connectionError}</p>}
          </>
        ) : (
          <>
            <ol>
              <li>이 PC에서 조회 프로그램을 실행하세요.</li>
              <li>
                <a
                  href={`${LOCAL_STOCK_ORIGIN}/stocks#personal-connection`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PC 연결 설정 열기 ↗
                </a>
                에서 ‘연결 코드 만들기’를 누르세요.
              </li>
              <li>
                아래에 코드를 입력하면 이 홈페이지에서 토스 데이터를 볼 수
                있어요.
              </li>
            </ol>
            <form onSubmit={connect} className={styles.personalForm}>
              <label htmlFor="personal-code">일회용 연결 코드</label>
              <input
                id="personal-code"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={32}
                placeholder="PC에서 만든 연결 코드"
                required
              />
              <button type="submit" disabled={busy}>
                {busy ? "연결 중…" : "내 PC에 연결"}
              </button>
            </form>
            <p>
              추가 서버비 없이 같은 PC에서 사용합니다. 다른 방문자는 자신의 PC
              프로그램과 본인 토스 API 설정이 필요해요. 이 입력란에 토스
              비밀키를 넣지 마세요.
            </p>
            <a
              href="/guides/personal-toss-setup.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              처음 사용하는 분을 위한 설정 안내 ↗
            </a>
          </>
        )}
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
