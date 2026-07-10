/**
 * ChessArena — correspondence chess against the site owner.
 *
 * Master–detail: a single list of every game on the left, one big board on the
 * right. Pick a game to watch it; if it's yours (you're White) or you're in
 * owner mode (you're Black) you can move right there. Every move is stored in
 * D1 and re-validated server-side. Only one board renders at a time, and only
 * the selected game polls — so switching is instant and there's no lag.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { api, timeAgo, type ChessGame, LIMITS } from "../../lib/interactive";

const GLYPH: Record<string, string> = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
const FILES = "abcdefgh";
const MY_GAME_KEY = "chess-my-game";
const OWNER_KEY = "chess-owner-key";
const NAME_KEY = "playground-name";
const POLL_MS = 5000;

type Role = "w" | "b" | null;

/** Replay the SAN history once to get the board grid + the last move's squares. */
function replay(game: ChessGame): {
  grid: ReturnType<Chess["board"]>;
  lastFrom: string | null;
  lastTo: string | null;
} {
  const c = new Chess();
  const sans = game.moves ? game.moves.trim().split(/\s+/) : [];
  let last: { from: string; to: string } | null = null;
  try {
    for (const s of sans) last = c.move(s);
  } catch {
    // Corrupt history — fall back to the authoritative FEN, no last-move hint.
    return { grid: new Chess(game.fen).board(), lastFrom: null, lastTo: null };
  }
  return { grid: c.board(), lastFrom: last?.from ?? null, lastTo: last?.to ?? null };
}

/** Numbered move pairs for the history panel. */
function pairs(moves: string): { n: number; w: string; b?: string }[] {
  const arr = moves ? moves.trim().split(/\s+/) : [];
  const out: { n: number; w: string; b?: string }[] = [];
  for (let i = 0; i < arr.length; i += 2) out.push({ n: i / 2 + 1, w: arr[i], b: arr[i + 1] });
  return out;
}

const lastSan = (moves: string): string => {
  const arr = moves ? moves.trim().split(/\s+/) : [];
  return arr.length ? arr[arr.length - 1] : "—";
};
const moveCount = (g: ChessGame) => (g.moves ? g.moves.trim().split(/\s+/).length : 0);

function Board({
  game,
  role,
  onMove,
  busy,
}: {
  game: ChessGame;
  role: Role;
  onMove: (from: string, to: string, promotion?: string) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legal, setLegal] = useState<Set<string>>(new Set());
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const chess = useMemo(() => new Chess(game.fen), [game.fen]);
  const { grid, lastFrom, lastTo } = useMemo(() => replay(game), [game]);
  const flip = role === "b";
  const canPlay = role !== null && game.status === "active" && game.turn === role && !busy;

  useEffect(() => {
    setSelected(null);
    setLegal(new Set());
    setPromo(null);
  }, [game.fen]);

  const click = (sq: string) => {
    if (!canPlay) return;
    if (selected && legal.has(sq)) {
      const needsPromo = chess
        .moves({ square: selected as Square, verbose: true })
        .some((m) => m.to === sq && m.promotion);
      if (needsPromo) setPromo({ from: selected, to: sq });
      else onMove(selected, sq);
      setSelected(null);
      setLegal(new Set());
      return;
    }
    setPromo(null);
    const p = chess.get(sq as Square);
    if (p && p.color === role) {
      setSelected(sq);
      setLegal(new Set(chess.moves({ square: sq as Square, verbose: true }).map((m) => m.to)));
    } else {
      setSelected(null);
      setLegal(new Set());
    }
  };

  const rows = flip ? [...grid].reverse().map((row) => [...row].reverse()) : grid;
  const ranks = flip ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const fileLabels = flip ? [...FILES].reverse() : [...FILES];

  return (
    <div className="cma__boardwrap">
      {promo && (
        <div className="cma__promo" role="group" aria-label="choose promotion piece">
          <span>promote to</span>
          {(["q", "r", "b", "n"] as const).map((p) => (
            <button key={p} onClick={() => { onMove(promo.from, promo.to, p); setPromo(null); }} aria-label={`promote to ${p}`}>
              {GLYPH[p]}
            </button>
          ))}
          <button className="x" onClick={() => setPromo(null)} aria-label="cancel promotion">×</button>
        </div>
      )}
      <div className="cma__bgrid">
        <div className="cma__ranks">{ranks.map((n) => <span key={n}>{n}</span>)}</div>
        <div className={`cma__board${busy ? " busy" : ""}`} role="grid" aria-label="chess board">
          {rows.map((row, ri) =>
            row.map((cell, ci) => {
              const r = flip ? 7 - ri : ri;
              const c = flip ? 7 - ci : ci;
              const sq = `${FILES[c]}${8 - r}`;
              const dark = (r + c) % 2 === 1;
              const isLast = sq === lastFrom || sq === lastTo;
              return (
                <button
                  key={sq}
                  className={`cma__sq${dark ? " dark" : ""}${selected === sq ? " sel" : ""}${isLast ? " last" : ""}`}
                  onClick={() => click(sq)}
                  aria-label={sq}
                  disabled={!canPlay}
                >
                  {cell && <span className={`cma__pc ${cell.color === "w" ? "wp" : "bp"}`}>{GLYPH[cell.type]}</span>}
                  {legal.has(sq) && <span className={`cma__dot${cell ? " cap" : ""}`} />}
                </button>
              );
            }),
          )}
        </div>
        <div className="cma__files">{fileLabels.map((f) => <span key={f}>{f}</span>)}</div>
      </div>
    </div>
  );
}

