/**
 * ChessArena — correspondence chess against the site owner.
 *
 * Master–detail: a collapsible / resizable game list on the left, one board on
 * the right that grows to fill the freed space. Pick a game to watch; if it's
 * yours (White) or you're in owner mode (Black) you can move. A collapsible
 * standings panel ranks everyone by their record against Aryan. Only the
 * selected game polls, and only one board renders — so it stays snappy.
 *
 * Pieces use distinct glyph sets — outline for White, filled for Black — with
 * the text-presentation selector, so they read by SHAPE (not just colour) and
 * never fall back to emoji rendering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { api, timeAgo, type ChessGame, type ChessStanding, LIMITS } from "../../lib/interactive";

const VS = "︎"; // text-presentation selector: forbid emoji rendering
const WGLYPH: Record<string, string> = { k: "♔" + VS, q: "♕" + VS, r: "♖" + VS, b: "♗" + VS, n: "♘" + VS, p: "♙" + VS };
const BGLYPH: Record<string, string> = { k: "♚" + VS, q: "♛" + VS, r: "♜" + VS, b: "♝" + VS, n: "♞" + VS, p: "♟" + VS };
const glyph = (type: string, color: "w" | "b") => (color === "w" ? WGLYPH : BGLYPH)[type];

const FILES = "abcdefgh";
const MY_GAME_KEY = "chess-my-game";
const OWNER_KEY = "chess-owner-key";
const POLL_MS = 5000;

type Role = "w" | "b" | null;

function replay(game: ChessGame): { grid: ReturnType<Chess["board"]>; lastFrom: string | null; lastTo: string | null } {
  const c = new Chess();
  const sans = game.moves ? game.moves.trim().split(/\s+/) : [];
  let last: { from: string; to: string } | null = null;
  try {
    for (const s of sans) last = c.move(s);
  } catch {
    return { grid: new Chess(game.fen).board(), lastFrom: null, lastTo: null };
  }
  return { grid: c.board(), lastFrom: last?.from ?? null, lastTo: last?.to ?? null };
}

function pairs(moves: string): { n: number; w: string; b?: string }[] {
  const arr = moves ? moves.trim().split(/\s+/) : [];
  const out: { n: number; w: string; b?: string }[] = [];
  for (let i = 0; i < arr.length; i += 2) out.push({ n: i / 2 + 1, w: arr[i], b: arr[i + 1] });
  return out;
}
const lastSan = (moves: string): string => {
  const arr = moves ? moves.trim().split(/\s+/) : [];
  return arr.length ? arr[arr.length - 1] : "·";
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
      const needsPromo = chess.moves({ square: selected as Square, verbose: true }).some((m) => m.to === sq && m.promotion);
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
              {glyph(p, role || "b")}
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
                  {cell && <span className={`cma__pc ${cell.color === "w" ? "wp" : "bp"}`}>{glyph(cell.type, cell.color)}</span>}
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

function Standings() {
  const [rows, setRows] = useState<ChessStanding[] | null>(null);
  const load = useCallback(async () => {
    const res = await api.chessStandings();
    if (res.ok) setRows(res.data.standings || []);
    else setRows([]);
  }, []);

  const ranked = useMemo(() => {
    if (!rows) return [];
    return [...rows]
      .map((r) => ({ ...r, played: r.wins + r.losses + r.draws, points: r.wins + r.draws * 0.5 }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses);
  }, [rows]);

  return (
    <details
      className="cma__standings"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && rows === null) load();
      }}
    >
      <summary>standings vs. Aryan</summary>
      {rows === null ? (
        <p className="cma__empty">loading…</p>
      ) : ranked.length === 0 ? (
        <p className="cma__empty">no finished games yet. beat me and you'll top the board.</p>
      ) : (
        <table className="cma__table">
          <thead>
            <tr><th>#</th><th>player</th><th>W</th><th>L</th><th>D</th><th>pts</th></tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.name + i}>
                <td>{i + 1}</td>
                <td className="cma__tname">{r.name}</td>
                <td className="cma__tw">{r.wins}</td>
                <td className="cma__tl">{r.losses}</td>
                <td className="cma__td">{r.draws}</td>
                <td className="cma__tp">{r.points % 1 ? r.points.toFixed(1) : r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="cma__note">points = win 1 · draw ½ · loss 0.</p>
    </details>
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
  const [passphrase, setPassphrase] = useState("");
  const [claimId, setClaimId] = useState("");
  const [claimPass, setClaimPass] = useState("");
  const website = useRef("");

  const [ownerKey, setOwnerKey] = useState("");
  const [ownerOn, setOwnerOn] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  // list collapse + resize
  const [collapsed, setCollapsed] = useState(false);
  const [listW, setListW] = useState(260);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_GAME_KEY);
      if (raw) setMy(JSON.parse(raw));
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

  // Self-heal a stale saved game: if localStorage points at a game that no
  // longer exists (e.g. the board was reset), confirm with the server and
  // clear it so the bar stops claiming "you're White in game #N".
  useEffect(() => {
    if (loading || !my || games.some((g) => g.id === my.id)) return;
    api.chessGet(my.id).then((res) => {
      if (res.status === 404) {
        setMy(null);
        try { localStorage.removeItem(MY_GAME_KEY); } catch { /* ignore */ }
      } else if (res.ok) {
        mergeGame(res.data.game);
      }
    });
  }, [loading, my, games, mergeGame]);

  useEffect(() => {
    if (selectedId !== null || games.length === 0) return;
    const mine = my && games.find((g) => g.id === my.id);
    const waiting = ownerOn && games.find((g) => g.status === "active" && g.turn === "b");
    setSelectedId((mine || waiting || games[0]).id);
  }, [games, my, ownerOn, selectedId]);

  const selected = games.find((g) => g.id === selectedId) || null;

  useEffect(() => {
    let tick = 0;
    const t = window.setInterval(() => {
      tick++;
      if (selected && selected.status === "active") refreshOne(selected.id);
      if (tick % 3 === 0) refreshList();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [selected, refreshOne, refreshList]);

  const isMine = !!(selected && my && selected.id === my.id);
  const role: Role =
    selected && selected.status === "active"
      ? isMine && selected.turn === "w" ? "w" : ownerOn && selected.turn === "b" ? "b" : null
      : null;

  const start = async () => {
    if (busy || my) return;
    setBusy(true);
    setNote(null);
    const clean = name.trim().slice(0, LIMITS.name);
    const res = await api.chessCreate(clean || "anon", passphrase.trim() || undefined, website.current);
    setBusy(false);
    if (!res.ok) { setNote(res.error || "Could not start a game."); return; }
    const mine = { id: res.data.game.id, token: res.data.token };
    setMy(mine);
    mergeGame(res.data.game);
    setSelectedId(res.data.game.id);
    try {
      localStorage.setItem(MY_GAME_KEY, JSON.stringify(mine));
    } catch { /* ignore */ }
    if (passphrase.trim())
      setNote(`Game #${res.data.game.id} created. Remember your passphrase to resume it from any device.`);
  };

  // Reclaim a game's token on this device via game # + passphrase.
  const claim = async () => {
    const id = Number(claimId.trim());
    const pass = claimPass.trim();
    if (!Number.isInteger(id) || id < 1 || !pass || busy) {
      setNote("Enter your game number and passphrase.");
      return;
    }
    setBusy(true);
    setNote(null);
    const res = await api.chessClaim(id, pass);
    setBusy(false);
    if (!res.ok) {
      setNote(res.error || "Could not resume that game.");
      return;
    }
    const mine = { id, token: res.data.token };
    setMy(mine);
    mergeGame({ ...(res.data.game as ChessGame), id });
    setSelectedId(id);
    setClaimId("");
    setClaimPass("");
    setNote(`Welcome back. You're playing game #${id} on this device now.`);
    try { localStorage.setItem(MY_GAME_KEY, JSON.stringify(mine)); } catch { /* ignore */ }
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
    setNote(role === "w" ? "Move sent. Aryan gets pinged and will reply." : null);
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

  // Drag the divider to resize the list; closure captures the start point.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = listW;
    const move = (ev: PointerEvent) => setListW(Math.max(170, Math.min(440, startW + ev.clientX - startX)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const waitingOnOwner = games.filter((g) => g.status === "active" && g.turn === "b").length;
  const turnTag = (g: ChessGame) =>
    g.status !== "active" ? g.status : g.turn === "w" ? `${g.visitorName}'s move` : "Aryan's move";
  const canMoveNow = role !== null;

  return (
    <div className="cma">
      <div className="cma__bar">
        {!my ? (
          <div className="cma__startwrap">
            <form className="cma__start" onSubmit={(e) => { e.preventDefault(); start(); }}>
              <input className="cma__input" value={name} maxLength={LIMITS.name} placeholder="your name" onChange={(e) => setName(e.target.value)} aria-label="Your name" />
              <input
                className="cma__input"
                type="password"
                value={passphrase}
                maxLength={64}
                placeholder="passphrase (optional)"
                onChange={(e) => setPassphrase(e.target.value)}
                aria-label="Optional passphrase to resume this game from another device"
                title="Optional. Set one and you can resume this game from any device with your game number and passphrase."
              />
              <input type="text" tabIndex={-1} autoComplete="off" className="cma__hp" onChange={(e) => (website.current = e.target.value)} aria-hidden="true" />
              <button className="cma__btn" disabled={busy}>{busy ? "starting…" : "challenge me"}</button>
            </form>
            <details className="cma__claim">
              <summary>resume a game from another device</summary>
              <form className="cma__ownerrow" onSubmit={(e) => { e.preventDefault(); claim(); }}>
                <input className="cma__input cma__input--id" inputMode="numeric" value={claimId} placeholder="game #" onChange={(e) => setClaimId(e.target.value)} aria-label="Game number" />
                <input className="cma__input" type="password" value={claimPass} maxLength={64} placeholder="passphrase" onChange={(e) => setClaimPass(e.target.value)} aria-label="Game passphrase" />
                <button className="cma__btn" disabled={busy}>resume</button>
              </form>
            </details>
          </div>
        ) : (
          <span className="cma__ident">
            you're <strong>White</strong> in game #{my.id}
            <button className="cma__ghost" onClick={() => setSelectedId(my.id)}>open</button>
          </span>
        )}
        {!ownerOn ? (
          <details className="cma__ownerbox">
            <summary>owner</summary>
            <div className="cma__ownerrow">
              <input className="cma__input" type={showKey ? "text" : "password"} value={keyInput} placeholder="moderation key" onChange={(e) => setKeyInput(e.target.value)} aria-label="Moderation key" />
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

      {note && <p className="cma__note">{note}</p>}

      <Standings />

      <div className={`cma__main${collapsed ? " collapsed" : ""}`} style={{ "--list-w": `${listW}px` } as React.CSSProperties}>
        <aside className="cma__list" aria-label="games" hidden={collapsed}>
          <div className="cma__listhead">
            <span>games <em>{games.length}</em></span>
            <button className="cma__collapse" onClick={() => setCollapsed(true)} aria-label="collapse list" title="collapse">«</button>
          </div>
          {loading && <p className="cma__empty">loading…</p>}
          {!loading && games.length === 0 && <p className="cma__empty">no games yet.</p>}
          <ul>
            {games.map((g) => {
              const mineTag = my?.id === g.id;
              const yourTurn = g.status === "active" && ((mineTag && g.turn === "w") || (ownerOn && g.turn === "b"));
              return (
                <li key={g.id}>
                  <button className={`cma__lrow${selectedId === g.id ? " on" : ""}${yourTurn ? " act" : ""}`} onClick={() => setSelectedId(g.id)}>
                    <span className={`cma__dotturn ${g.status !== "active" ? "done" : g.turn === "w" ? "w" : "b"}`} aria-hidden="true" />
                    <span className="cma__lmain">
                      <span className="cma__lname">{g.visitorName}{mineTag && <em> · you</em>}</span>
                      <span className="cma__lsub">{moveCount(g)} moves · last {lastSan(g.moves)} · {timeAgo(g.updatedAt)}</span>
                    </span>
                    <span className="cma__ltag">{yourTurn ? "your move" : turnTag(g)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {!collapsed && <div className="cma__resize" onPointerDown={startResize} role="separator" aria-label="resize game list" title="drag to resize" />}

        <div className="cma__detail">
          {collapsed && (
            <button className="cma__expand" onClick={() => setCollapsed(false)}>» games ({games.length})</button>
          )}
          {!selected ? (
            <p className="cma__empty">select a game, or challenge me to start one.</p>
          ) : (
            <>
              <div className="cma__dhead">
                <div>
                  <p className="cma__dtitle">#{selected.id} · {selected.visitorName} <span className="cma__vs">(White)</span> vs. Aryan <span className="cma__vs">(Black)</span></p>
                  <p className={`cma__dstat${canMoveNow ? " you" : ""}`}>
                    {selected.status !== "active" ? selected.status : canMoveNow ? "your move" : selected.turn === "w" ? `${selected.visitorName} to move` : "Aryan to move"}
                  </p>
                </div>
                {(isMine || ownerOn) && selected.status === "active" && (
                  <button className="cma__ghost" onClick={resign}>{isMine ? "resign" : "close"}</button>
                )}
              </div>

              <Board game={selected} role={role} onMove={doMove} busy={busy} />

              {selected.moves && (
                <ol className="cma__history">
                  {pairs(selected.moves).map((p) => (
                    <li key={p.n}><span className="cma__hn">{p.n}.</span><span className="cma__hw">{p.w}</span><span className="cma__hb">{p.b || ""}</span></li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .cma { display: flex; flex-direction: column; gap: var(--space-md); }
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
        .cma__startwrap { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .cma__start { flex-wrap: wrap; }
        .cma__claim summary { cursor: pointer; color: var(--color-text-tertiary); font-size: var(--text-xs); }
        .cma__claim summary:hover { color: var(--color-text-primary); }
        .cma__input--id { width: 76px; flex: 0 0 auto; }

        /* standings */
        .cma__standings { border: 1px solid var(--color-border-subtle); }
        .cma__standings summary { cursor: pointer; padding: 10px 16px; font-family: var(--font-mono); font-size: var(--text-xs);
          text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-secondary); }
        .cma__standings summary:hover { color: var(--color-text-primary); }
        .cma__standings[open] summary { border-bottom: 1px solid var(--color-border-subtle); }
        .cma__table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: var(--text-xs); }
        .cma__table th { text-align: left; padding: 8px 16px; color: var(--color-text-tertiary); font-weight: 400;
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--color-border-subtle); }
        .cma__table td { padding: 7px 16px; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border-subtle); }
        .cma__table tr:last-child td { border-bottom: none; }
        .cma__tname { color: var(--color-text-primary); }
        .cma__tw { color: var(--color-success); }
        .cma__tl { color: var(--color-error); }
        .cma__td { color: var(--color-text-tertiary); }
        .cma__tp { color: var(--color-accent-highlight); }
        .cma__standings .cma__note { padding: 8px 16px 12px; }

        /* master-detail */
        .cma__main { display: grid; grid-template-columns: 1fr; gap: var(--space-md); }
        @media (min-width: 780px) {
          .cma__main { grid-template-columns: var(--list-w, 260px) 8px 1fr; align-items: start; }
          .cma__main.collapsed { grid-template-columns: 1fr; }
        }
        .cma__main.collapsed .cma__list { display: none; }

        .cma__list { border: 1px solid var(--color-border); min-width: 0; }
        .cma__listhead { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px;
          border-bottom: 1px solid var(--color-border); font-family: var(--font-mono); font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.14em; color: var(--color-text-tertiary); }
        .cma__listhead em { color: var(--color-text-secondary); font-style: normal; }
        .cma__collapse { border: none; background: none; color: var(--color-text-tertiary); cursor: pointer; font-size: 14px; line-height: 1; }
        .cma__collapse:hover { color: var(--color-accent-highlight); }
        .cma__list ul { list-style: none; margin: 0; padding: 0; max-height: 520px; overflow-y: auto; }
        .cma__lrow { display: flex; gap: 10px; align-items: center; width: 100%; text-align: left; border: 0;
          background: transparent; cursor: pointer; padding: 10px 16px; border-bottom: 1px solid var(--color-border-subtle); font-family: var(--font-mono); }
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

        .cma__resize { display: none; }
        @media (min-width: 780px) {
          .cma__resize { display: block; align-self: stretch; width: 8px; cursor: col-resize;
            background: linear-gradient(var(--color-border), var(--color-border)) center / 1px 60% no-repeat; }
          .cma__resize:hover { background: linear-gradient(var(--color-accent-highlight), var(--color-accent-highlight)) center / 2px 80% no-repeat; }
        }

        .cma__detail { min-width: 0; }
        .cma__expand { margin-bottom: var(--space-md); border: 1px solid var(--color-border); background: transparent;
          color: var(--color-text-secondary); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-xs); padding: 6px 12px; }
        .cma__expand:hover { border-color: var(--color-accent-highlight); color: var(--color-text-primary); }
        .cma__dhead { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md);
          max-width: 620px; margin: 0 auto var(--space-md); }
        .cma__dtitle { margin: 0; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-primary); }
        .cma__vs { color: var(--color-text-tertiary); }
        .cma__dstat { margin: 3px 0 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
        .cma__dstat.you { color: var(--color-accent-highlight); }
        .cma__note { max-width: 620px; margin: var(--space-sm) auto 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }

        .cma__boardwrap { position: relative; }
        .cma__promo { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 0 var(--space-sm);
          font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }
        .cma__promo button { border: 1px solid var(--color-border); background: var(--color-bg-secondary);
          color: var(--color-text-primary); cursor: pointer; font-size: 22px; line-height: 1; width: 38px; height: 38px; }
        .cma__promo button:hover { border-color: var(--color-accent-highlight); }
        .cma__promo button.x { font-size: 16px; color: var(--color-text-tertiary); }

        .cma__bgrid { display: grid; grid-template-columns: 14px 1fr; grid-template-rows: 1fr 14px; gap: 3px; max-width: 620px; margin: 0 auto; }
        .cma__ranks { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; justify-content: space-around;
          font-family: var(--font-mono); font-size: 9px; color: var(--color-text-tertiary); }
        .cma__files { grid-column: 2; grid-row: 2; display: flex; justify-content: space-around;
          font-family: var(--font-mono); font-size: 9px; color: var(--color-text-tertiary); }
        .cma__board { grid-column: 2; grid-row: 1; display: grid; grid-template-columns: repeat(8, 1fr);
          aspect-ratio: 1; width: 100%; border: 1px solid var(--color-border); }
        .cma__board.busy { opacity: 0.85; }
        .cma__sq { position: relative; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center;
          aspect-ratio: 1; font-size: clamp(24px, 6vw, 46px); line-height: 1; background: #cbc9c4; }
        .cma__sq.dark { background: #6d6b67; }
        .cma__sq:disabled { cursor: default; }
        .cma__sq.last { box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-accent-highlight) 60%, transparent); }
        .cma__sq.sel { box-shadow: inset 0 0 0 3px var(--color-accent-highlight); }
        /* Outline glyph for White, filled for Black — distinct by shape, plus explicit colour + stroke. */
        .cma__pc { pointer-events: none; font-family: "Segoe UI Symbol", "Noto Sans Symbols2", "Arial Unicode MS", sans-serif; }
        .cma__pc.wp { color: #ffffff; -webkit-text-stroke: 1.1px #15151b; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
        .cma__pc.bp { color: #101016; -webkit-text-stroke: 1.1px #eef0f6; }
        .cma__dot { position: absolute; width: 22%; height: 22%; border-radius: 50%;
          background: color-mix(in srgb, var(--color-accent-primary) 82%, transparent); pointer-events: none; }
        .cma__dot.cap { width: 84%; height: 84%; border-radius: 0; background: none;
          box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 82%, transparent); }

        .cma__history { list-style: none; max-width: 620px; margin: var(--space-md) auto 0; padding: var(--space-sm) 0 0;
          border-top: 1px solid var(--color-border-subtle); display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 2px 12px;
          max-height: 160px; overflow-y: auto; font-family: var(--font-mono); font-size: var(--text-xs); }
        .cma__history li { display: grid; grid-template-columns: 26px 1fr 1fr; gap: 6px; }
        .cma__hn { color: var(--color-text-tertiary); }
        .cma__hw { color: var(--color-text-primary); }
        .cma__hb { color: var(--color-accent-highlight); }
        .cma__empty { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); padding: var(--space-md) 0; }
        .cma__list .cma__empty, .cma__standings .cma__empty { padding: var(--space-md) 16px; margin: 0; }
      `}</style>
    </div>
  );
}
