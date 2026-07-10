/**
 * QuantumSnake — a compact snake game on a canvas. Collect qubits (⚛), grow,
 * don't hit the walls or yourself. Arrow keys / WASD, or the on-screen pad.
 * Client-only; colors read from the site's CSS variables so it respects theme.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const GRID = 17;
const CELL = 20; // px, canvas is GRID*CELL square (scaled by CSS)
const START_MS = 150;

type Pt = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
const DELTA: Record<Dir, Pt> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function QuantumSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snake = useRef<Pt[]>([{ x: 8, y: 8 }]);
  const dir = useRef<Dir>("right");
  const queued = useRef<Dir | null>(null);
  const food = useRef<Pt>({ x: 12, y: 8 });
  const timer = useRef<number | null>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");

  const placeFood = useCallback(() => {
    let p: Pt;
    do {
      p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.current.some((s) => s.x === p.x && s.y === p.y));
    food.current = p;
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const bg = cssVar("--color-bg-tertiary", "#1A1A1E");
    const accent = cssVar("--color-accent-primary", "#4A5FBD");
    const hi = cssVar("--color-accent-highlight", "#7B8FE8");
    const grid = cssVar("--color-border-subtle", "#1E1E22");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, GRID * CELL);
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(GRID * CELL, i * CELL);
      ctx.stroke();
    }
    // food
    ctx.font = `${CELL - 4}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚛", food.current.x * CELL + CELL / 2, food.current.y * CELL + CELL / 2 + 1);
    // snake
    snake.current.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? hi : accent;
      const pad = 2;
      ctx.fillRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    });
  }, []);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (queued.current && queued.current !== OPPOSITE[dir.current]) dir.current = queued.current;
    queued.current = null;
    const head = snake.current[0];
    const d = DELTA[dir.current];
    const next: Pt = { x: head.x + d.x, y: head.y + d.y };

    const hitWall = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID;
    const hitSelf = snake.current.some((s) => s.x === next.x && s.y === next.y);
    if (hitWall || hitSelf) {
      stop();
      setState("over");
      setBest((b) => Math.max(b, snake.current.length - 1));
      return;
    }

    const grew = next.x === food.current.x && next.y === food.current.y;
    const body = [next, ...snake.current];
    if (!grew) body.pop();
    snake.current = body;
    if (grew) {
      setScore(body.length - 1);
      placeFood();
    }
    draw();
  }, [draw, placeFood, stop]);

  const run = useCallback(() => {
    stop();
    // speed up slightly as the snake grows
    const ms = Math.max(70, START_MS - (snake.current.length - 1) * 4);
    timer.current = window.setInterval(tick, ms);
  }, [stop, tick]);

  // re-arm interval when score changes (to apply new speed)
  useEffect(() => {
    if (state === "playing") run();
    return stop;
  }, [state, score, run, stop]);

  const start = useCallback(() => {
    snake.current = [{ x: 8, y: 8 }];
    dir.current = "right";
    queued.current = null;
    placeFood();
    setScore(0);
    setState("playing");
    draw();
  }, [draw, placeFood]);

  const steer = useCallback(
    (d: Dir) => {
      if (state !== "playing") return;
      queued.current = d;
    },
    [state],
  );

  useEffect(() => {
    draw();
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const nd = map[e.key];
      if (nd) {
        e.preventDefault();
        if (state === "idle" || state === "over") start();
        steer(nd);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw, start, steer, state]);

  return (
    <div className="qs">
      <div className="qs__hud">
        <span>qubits: <strong>{score}</strong></span>
        <span>best: <strong>{best}</strong></span>
      </div>
      <div className="qs__stage">
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="qs__canvas" />
        {state !== "playing" && (
          <div className="qs__overlay">
            {state === "over" && <p className="qs__msg">collapsed at {score} qubits</p>}
            <button className="qs__btn" onClick={start}>{state === "over" ? "Retry" : "Start"}</button>
            <p className="qs__hint">arrow keys / WASD</p>
          </div>
        )}
      </div>
      <div className="qs__pad" aria-hidden={state !== "playing"}>
        <button onClick={() => steer("up")} aria-label="up">▲</button>
        <div>
          <button onClick={() => steer("left")} aria-label="left">◀</button>
          <button onClick={() => steer("down")} aria-label="down">▼</button>
          <button onClick={() => steer("right")} aria-label="right">▶</button>
        </div>
      </div>
      <style>{`
        .qs { display: flex; flex-direction: column; gap: var(--space-sm); align-items: center; }
        .qs__hud { display: flex; gap: var(--space-lg); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
        .qs__hud strong { color: var(--color-accent-highlight); }
        .qs__stage { position: relative; width: 100%; max-width: 360px; aspect-ratio: 1; }
        .qs__canvas { width: 100%; height: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md); image-rendering: pixelated; }
        .qs__overlay { position: absolute; inset: 0; display: grid; place-content: center; gap: var(--space-sm);
          background: color-mix(in srgb, var(--color-bg-primary) 72%, transparent); border-radius: var(--radius-md); text-align: center; }
        .qs__msg { margin: 0; font-size: var(--text-sm); color: var(--color-text-secondary); }
        .qs__btn { padding: 10px 24px; border-radius: var(--radius-md); border: 1px solid var(--color-accent-primary);
          background: var(--color-accent-primary); color: #fff; cursor: pointer; font-size: var(--text-sm); }
        .qs__hint { margin: 0; font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .qs__pad { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .qs__pad div { display: flex; gap: 4px; }
        .qs__pad button { width: 44px; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--color-border);
          background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; font-size: 0.9rem; }
        .qs__pad button:active { background: var(--color-accent-primary); color: #fff; }
        @media (min-width: 768px) and (pointer: fine) { .qs__pad { display: none; } }
      `}</style>
    </div>
  );
}
