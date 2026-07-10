/**
 * GuessTheProject — a quiz built from the real project list.
 * Shows a tagline; guess which category it belongs to. Client-only.
 */
import { useMemo, useState } from "react";

export interface QuizItem {
  title: string;
  tagline: string;
  category: string; // category key
}

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI & ML",
  quantum: "Quantum",
  biotech: "Biotech & Health",
  trading: "Trading & Quant",
  devtools: "Dev Tools",
  automation: "Automation",
};

// Deterministic shuffle from a seed so SSR/CSR agree on first paint order.
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GuessTheProject({ items }: { items: QuizItem[] }) {
  const pool = useMemo(() => items.filter((i) => CATEGORY_LABEL[i.category]), [items]);
  const [order, setOrder] = useState(() => shuffle(pool.map((_, i) => i), 7));
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const options = useMemo(
    () => Object.keys(CATEGORY_LABEL),
    [],
  );

  if (pool.length === 0) return <p className="gq__muted">No projects to quiz on yet.</p>;

  const current = pool[order[step]];

  function choose(cat: string) {
    if (picked) return;
    setPicked(cat);
    if (cat === current.category) setScore((s) => s + 1);
  }

  function next() {
    if (step + 1 >= order.length) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
    setPicked(null);
  }

  function restart() {
    setOrder(shuffle(pool.map((_, i) => i), (score + 1) * 13 + step));
    setStep(0);
    setScore(0);
    setPicked(null);
    setDone(false);
  }

  if (done) {
    return (
      <div className="gq">
        <div className="gq__done">
          <p className="gq__score-big">{score}/{order.length}</p>
          <p className="gq__muted">
            {score === order.length ? "Flawless. You know my work better than I do." : "Nice — play again?"}
          </p>
          <button className="gq__btn" onClick={restart}>Play again</button>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <div className="gq">
      <div className="gq__bar">
        <span>Q{step + 1}/{order.length}</span>
        <span>score {score}</span>
      </div>
      <p className="gq__prompt">Which domain is this project?</p>
      <blockquote className="gq__tagline">“{current.tagline}”</blockquote>
      <div className="gq__options">
        {options.map((cat) => {
          const state =
            picked == null
              ? ""
              : cat === current.category
                ? "is-correct"
                : cat === picked
                  ? "is-wrong"
                  : "is-dim";
          return (
            <button key={cat} className={`gq__opt ${state}`} onClick={() => choose(cat)} disabled={picked != null}>
              {CATEGORY_LABEL[cat]}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="gq__after">
          <p className="gq__reveal">
            {picked === current.category ? "✅ Correct" : "❌ Nope"} — <strong>{current.title}</strong>
          </p>
          <button className="gq__btn" onClick={next}>
            {step + 1 >= order.length ? "See score" : "Next →"}
          </button>
        </div>
      )}
      <style>{css}</style>
    </div>
  );
}

const css = `
  .gq { display: flex; flex-direction: column; gap: var(--space-md); }
  .gq__bar { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-tertiary); }
  .gq__prompt { margin: 0; font-size: var(--text-sm); color: var(--color-text-tertiary); }
  .gq__tagline { margin: 0; padding-left: var(--space-md); border-left: 2px solid var(--color-accent-primary);
    font-family: var(--font-serif); font-style: italic; font-size: var(--text-lg); color: var(--color-text-primary); }
  .gq__options { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
  .gq__opt { padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border);
    background: var(--color-bg-secondary); color: var(--color-text-primary); font-size: var(--text-sm); cursor: pointer;
    transition: all var(--transition-fast); }
  .gq__opt:hover:not(:disabled) { border-color: var(--color-accent-primary); transform: translateY(-1px); }
  .gq__opt:disabled { cursor: default; }
  .gq__opt.is-correct { border-color: #4A9F6E; background: color-mix(in srgb, #4A9F6E 18%, var(--color-bg-secondary)); }
  .gq__opt.is-wrong { border-color: var(--color-error); background: color-mix(in srgb, var(--color-error) 18%, var(--color-bg-secondary)); }
  .gq__opt.is-dim { opacity: 0.45; }
  .gq__after { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; }
  .gq__reveal { margin: 0; font-size: var(--text-sm); color: var(--color-text-secondary); }
  .gq__btn { padding: 8px 16px; border-radius: var(--radius-md); border: 1px solid var(--color-accent-primary);
    background: var(--color-accent-primary); color: #fff; font-size: var(--text-sm); cursor: pointer; }
  .gq__btn:hover { transform: translateY(-1px); }
  .gq__done { text-align: center; display: flex; flex-direction: column; gap: var(--space-sm); align-items: center; padding: var(--space-xl) 0; }
  .gq__score-big { font-family: var(--font-serif); font-size: var(--text-5xl); margin: 0; color: var(--color-accent-highlight); }
  .gq__muted { color: var(--color-text-tertiary); font-size: var(--text-sm); margin: 0; }
`;
