/**
 * QubitFlip — a 2048-style merge game. Combine matching tiles to reach 2048.
 * Arrow keys / WASD on desktop, swipe on touch. Client-only.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Board = number[][];
const SIZE = 4;

const empty = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

/** Slide + merge one row to the LEFT. Pure — the core rule, unit-checked below. */
function slideLine(line: number[]): { line: number[]; gained: number } {
  const nums = line.filter((n) => n !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const merged = nums[i] * 2;
      out.push(merged);
      gained += merged;
      i++; // consume the pair
    } else {
      out.push(nums[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { line: out, gained };
}

type Dir = "left" | "right" | "up" | "down";

function transpose(b: Board): Board {
  return b[0].map((_, c) => b.map((row) => row[c]));
}

function move(board: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  let work = board.map((r) => [...r]);
  if (dir === "up" || dir === "down") work = transpose(work);
  if (dir === "right" || dir === "down") work = work.map((r) => [...r].reverse());

  let gained = 0;
  const slid = work.map((row) => {
    const r = slideLine(row);
    gained += r.gained;
    return r.line;
  });

  let result = slid;
  if (dir === "right" || dir === "down") result = result.map((r) => [...r].reverse());
  if (dir === "up" || dir === "down") result = transpose(result);

  const moved = JSON.stringify(result) !== JSON.stringify(board);
  return { board: result, gained, moved };
}

function spawn(board: Board): Board {
  const cells: [number, number][] = [];
  board.forEach((row, r) => row.forEach((v, c) => v === 0 && cells.push([r, c])));
  if (cells.length === 0) return board;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const b = board.map((row) => [...row]);
  b[r][c] = Math.random() < 0.9 ? 2 : 4;
  return b;
}

function hasMoves(board: Board): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
  return false;
}

// Dev-only self-check for the merge rule.
if (import.meta.env.DEV) {
  console.assert(JSON.stringify(slideLine([2, 2, 4, 0]).line) === JSON.stringify([4, 4, 0, 0]), "QubitFlip merge 1");
  console.assert(slideLine([2, 2, 2, 2]).gained === 8, "QubitFlip merge 2");
  console.assert(JSON.stringify(slideLine([0, 0, 2, 2]).line) === JSON.stringify([4, 0, 0, 0]), "QubitFlip merge 3");
}

const TILE_LABEL: Record<number, string> = { 2: "2", 4: "4", 8: "8" };

export default function QubitFlip() {
  const [board, setBoard] = useState<Board>(() => spawn(spawn(empty())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const doMove = useCallback(
    (dir: Dir) => {
      if (over) return;
      setBoard((prev) => {
        const { board: next, gained, moved } = move(prev, dir);
        if (!moved) return prev;
        const withNew = spawn(next);
        if (gained) setScore((s) => s + gained);
        if (!won && withNew.some((row) => row.includes(2048))) setWon(true);
        if (!hasMoves(withNew)) setOver(true);
        return withNew;
      });
    },
    [over, won],
  );

  useEffect(() => setBest((b) => Math.max(b, score)), [score]);

  const reset = () => {
    setBoard(spawn(spawn(empty())));
    setScore(0);
    setOver(false);
    setWon(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
    touch.current = null;
  };

  return (
    <div className="qf">
      <div className="qf__hud">
        <span>score <strong>{score}</strong></span>
        <span>best <strong>{best}</strong></span>
        <button className="qf__reset" onClick={reset}>reset</button>
      </div>
      <div className="qf__board" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {board.flat().map((v, i) => (
          <div key={i} className="qf__cell" data-v={v}>
            {v > 0 && <span>{TILE_LABEL[v] ?? v}</span>}
          </div>
        ))}
        {(over || won) && (
          <div className="qf__overlay">
            <p className="qf__msg">{won ? "⚛ 2048! superposition achieved" : "no moves left"}</p>
            <button className="qf__btn" onClick={reset}>{won ? "Keep going" : "Try again"}</button>
          </div>
        )}
      </div>
      <p className="qf__hint">arrow keys / WASD · swipe on mobile</p>
      <style>{`
        .qf { display: flex; flex-direction: column; gap: var(--space-sm); align-items: center; }
        .qf__hud { display: flex; align-items: center; gap: var(--space-md); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
        .qf__hud strong { color: var(--color-accent-highlight); }
        .qf__reset { padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);
          background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-xs); }
        .qf__board { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
          width: 100%; max-width: 340px; aspect-ratio: 1; padding: 8px; background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border); border-radius: var(--radius-md); touch-action: none; }
        .qf__cell { display: grid; place-items: center; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--color-bg-primary) 60%, transparent);
          font-family: var(--font-mono); font-weight: 600; font-size: clamp(0.9rem, 3.5vw, 1.35rem); color: #fff; }
        .qf__cell span { animation: qf-pop 0.14s ease; }
        @keyframes qf-pop { from { transform: scale(0.6); } }
        .qf__cell[data-v="0"] { color: transparent; }
        .qf__cell[data-v="2"] { background: #2f3350; color: var(--color-text-primary); }
        .qf__cell[data-v="4"] { background: #3a3f66; color: var(--color-text-primary); }
        .qf__cell[data-v="8"] { background: #4A5FBD; }
        .qf__cell[data-v="16"] { background: #5a6fd0; }
        .qf__cell[data-v="32"] { background: #6B7FD4; }
        .qf__cell[data-v="64"] { background: #7B8FE8; }
        .qf__cell[data-v="128"] { background: #8f7be8; }
        .qf__cell[data-v="256"] { background: #a06be0; }
        .qf__cell[data-v="512"] { background: #b45cd0; }
        .qf__cell[data-v="1024"] { background: #d4a84a; }
        .qf__cell[data-v="2048"] { background: #4A9F6E; box-shadow: 0 0 16px #4A9F6E; }
        .qf__overlay { position: absolute; inset: 0; display: grid; place-content: center; gap: var(--space-sm);
          background: color-mix(in srgb, var(--color-bg-primary) 78%, transparent); border-radius: var(--radius-md); text-align: center; }
        .qf__msg { margin: 0; font-size: var(--text-sm); color: var(--color-text-primary); }
        .qf__btn { padding: 9px 20px; border-radius: var(--radius-md); border: 1px solid var(--color-accent-primary);
          background: var(--color-accent-primary); color: #fff; cursor: pointer; font-size: var(--text-sm); }
        .qf__hint { margin: 0; font-size: var(--text-xs); color: var(--color-text-tertiary); }
      `}</style>
    </div>
  );
}
