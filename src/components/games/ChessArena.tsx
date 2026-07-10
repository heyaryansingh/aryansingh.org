/**
 * ChessArena — correspondence chess against the site owner.
 *
 * Visitors start a game and play White; every move is stored in D1 and shows
 * up in Aryan's queue — he replies as Black from the same page (owner mode,
 * unlocked with the moderation key). No engine anywhere: both sides are human.
 * Below the board, an arena lists every game with its live position so anyone
 * can watch. Legality is enforced client-side by chess.js for a nice UX and
 * re-validated server-side, so the board can't be corrupted.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { api, timeAgo, type ChessGame, LIMITS } from "../../lib/interactive";

const GLYPH: Record<string, string> = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
const FILES = "abcdefgh";
const MY_GAME_KEY = "chess-my-game"; // {id, token}
const OWNER_KEY = "chess-owner-key";
const NAME_KEY = "playground-name";
const POLL_MS = 10_000;

/** Parse just the piece-placement field of a FEN into an 8x8 grid. */
function fenGrid(fen: string): ({ type: string; color: "w" | "b" } | null)[][] {
  return fen
    .split(" ")[0]
    .split("/")
    .map((rank) => {
      const row: ({ type: string; color: "w" | "b" } | null)[] = [];
      for (const ch of rank) {
        if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) row.push(null);
        else row.push({ type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? "w" : "b" });
      }
      return row;
    });
}

function MiniBoard({ fen }: { fen: string }) {
  const grid = useMemo(() => fenGrid(fen), [fen]);
  return (
    <div className="cma__mini" aria-hidden="true">
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <span key={`${r}${c}`} className={`cma__msq${(r + c) % 2 ? " d" : ""}`}>
            {cell && <i className={cell.color === "w" ? "w" : "b"}>{GLYPH[cell.type]}</i>}
          </span>
        )),
      )}
    </div>
  );
}