export default function ChessArena() {
  const [games, setGames] = useState<ChessGame[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [my, setMy] = useState<{ id: number; token: string } | null>(null);
  const [name, setName] = useState("");
  const website = useRef("");

  const [ownerKey, setOwnerKey] = useState("");
  const [ownerOn, setOwnerOn] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  // ---- bootstrap ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_GAME_KEY);
      if (raw) setMy(JSON.parse(raw));
      const n = localStorage.getItem(NAME_KEY);
      if (n) setName(n);
      const k = localStorage.getItem(OWNER_KEY);
      if (k) { setOwnerKey(k); setOwnerOn(true); }
    } catch { /* ignore */ }
  }, []);

  const mergeGame = useCallback((g: ChessGame) => {
    setGames((prev) => {
      const i = prev.findIndex((x) => x.id === g.id);
      if (i === -1) return [g, ...prev];
      const next = [...prev];
      next[i] = { ...next[i], ...g };
      return next;
    });
  }, []);

  const refreshList = useCallback(async () => {
    const res = await api.chessList();
    if (res.ok) setGames(res.data.games || []);
    setLoading(false);
  }, []);

  const refreshOne = useCallback(async (id: number) => {
    const res = await api.chessGet(id);
    if (res.ok) mergeGame(res.data.game);
    else if (res.status === 404 && my?.id === id) {
      setMy(null);
      try { localStorage.removeItem(MY_GAME_KEY); } catch { /* ignore */ }
    }
  }, [mergeGame, my]);

  useEffect(() => { refreshList(); }, [refreshList]);

  // Default selection once games load: your game → a game waiting on the owner → newest.
  useEffect(() => {
    if (selectedId !== null || games.length === 0) return;
    const mine = my && games.find((g) => g.id === my.id);
    const waiting = ownerOn && games.find((g) => g.status === "active" && g.turn === "b");
    setSelectedId((mine || waiting || games[0]).id);
  }, [games, my, ownerOn, selectedId]);

  const selected = games.find((g) => g.id === selectedId) || null;

  // Poll: refresh the selected active game every 5s, plus the list less often.
  useEffect(() => {
    let tick = 0;
    const t = window.setInterval(() => {
      tick++;
      if (selected && selected.status === "active") refreshOne(selected.id);
      if (tick % 3 === 0) refreshList(); // ~15s
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [selected, refreshOne, refreshList]);

  // ---- derived roles ----
  const isMine = !!(selected && my && selected.id === my.id);
  const role: Role =
    selected && selected.status === "active"
      ? isMine && selected.turn === "w"
        ? "w"
        : ownerOn && selected.turn === "b"
          ? "b"
          : null
      : null;

  // ---- actions ----
  const start = async () => {
    if (busy || my) return;
    setBusy(true);
    setNote(null);
    const clean = name.trim().slice(0, LIMITS.name);
    const res = await api.chessCreate(clean || "anon", website.current);
    setBusy(false);
    if (!res.ok) { setNote(res.error || "Could not start a game."); return; }
    const mine = { id: res.data.game.id, token: res.data.token };
    setMy(mine);
    mergeGame(res.data.game);
    setSelectedId(res.data.game.id);
    try {
      localStorage.setItem(MY_GAME_KEY, JSON.stringify(mine));
      if (clean) localStorage.setItem(NAME_KEY, clean);
    } catch { /* ignore */ }
  };

  const doMove = async (from: string, to: string, promotion?: string) => {
    if (!selected || busy) return;
    setBusy(true);
    setNote(null);
    const res =
      role === "w" && my
        ? await api.chessMove({ id: selected.id, token: my.token, from, to, promotion })
        : role === "b" && ownerOn
          ? await api.chessOwnerMove({ id: selected.id, key: ownerKey, from, to, promotion })
          : null;
    setBusy(false);
    if (!res) return;
    if (!res.ok) {
      setNote(res.error || "Move rejected.");
      if (res.status === 401) lock();
      refreshOne(selected.id);
      return;
    }
    mergeGame(res.data.game);
    setNote(role === "w" ? "Move sent — Aryan gets pinged and will reply." : null);
  };

  const resign = async () => {
    if (!selected || busy) return;
    setBusy(true);
    if (isMine && my) await api.chessResign({ id: selected.id, token: my.token });
    else if (ownerOn) await api.chessResign({ id: selected.id, key: ownerKey });
    setBusy(false);
    if (isMine) {
      setMy(null);
      try { localStorage.removeItem(MY_GAME_KEY); } catch { /* ignore */ }
    }
    refreshList();
  };

  const unlock = async () => {
    const k = keyInput.trim();
    if (!k || busy) return;
    setBusy(true);
    const res = await api.chessVerifyKey(k);
    setBusy(false);
    if (!res.ok) { setNote("Wrong key."); return; }
    setNote(null);
    setOwnerKey(k);
    setOwnerOn(true);
    setKeyInput("");
    try { localStorage.setItem(OWNER_KEY, k); } catch { /* ignore */ }
  };
  const lock = () => {
    setOwnerOn(false);
    setOwnerKey("");
    try { localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
  };

  // ---- list model ----
  const waitingOnOwner = games.filter((g) => g.status === "active" && g.turn === "b").length;
  const turnTag = (g: ChessGame) =>
    g.status !== "active" ? g.status : g.turn === "w" ? `${g.visitorName}'s move` : "Aryan's move";
  const canMoveNow = role !== null;

  return (
    <div className="cma">
      {/* toolbar */}
      <div className="cma__bar">
        {!my ? (
          <form className="cma__start" onSubmit={(e) => { e.preventDefault(); start(); }}>
            <input
              className="cma__input"
              value={name}
              maxLength={LIMITS.name}
              placeholder="your name"
              onChange={(e) => setName(e.target.value)}
              aria-label="Your name"
            />
            <input type="text" tabIndex={-1} autoComplete="off" className="cma__hp" onChange={(e) => (website.current = e.target.value)} aria-hidden="true" />
            <button className="cma__btn" disabled={busy}>{busy ? "starting…" : "challenge me"}</button>
          </form>
        ) : (
          <span className="cma__ident">
            you're playing as <strong>White</strong> in game #{my.id}
            <button className="cma__ghost" onClick={() => setSelectedId(my.id)}>open</button>
          </span>
        )}
        {!ownerOn ? (
          <details className="cma__ownerbox">
            <summary>owner</summary>
            <div className="cma__ownerrow">
              <input
                className="cma__input"
                type={showKey ? "text" : "password"}
                value={keyInput}
                placeholder="moderation key"
                onChange={(e) => setKeyInput(e.target.value)}
                aria-label="Moderation key"
              />
              <button type="button" className="cma__ghost" onClick={() => setShowKey((s) => !s)}>{showKey ? "hide" : "show"}</button>
              <button type="button" className="cma__btn" onClick={unlock}>unlock</button>
            </div>
          </details>
        ) : (
          <span className="cma__ident cma__ident--owner">
            owner mode · <strong>{waitingOnOwner}</strong> waiting on you
            <button className="cma__ghost" onClick={lock}>lock</button>
          </span>
        )}
      </div>

      <div className="cma__main">
        {/* game list */}
        <aside className="cma__list" aria-label="games">
          <div className="cma__listhead">
            <span>games</span>
            <span>{games.length}</span>
          </div>
          {loading && <p className="cma__empty">loading…</p>}
          {!loading && games.length === 0 && <p className="cma__empty">no games yet.</p>}
          <ul>
            {games.map((g) => {
              const mineTag = my?.id === g.id;
              const yourTurn =
                g.status === "active" && ((mineTag && g.turn === "w") || (ownerOn && g.turn === "b"));
              return (
                <li key={g.id}>
                  <button
                    className={`cma__lrow${selectedId === g.id ? " on" : ""}${yourTurn ? " act" : ""}`}
                    onClick={() => setSelectedId(g.id)}
                  >
                    <span className={`cma__dotturn ${g.status !== "active" ? "done" : g.turn === "w" ? "w" : "b"}`} aria-hidden="true" />
                    <span className="cma__lmain">
                      <span className="cma__lname">
                        {g.visitorName}{mineTag && <em> · you</em>}
                      </span>
                      <span className="cma__lsub">
                        {moveCount(g)} moves · last {lastSan(g.moves)} · {timeAgo(g.updatedAt)}
                      </span>
                    </span>
                    <span className="cma__ltag">{yourTurn ? "your move" : turnTag(g)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* detail */}
        <div className="cma__detail">
          {!selected ? (
            <p className="cma__empty">select a game, or challenge me to start one.</p>
          ) : (
            <>
              <div className="cma__dhead">
                <div>
                  <p className="cma__dtitle">
                    #{selected.id} · {selected.visitorName} <span className="cma__vs">(White)</span> vs. Aryan <span className="cma__vs">(Black)</span>
                  </p>
                  <p className={`cma__dstat${canMoveNow ? " you" : ""}`}>
                    {selected.status !== "active"
                      ? selected.status
                      : canMoveNow
                        ? "your move"
                        : selected.turn === "w"
                          ? `${selected.visitorName} to move`
                          : "Aryan to move"}
                  </p>
                </div>
                {(isMine || ownerOn) && selected.status === "active" && (
                  <button className="cma__ghost" onClick={resign}>
                    {isMine ? "resign" : "close"}
                  </button>
                )}
              </div>

              <Board game={selected} role={role} onMove={doMove} busy={busy} />

              {selected.moves && (
                <ol className="cma__history">
                  {pairs(selected.moves).map((p) => (
                    <li key={p.n}>
                      <span className="cma__hn">{p.n}.</span>
                      <span className="cma__hw">{p.w}</span>
                      <span className="cma__hb">{p.b || ""}</span>
                    </li>
                  ))}
                </ol>
              )}
              {note && <p className="cma__note">{note}</p>}
            </>
          )}
        </div>
      </div>

      <style>{`
        .cma { display: flex; flex-direction: column; gap: var(--space-lg); }
        .cma__bar { display: flex; flex-wrap: wrap; gap: var(--space-md) var(--space-lg); align-items: center;
          justify-content: space-between; padding-bottom: var(--space-md); border-bottom: 1px solid var(--color-border-subtle);
          font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
        .cma__start { display: flex; gap: 6px; }
        .cma__input { min-width: 0; background: transparent; color: var(--color-text-primary);
          border: 1px solid var(--color-border); padding: 7px 10px; font-family: var(--font-mono); font-size: var(--text-xs); }
        .cma__input:focus-visible { outline: 1px solid var(--color-accent-primary); outline-offset: 0; }
        .cma__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .cma__btn { padding: 7px 14px; border: 1px solid var(--color-text-primary); background: transparent;
          color: var(--color-text-primary); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-xs); }
        .cma__btn:hover { border-color: var(--color-accent-highlight); color: var(--color-accent-highlight); }
        .cma__btn:disabled { opacity: 0.5; cursor: default; }
        .cma__ghost { border: none; background: none; color: var(--color-text-tertiary); cursor: pointer;
          font-family: var(--font-mono); font-size: var(--text-xs); text-decoration: underline; text-underline-offset: 3px; margin-left: 8px; }
        .cma__ghost:hover { color: var(--color-text-primary); }
        .cma__ident strong { color: var(--color-accent-highlight); font-weight: 500; }
        .cma__ident--owner strong { color: var(--color-warning); }
        .cma__ownerbox summary { cursor: pointer; color: var(--color-text-tertiary); }
        .cma__ownerrow { display: flex; gap: 6px; align-items: center; margin-top: 8px; }

        .cma__main { display: grid; grid-template-columns: 1fr; gap: var(--space-lg); }
        @media (min-width: 780px) { .cma__main { grid-template-columns: minmax(220px, 280px) 1fr; align-items: start; } }

        /* list */
        .cma__list { border: 1px solid var(--color-border); min-width: 0; }
        .cma__listhead { display: flex; justify-content: space-between; padding: 8px 12px;
          border-bottom: 1px solid var(--color-border); font-family: var(--font-mono); font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.14em; color: var(--color-text-tertiary); }
        .cma__list ul { list-style: none; margin: 0; padding: 0; max-height: 520px; overflow-y: auto; }
        .cma__lrow { display: flex; gap: 9px; align-items: center; width: 100%; text-align: left; border: 0;
          background: transparent; cursor: pointer; padding: 9px 12px; border-bottom: 1px solid var(--color-border-subtle);
          font-family: var(--font-mono); }
        .cma__lrow:hover { background: var(--color-bg-secondary); }
        .cma__lrow.on { background: color-mix(in srgb, var(--color-accent-primary) 16%, transparent); }
        .cma__lrow.act { box-shadow: inset 3px 0 0 var(--color-accent-highlight); }
        .cma__dotturn { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; }
        .cma__dotturn.w { background: #eeeef2; }
        .cma__dotturn.b { background: var(--color-accent-highlight); }
        .cma__dotturn.done { background: var(--color-text-tertiary); }
        .cma__lmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .cma__lname { font-size: var(--text-xs); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cma__lname em { color: var(--color-accent-highlight); font-style: normal; }
        .cma__lsub { font-size: 10px; color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cma__ltag { flex: 0 0 auto; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); }
        .cma__lrow.act .cma__ltag { color: var(--color-accent-highlight); }

        /* detail */
        .cma__detail { min-width: 0; }
        .cma__dhead { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); margin-bottom: var(--space-md); }
        .cma__dtitle { margin: 0; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-primary); }
        .cma__vs { color: var(--color-text-tertiary); }
        .cma__dstat { margin: 3px 0 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
        .cma__dstat.you { color: var(--color-accent-highlight); }
        .cma__note { margin: var(--space-sm) 0 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }

        .cma__boardwrap { position: relative; }
        .cma__promo { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 0 var(--space-sm);
          font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
        .cma__promo button { border: 1px solid var(--color-border); background: var(--color-bg-secondary);
          color: var(--color-text-primary); cursor: pointer; font-size: 22px; line-height: 1; width: 38px; height: 38px; }
        .cma__promo button:hover { border-color: var(--color-accent-highlight); }
        .cma__promo button.x { font-size: 16px; color: var(--color-text-tertiary); }

        .cma__bgrid { display: grid; grid-template-columns: 14px 1fr; grid-template-rows: 1fr 14px;
          gap: 3px; max-width: 480px; }
        .cma__ranks { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; justify-content: space-around;
          font-family: var(--font-mono); font-size: 9px; color: var(--color-text-tertiary); }
        .cma__files { grid-column: 2; grid-row: 2; display: flex; justify-content: space-around;
          font-family: var(--font-mono); font-size: 9px; color: var(--color-text-tertiary); }
        .cma__board { grid-column: 2; grid-row: 1; display: grid; grid-template-columns: repeat(8, 1fr);
          aspect-ratio: 1; width: 100%; border: 1px solid var(--color-border); }
        .cma__board.busy { opacity: 0.85; }
        .cma__sq { position: relative; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center;
          aspect-ratio: 1; font-size: clamp(24px, 6.5vw, 40px); line-height: 1; background: #b7bccb; }
        .cma__sq.dark { background: #5b6176; }
        .cma__sq:disabled { cursor: default; }
        .cma__sq.last { box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-accent-highlight) 60%, transparent); }
        .cma__sq.sel { box-shadow: inset 0 0 0 3px var(--color-accent-highlight); }
        /* High-contrast, outlined pieces so black reads on every square. */
        .cma__pc { pointer-events: none; }
        .cma__pc.wp { color: #fbfbfd; -webkit-text-stroke: 1.4px #14141a; text-shadow: 0 1px 1px rgba(0,0,0,0.35); }
        .cma__pc.bp { color: #101016; -webkit-text-stroke: 1.4px #eef0f6; }
        .cma__dot { position: absolute; width: 22%; height: 22%; border-radius: 50%;
          background: color-mix(in srgb, var(--color-accent-primary) 78%, transparent); pointer-events: none; }
        .cma__dot.cap { width: 84%; height: 84%; border-radius: 0; background: none;
          box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 78%, transparent); }

        .cma__history { list-style: none; margin: var(--space-md) 0 0; padding: var(--space-sm) 0 0;
          border-top: 1px solid var(--color-border-subtle); display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 2px 12px;
          max-height: 160px; overflow-y: auto; font-family: var(--font-mono); font-size: var(--text-xs); }
        .cma__history li { display: grid; grid-template-columns: 26px 1fr 1fr; gap: 6px; }
        .cma__hn { color: var(--color-text-tertiary); }
        .cma__hw { color: var(--color-text-primary); }
        .cma__hb { color: var(--color-accent-highlight); }
        .cma__empty { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); padding: var(--space-md) 0; }
      `}</style>
    </div>
  );
}
