/**
 * FlappyBird — a minimal canvas clone. Flap with click / tap / Space.
 * No sprites: the bird is a square, pipes are hairline rectangles, all
 * colours read from the site tokens. Reports to the shared leaderboard.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import ScoreBoard from "../interactive/ScoreBoard";

const W = 320;
const H = 460;
const GRAV = 0.5;
const FLAP = -7.6;
const PIPE_W = 54;
const GAP = 140;
const SPEED = 2.3;
const SPAWN = 210; // px between pipe pairs
const BIRD_X = 78;
const BIRD = 18;

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

type Pipe = { x: number; gapY: number; passed: boolean };

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);
  const y = useRef(H / 2);
  const vy = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const dist = useRef(0);
  const scoreRef = useRef(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "over">("idle");
  const stateRef = useRef(state);
  stateRef.current = state;

  const reset = useCallback(() => {
    y.current = H / 2;
    vy.current = 0;
    pipes.current = [{ x: W + 60, gapY: H / 2, passed: false }];
    dist.current = 0;
    scoreRef.current = 0;
    setScore(0);
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!ctx) return;
    const bg = cssVar("--color-bg-tertiary", "#1A1A1E");
    const line = cssVar("--color-border", "#2A2A30");
    const accent = cssVar("--color-accent-primary", "#4A5FBD");
    const hi = cssVar("--color-accent-highlight", "#7B8FE8");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // pipes: filled with the void, hairline edges + a bright lip at the gap
    for (const p of pipes.current) {
      ctx.fillStyle = cssVar("--color-bg-secondary", "#111114");
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      const topH = p.gapY - GAP / 2;
      const botY = p.gapY + GAP / 2;
      ctx.fillRect(p.x, 0, PIPE_W, topH);
      ctx.strokeRect(p.x + 0.5, 0.5, PIPE_W - 1, topH);
      ctx.fillRect(p.x, botY, PIPE_W, H - botY);
      ctx.strokeRect(p.x + 0.5, botY + 0.5, PIPE_W - 1, H - botY - 0.5);
      ctx.strokeStyle = hi;
      ctx.beginPath();
      ctx.moveTo(p.x, topH);
      ctx.lineTo(p.x + PIPE_W, topH);
      ctx.moveTo(p.x, botY);
      ctx.lineTo(p.x + PIPE_W, botY);
      ctx.stroke();
    }

    // bird
    ctx.fillStyle = hi;
    ctx.fillRect(BIRD_X - BIRD / 2, y.current - BIRD / 2, BIRD, BIRD);
    ctx.fillStyle = accent;
    ctx.fillRect(BIRD_X - BIRD / 2 + 3, y.current - BIRD / 2 + 3, BIRD - 6, BIRD - 6);
  }, []);

  const end = useCallback(() => {
    setState("over");
    const s = scoreRef.current;
    setBest((b) => Math.max(b, s));
    setLastScore(s);
  }, []);

  const step = useCallback(() => {
    vy.current += GRAV;
    y.current += vy.current;

    dist.current += SPEED;
    for (const p of pipes.current) p.x -= SPEED;
    if (dist.current >= SPAWN) {
      dist.current = 0;
      const margin = 60;
      const gapY = margin + GAP / 2 + Math.random() * (H - GAP - margin * 2);
      pipes.current.push({ x: W, gapY, passed: false });
    }
    pipes.current = pipes.current.filter((p) => p.x + PIPE_W > -10);

    // score + collision
    for (const p of pipes.current) {
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      const inX = BIRD_X + BIRD / 2 > p.x && BIRD_X - BIRD / 2 < p.x + PIPE_W;
      const outGap = y.current - BIRD / 2 < p.gapY - GAP / 2 || y.current + BIRD / 2 > p.gapY + GAP / 2;
      if (inX && outGap) return end();
    }
    if (y.current + BIRD / 2 >= H || y.current - BIRD / 2 <= 0) return end();

    draw();
    raf.current = requestAnimationFrame(step);
  }, [draw, end]);

  const flap = useCallback(() => {
    if (stateRef.current === "playing") {
      vy.current = FLAP;
      return;
    }
    reset();
    setState("playing");
    vy.current = FLAP;
  }, [reset]);

  // drive the loop
  useEffect(() => {
    if (state === "playing") {
      raf.current = requestAnimationFrame(step);
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
    }
    draw();
  }, [state, step, draw]);

  // Space flaps only while THIS game is running — starting is click-only, so
  // the spacebar never launches flappy while you're playing something else.
  useEffect(() => {
    if (state !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, flap]);

  return (
    <div className="fb">
      <div className="fb__hud">
        <span>score: <strong>{score}</strong></span>
        <span>best: <strong>{best}</strong></span>
      </div>
      <div
        className={`fb__stage${state === "playing" ? " play" : ""}`}
        onPointerDown={(e) => {
          // Mid-flight taps flap; when idle/over the overlay button starts the
          // game, so a stray touch while scrolling past can't hijack the page.
          if (state !== "playing") return;
          e.preventDefault();
          flap();
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="fb__canvas" />
        {state !== "playing" && (
          <div className="fb__overlay">
            {state === "over" && <p className="fb__msg">down at {score}</p>}
            <button className="fb__btn" onClick={flap}>{state === "over" ? "Retry" : "Start"}</button>
            <p className="fb__hint">click / tap / space to flap</p>
          </div>
        )}
      </div>
      <div className="fb__board">
        <ScoreBoard game="flappy" score={lastScore} unit="pipes" />
      </div>
      <style>{`
        .fb { display: flex; flex-direction: column; gap: var(--space-sm); align-items: center; }
        .fb__hud { display: flex; gap: var(--space-lg); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
        .fb__hud strong { color: var(--color-accent-highlight); }
        .fb__stage { position: relative; width: 100%; max-width: 300px; aspect-ratio: ${W} / ${H}; }
        .fb__stage.play { touch-action: none; }
        .fb__canvas { width: 100%; height: 100%; border: 1px solid var(--color-border); display: block; }
        .fb__overlay { position: absolute; inset: 0; display: grid; place-content: center; gap: var(--space-sm);
          background: color-mix(in srgb, var(--color-bg-primary) 68%, transparent); text-align: center; }
        .fb__msg { margin: 0; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
        .fb__btn { padding: 9px 22px; border: 1px solid var(--color-text-primary); background: var(--color-bg-primary);
          color: var(--color-text-primary); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-sm); }
        .fb__btn:hover { border-color: var(--color-accent-highlight); color: var(--color-accent-highlight); }
        .fb__hint { margin: 0; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .fb__board { width: 100%; margin-top: var(--space-sm); }
      `}</style>
    </div>
  );
}