/** Full interactive board. `playAs` enables moving that colour's pieces (null = spectate). */
function Board({
  game,
  playAs,
  onMove,
  busy,
}: {
  game: ChessGame;
  playAs: "w" | "b" | null;
  onMove: (from: string, to: string, promotion?: string) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legal, setLegal] = useState<Set<string>>(new Set());
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const chess = useMemo(() => new Chess(game.fen), [game.fen]);
  const grid = chess.board();
  const flip = playAs === "b";
  const canPlay = playAs !== null && game.status === "active" && game.turn === playAs && !busy;

  useEffect(() => {
    setSelected(null);
    setLegal(new Set());
    setPromo(null);
  }, [game.fen]);

  const click = (sq: string) => {
    if (!canPlay) return;
    if (selected && legal.has(sq)) {
      // Pawn reaching the last rank: let the player pick the piece instead of
      // silently auto-queening (underpromotion matters in real endgames).
      const needsPromo = chess
        .moves({ square: selected as Square, verbose: true })
        .some((m) => m.to === sq && m.promotion);
      if (needsPromo) {
        setPromo({ from: selected, to: sq });
      } else {
        onMove(selected, sq);
      }
      setSelected(null);
      setLegal(new Set());
      return;
    }
    setPromo(null);
    const p = chess.get(sq as Square);
    if (p && p.color === playAs) {
      setSelected(sq);
      setLegal(new Set(chess.moves({ square: sq as Square, verbose: true }).map((m) => m.to)));
    } else {
      setSelected(null);
      setLegal(new Set());
    }
  };

  const rows = flip ? [...grid].reverse().map((row) => [...row].reverse()) : grid;
  return (
    <div className="cma__boardwrap">
      {promo && (
        <div className="cma__promo" role="group" aria-label="choose promotion piece">
          <span>promote to</span>
          {(["q", "r", "b", "n"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                onMove(promo.from, promo.to, p);
                setPromo(null);
              }}
              aria-label={`promote to ${p}`}
            >
              {GLYPH[p]}
            </button>
          ))}
          <button className="x" onClick={() => setPromo(null)} aria-label="cancel promotion">
            ×
          </button>
        </div>
      )}
      <div className={`cma__board${busy ? " busy" : ""}`} role="grid" aria-label="chess board">
        {rows.map((row, ri) =>
          row.map((cell, ci) => {
            const r = flip ? 7 - ri : ri;
            const c = flip ? 7 - ci : ci;
            const sq = `${FILES[c]}${8 - r}`;
            const dark = (r + c) % 2 === 1;
            return (
              <button
                key={sq}
                className={`cma__sq${dark ? " dark" : ""}${selected === sq ? " sel" : ""}`}
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
    </div>
  );
}

export default function ChessArena() {
  const [my, setMy] = useState<{ id: number; token: string } | null>(null);
  const [myGame, setMyGame] = useState<ChessGame | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [games, setGames] = useState<ChessGame[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [watchGame, setWatchGame] = useState<ChessGame | null>(null);

  const [ownerKey, setOwnerKey] = useState("");
  const [ownerOn, setOwnerOn] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const website = useRef("");

  // ---- bootstrap ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_GAME_KEY);
      if (raw) setMy(JSON.parse(raw));
      const n = localStorage.getItem(NAME_KEY);
      if (n) setName(n);
      const k = localStorage.getItem(OWNER_KEY);
      if (k) {
        setOwnerKey(k);
        setOwnerOn(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refreshArena = useCallback(async () => {
    const res = await api.chessList();
    if (res.ok) setGames(res.data.games || []);
  }, []);

  const refreshMyGame = useCallback(async () => {
    if (!my) return;
    const res = await api.chessGet(my.id);
    if (res.ok) setMyGame(res.data.game);
    else if (res.status === 404) {
      setMy(null);
      setMyGame(null);
      try {
        localStorage.removeItem(MY_GAME_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [my]);

  useEffect(() => {
    refreshArena();
  }, [refreshArena]);
  useEffect(() => {
    refreshMyGame();
  }, [refreshMyGame]);

  // Poll while anything is waiting on the other side.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (myGame && myGame.status === "active" && myGame.turn === "b") refreshMyGame();
      if (watchId) api.chessGet(watchId).then((r) => r.ok && setWatchGame(r.data.game));
      if (ownerOn) refreshArena();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [myGame, watchId, ownerOn, refreshMyGame, refreshArena]);

  // ---- visitor actions ----
  const start = async () => {
    if (busy || my) return; // never create over an existing game — its token would be lost
    setBusy(true);
    setNote(null);
    const clean = name.trim().slice(0, LIMITS.name);
    const res = await api.chessCreate(clean || "anon", website.current);
    setBusy(false);
    if (!res.ok) {
      setNote(res.error || "Could not start a game.");
      return;
    }
    const mine = { id: res.data.game.id, token: res.data.token };
    setMy(mine);
    setMyGame(res.data.game);
    try {
      localStorage.setItem(MY_GAME_KEY, JSON.stringify(mine));
      if (clean) localStorage.setItem(NAME_KEY, clean);
    } catch {
      /* ignore */
    }
    refreshArena();
  };

  const moveMine = async (from: string, to: string, promotion?: string) => {
    if (!my || busy) return;
    setBusy(true);
    setNote(null);
    const res = await api.chessMove({ id: my.id, token: my.token, from, to, promotion });
    setBusy(false);
    if (!res.ok) {
      setNote(res.error || "Move rejected.");
      refreshMyGame();
      return;
    }
    setMyGame((g) => (g ? { ...g, ...res.data.game } : g));
    setNote("Move sent — Aryan gets pinged and will reply. Leave the tab open or check back.");
    refreshArena();
  };

  // Resign server-side too, so the game doesn't sit in the arena (and in
  // Aryan's queue) as a zombie nobody can ever finish.
  const abandon = async () => {
    if (my && myGame?.status === "active") await api.chessResign({ id: my.id, token: my.token });
    setMy(null);
    setMyGame(null);
    setNote(null);
    try {
      localStorage.removeItem(MY_GAME_KEY);
    } catch {
      /* ignore */
    }
    refreshArena();
  };

  // ---- owner actions ----
  const unlock = async () => {
    const k = keyInput.trim();
    if (!k || busy) return;
    setBusy(true);
    const res = await api.chessVerifyKey(k);
    setBusy(false);
    if (!res.ok) {
      setNote("Wrong key.");
      return;
    }
    setNote(null);
    setOwnerKey(k);
    setOwnerOn(true);
    setKeyInput("");
    try {
      localStorage.setItem(OWNER_KEY, k);
    } catch {
      /* ignore */
    }
  };
  const lock = () => {
    setOwnerOn(false);
    setOwnerKey("");
    try {
      localStorage.removeItem(OWNER_KEY);
    } catch {
      /* ignore */
    }
  };

  const ownerMove = async (id: number, from: string, to: string, promotion?: string) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const res = await api.chessOwnerMove({ id, key: ownerKey, from, to, promotion });
    setBusy(false);
    if (!res.ok) {
      setNote(res.error === "Unauthorized." ? "Wrong key — owner mode locked." : res.error || "Move rejected.");
      if (res.status === 401) lock();
      return;
    }
    refreshArena();
    if (watchId === id) api.chessGet(id).then((r) => r.ok && setWatchGame(r.data.game));
    if (my?.id === id) refreshMyGame();
  };

  const ownerClose = async (id: number) => {
    if (busy) return;
    setBusy(true);
    const res = await api.chessResign({ id, key: ownerKey });
    setBusy(false);
    if (!res.ok) setNote(res.error || "Could not close the game.");
    refreshArena();
  };

  const pendingForOwner = games.filter((g) => g.status === "active" && g.turn === "b");
  const shown = watchGame && watchId ? watchGame : null;
  const moveCount = (g: ChessGame) => (g.moves ? g.moves.split(" ").length : 0);

  const statusLine = (g: ChessGame) =>
    g.status !== "active" ? g.status : g.turn === "w" ? `${g.visitorName} to move` : "waiting on Aryan";

  return (
    <div className="cma">
      {/* ---- my game ---- */}
      {my && !myGame ? (
        <p className="cma__note">loading your game…</p>
      ) : !my ? (
        <form
          className="cma__start"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <p className="cma__lede">
            You play White. Each move is saved and I get notified — I'll answer as Black from
            wherever I am. Games take hours or days, like postal chess. Leave a name so I know
            who I'm playing.
          </p>
          <div className="cma__row">
            <input
              className="cma__input"
              value={name}
              maxLength={LIMITS.name}
              placeholder="your name"
              onChange={(e) => setName(e.target.value)}
              aria-label="Your name"
            />
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              className="cma__hp"
              onChange={(e) => (website.current = e.target.value)}
              aria-hidden="true"
            />
            <button className="cma__btn" disabled={busy}>
              {busy ? "starting…" : "challenge me"}
            </button>
          </div>
        </form>
      ) : (
        <div className="cma__mine">
          <div className="cma__meta">
            <span>
              {myGame.visitorName} (White) vs. Aryan —{" "}
              <strong>
                {myGame.status !== "active"
                  ? myGame.status
                  : myGame.turn === "w"
                    ? "your move"
                    : "waiting on Aryan"}
              </strong>
            </span>
            <button className="cma__ghost" onClick={abandon}>
              leave game
            </button>
          </div>
          <Board game={myGame} playAs="w" onMove={moveMine} busy={busy} />
          {myGame.moves && <p className="cma__moves">{myGame.moves}</p>}
        </div>
      )}
      {note && <p className="cma__note">{note}</p>}

      {/* ---- owner mode ---- */}
      <details className="cma__owner">
        <summary>owner mode</summary>
        {!ownerOn ? (
          <div className="cma__row">
            <input
              className="cma__input"
              type="password"
              value={keyInput}
              placeholder="moderation key"
              onChange={(e) => setKeyInput(e.target.value)}
              aria-label="Moderation key"
            />
            <button className="cma__btn" type="button" onClick={unlock}>
              unlock
            </button>
          </div>
        ) : (
          <div className="cma__queue">
            <div className="cma__meta">
              <span>
                {pendingForOwner.length} game{pendingForOwner.length === 1 ? "" : "s"} waiting on you
              </span>
              <button className="cma__ghost" onClick={lock}>
                lock
              </button>
            </div>
            {pendingForOwner.map((g) => (
              <div key={g.id} className="cma__qgame">
                <div className="cma__meta">
                  <span>
                    #{g.id} vs. {g.visitorName} — {moveCount(g)} moves, {timeAgo(g.updatedAt)}
                  </span>
                  <button className="cma__ghost" onClick={() => ownerClose(g.id)}>
                    close game
                  </button>
                </div>
                <Board game={g} playAs="b" onMove={(f, t, p) => ownerMove(g.id, f, t, p)} busy={busy} />
              </div>
            ))}
          </div>
        )}
      </details>

      {/* ---- arena ---- */}
      <div className="cma__arena">
        <div className="cma__meta">
          <span>arena — every game, live</span>
          <button className="cma__ghost" onClick={refreshArena}>
            refresh
          </button>
        </div>
        {games.length === 0 && <p className="cma__empty">no games yet — start the first one.</p>}
        <div className="cma__grid">
          {games.map((g) => (
            <button
              key={g.id}
              className={`cma__card${watchId === g.id ? " on" : ""}`}
              onClick={() => {
                if (watchId === g.id) {
                  setWatchId(null);
                  setWatchGame(null);
                } else {
                  setWatchId(g.id);
                  setWatchGame(g);
                }
              }}
            >
              <MiniBoard fen={g.fen} />
              <span className="cma__cname">
                {g.visitorName} · {moveCount(g)} moves
              </span>
              <span className="cma__cstat">
                {statusLine(g)} · {timeAgo(g.updatedAt)}
              </span>
            </button>
          ))}
        </div>
        {shown && (
          <div className="cma__watch">
            <p className="cma__qhead">
              watching #{shown.id} — {shown.visitorName} (White) vs. Aryan · {statusLine(shown)}
            </p>
            <Board game={shown} playAs={null} onMove={() => {}} busy={false} />
            {shown.moves && <p className="cma__moves">{shown.moves}</p>}
          </div>
        )}
      </div>

      <style>{`
        .cma { display: flex; flex-direction: column; gap: var(--space-xl); }
        .cma__lede { margin: 0 0 var(--space-md); font-size: var(--text-sm); color: var(--color-text-secondary);
          line-height: 1.7; max-width: 58ch; }
        .cma__row { display: flex; gap: 8px; max-width: 420px; }
        .cma__input { flex: 1; min-width: 0; background: transparent; color: var(--color-text-primary);
          border: 1px solid var(--color-border); padding: 8px 11px; font-family: var(--font-mono); font-size: var(--text-sm); }
        .cma__input:focus-visible { outline: 1px solid var(--color-accent-primary); outline-offset: 0; }
        .cma__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .cma__btn { padding: 8px 18px; border: 1px solid var(--color-text-primary); background: transparent;
          color: var(--color-text-primary); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-sm); }
        .cma__btn:hover { border-color: var(--color-accent-highlight); color: var(--color-accent-highlight); }
        .cma__btn:disabled { opacity: 0.5; cursor: default; }
        .cma__ghost { border: none; background: none; color: var(--color-text-tertiary); cursor: pointer;
          font-family: var(--font-mono); font-size: var(--text-xs); text-decoration: underline; text-underline-offset: 3px; }
        .cma__ghost:hover { color: var(--color-text-primary); }
        .cma__meta { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-md);
          font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary);
          margin-bottom: var(--space-sm); }
        .cma__meta strong { color: var(--color-accent-highlight); font-weight: 500; }
        .cma__note { margin: 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-secondary); }

        .cma__boardwrap { position: relative; }
        .cma__promo { display: flex; align-items: center; justify-content: center; gap: 8px;
          margin: 0 auto var(--space-sm); max-width: 520px; font-family: var(--font-mono);
          font-size: var(--text-xs); color: var(--color-text-secondary); }
        .cma__promo button { border: 1px solid var(--color-border); background: var(--color-bg-secondary);
          color: var(--color-text-primary); cursor: pointer; font-size: 22px; line-height: 1;
          width: 38px; height: 38px; }
        .cma__promo button:hover { border-color: var(--color-accent-highlight); }
        .cma__promo button.x { font-size: 16px; color: var(--color-text-tertiary); }
        .cma__board { display: grid; grid-template-columns: repeat(8, 1fr); aspect-ratio: 1; width: 100%;
          max-width: 520px; margin: 0 auto; border: 1px solid var(--color-border); }
        .cma__board.busy { opacity: 0.8; }
        .cma__sq { position: relative; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center;
          aspect-ratio: 1; font-size: clamp(22px, 7.2vw, 42px); line-height: 1; background: var(--color-bg-secondary); }
        .cma__sq.dark { background: color-mix(in srgb, var(--color-accent-primary) 20%, var(--color-bg-secondary)); }
        .cma__sq:disabled { cursor: default; }
        .cma__sq.sel { box-shadow: inset 0 0 0 2px var(--color-accent-highlight); }
        .cma__pc { pointer-events: none; }
        .cma__pc.wp { color: #f2f2f5; text-shadow: 0 1px 1px rgba(0,0,0,0.6); }
        .cma__pc.bp { color: #121216; text-shadow: 0 1px 0 rgba(255,255,255,0.25); }
        .cma__dot { position: absolute; width: 22%; height: 22%; border-radius: 50%;
          background: color-mix(in srgb, var(--color-accent-highlight) 60%, transparent); pointer-events: none; }
        .cma__dot.cap { width: 86%; height: 86%; border-radius: 0; background: none;
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-accent-highlight) 60%, transparent); }
        .cma__moves { margin: var(--space-sm) auto 0; max-width: 520px; font-family: var(--font-mono);
          font-size: var(--text-xs); color: var(--color-text-tertiary); line-height: 1.8; word-spacing: 0.4em; }

        .cma__owner { border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-md); }
        .cma__owner summary { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary);
          cursor: pointer; width: max-content; }
        .cma__owner[open] summary { margin-bottom: var(--space-md); }
        .cma__queue { display: flex; flex-direction: column; gap: var(--space-lg); }
        .cma__qgame { border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-md); }
        .cma__qhead { margin: 0 0 var(--space-sm); font-family: var(--font-mono); font-size: var(--text-xs);
          color: var(--color-text-secondary); }

        .cma__arena { border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-md); }
        .cma__empty { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .cma__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: var(--space-md); }
        .cma__card { display: flex; flex-direction: column; gap: 4px; padding: 0; border: none; background: none;
          cursor: pointer; text-align: left; }
        .cma__card.on .cma__mini { outline: 1px solid var(--color-accent-highlight); }
        .cma__mini { display: grid; grid-template-columns: repeat(8, 1fr); aspect-ratio: 1; width: 100%;
          border: 1px solid var(--color-border-subtle); }
        .cma__msq { display: grid; place-items: center; aspect-ratio: 1; font-size: 11px; line-height: 1;
          background: var(--color-bg-secondary); }
        .cma__msq.d { background: color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-bg-secondary)); }
        .cma__msq i { font-style: normal; }
        .cma__msq i.w { color: #f2f2f5; }
        .cma__msq i.b { color: #121216; }
        .cma__cname { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-primary); }
        .cma__cstat { font-family: var(--font-mono); font-size: 10px; color: var(--color-text-tertiary); }
        .cma__watch { margin-top: var(--space-lg); border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-md); }
      `}</style>
    </div>
  );
}
