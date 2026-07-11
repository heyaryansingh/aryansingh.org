/**
 * ScoreBoard — shared high-score table for the playground games.
 * Reads the top scores for `game` from D1; when the parent passes a fresh
 * `score`, offers a one-field name submit. Name is remembered locally so
 * repeat players don't retype it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ScoreEntry, LIMITS } from "../../lib/interactive";

const NAME_KEY = "playground-name";

export default function ScoreBoard({
  game,
  score = null,
  unit = "pts",
}: {
  game: string;
  score?: number | null;
  unit?: string;
}) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [sent, setSent] = useState<number | null>(null); // score value already submitted
  const [rank, setRank] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const website = useRef(""); // honeypot

  const load = useCallback(async () => {
    const res = await api.listScores(game, 10);
    if (res.ok) setScores(res.data.scores || []);
    setLoading(false);
  }, [game]);

  useEffect(() => {
    load();
    try {
      const n = localStorage.getItem(NAME_KEY);
      if (n) setName(n);
    } catch {
      /* ignore */
    }
  }, [load]);

  // A new run finished: reset the submit affordance.
  useEffect(() => {
    if (score != null) {
      setSent(null);
      setRank(null);
      setErr(null);
    }
  }, [score]);

  const submit = async () => {
    if (score == null || busy) return;
    setBusy(true);
    setErr(null);
    const clean = name.trim().slice(0, LIMITS.name);
    const res = await api.addScore({ game, name: clean || "anon", score, website: website.current });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error || "Could not save your score.");
      return;
    }
    try {
      if (clean) localStorage.setItem(NAME_KEY, clean);
    } catch {
      /* ignore */
    }
    setSent(score);
    setRank(res.data.rank ?? null);
    load();
  };

  const canSubmit = score != null && score > 0 && sent !== score;

  return (
    <div className="sb">
      <div className="sb__head">
        <span className="sb__title">leaderboard</span>
        <span className="sb__game">{game}</span>
      </div>

      {canSubmit && (
        <form
          className="sb__submit"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className="sb__you">
            you scored <strong>{score}</strong> {unit}
          </span>
          <div className="sb__row">
            <input
              className="sb__input"
              value={name}
              maxLength={LIMITS.name}
              placeholder="your name"
              onChange={(e) => setName(e.target.value)}
              aria-label="Your name for the leaderboard"
            />
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              className="sb__hp"
              onChange={(e) => (website.current = e.target.value)}
              aria-hidden="true"
            />
            <button className="sb__btn" disabled={busy}>
              {busy ? "saving…" : "submit"}
            </button>
          </div>
          {err && <p className="sb__err">{err}</p>}
        </form>
      )}

      {sent != null && (
        <p className="sb__done">
          saved{rank ? `. you're #${rank}` : ""}.
        </p>
      )}

      <ol className="sb__list">
        {loading && <li className="sb__empty">loading…</li>}
        {!loading && scores.length === 0 && <li className="sb__empty">no scores yet. be first.</li>}
        {scores.map((s, i) => (
          <li key={s.id} className="sb__item">
            <span className="sb__rank">{i + 1}</span>
            <span className="sb__name">{s.name}</span>
            <span className="sb__score">{s.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>

      <style>{`
        .sb { font-family: var(--font-mono); font-size: var(--text-xs); border: 1px solid var(--color-border); }
        .sb__head { display: flex; justify-content: space-between; align-items: baseline;
          padding: 9px 14px; border-bottom: 1px solid var(--color-border); }
        .sb__title { text-transform: uppercase; letter-spacing: 0.14em; color: var(--color-text-secondary); }
        .sb__game { color: var(--color-accent-highlight); }
        .sb__submit { padding: 12px 14px; border-bottom: 1px solid var(--color-border-subtle); display: grid; gap: 8px; }
        .sb__you { color: var(--color-text-secondary); }
        .sb__you strong { color: var(--color-accent-highlight); }
        .sb__row { display: flex; gap: 6px; }
        .sb__input { flex: 1; min-width: 0; background: var(--color-bg-primary); color: var(--color-text-primary);
          border: 1px solid var(--color-border); padding: 6px 9px; font: inherit; }
        .sb__input:focus-visible { outline: 1px solid var(--color-accent-primary); outline-offset: 0; }
        .sb__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .sb__btn { background: var(--color-text-primary); color: var(--color-bg-primary); border: none;
          padding: 6px 14px; font: inherit; cursor: pointer; }
        .sb__btn:hover { background: var(--color-accent-highlight); }
        .sb__btn:disabled { opacity: 0.5; cursor: default; }
        .sb__err { margin: 0; color: var(--color-error); }
        .sb__done { margin: 0; padding: 9px 14px; color: var(--color-success); border-bottom: 1px solid var(--color-border-subtle); }
        .sb__list { list-style: none; margin: 0; padding: 4px 0; }
        .sb__item, .sb__empty { display: grid; grid-template-columns: 24px 1fr auto; gap: 10px;
          align-items: baseline; padding: 5px 14px; }
        .sb__empty { display: block; color: var(--color-text-tertiary); }
        .sb__rank { color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }
        .sb__name { color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb__score { color: var(--color-accent-highlight); font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}
