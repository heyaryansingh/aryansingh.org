/**
 * Reactions.tsx — emoji reaction bar for any page (blog post / project).
 * Keyed by (targetType, targetSlug). One reaction per emoji per visitor (toggle).
 */
import { useEffect, useState } from "react";
import { api, REACTION_EMOJIS, type ReactionCounts } from "../../lib/interactive";

interface Props {
  targetType: string;
  targetSlug: string;
}

export default function Reactions({ targetType, targetSlug }: Props) {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [mine, setMine] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api.getReactions(targetType, targetSlug).then((r) => {
      if (!live) return;
      if (r.ok) {
        setCounts(r.data.counts ?? {});
        setMine(r.data.mine ?? []);
      }
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [targetType, targetSlug]);

  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(emoji);
    // Optimistic
    const had = mine.includes(emoji);
    setMine((m) => (had ? m.filter((e) => e !== emoji) : [...m, emoji]));
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (had ? -1 : 1)) }));

    const r = await api.toggleReaction(targetType, targetSlug, emoji);
    if (r.ok) {
      setCounts(r.data.counts ?? {});
      setMine(r.data.mine ?? []);
    } else {
      // Roll back on failure
      setMine((m) => (had ? [...m, emoji] : m.filter((e) => e !== emoji)));
      setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + (had ? 1 : -1)) }));
    }
    setBusy(null);
  }

  return (
    <div className="rx" aria-label="Reactions">
      {REACTION_EMOJIS.map((emoji) => {
        const active = mine.includes(emoji);
        const n = counts[emoji] ?? 0;
        return (
          <button
            key={emoji}
            className={`rx__btn ${active ? "is-active" : ""}`}
            onClick={() => toggle(emoji)}
            aria-pressed={active}
            title={active ? "Remove reaction" : "React"}
            disabled={!ready}
          >
            <span className="rx__emoji">{emoji}</span>
            {n > 0 && <span className="rx__n">{n}</span>}
          </button>
        );
      })}
      <style>{`
        .rx { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .rx__btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: var(--radius-full);
          border: 1px solid var(--color-border); background: var(--color-bg-secondary);
          cursor: pointer; font-family: var(--font-sans); font-size: var(--text-sm);
          color: var(--color-text-secondary); line-height: 1;
          transition: transform var(--transition-fast) var(--ease-elastic),
                      border-color var(--transition-fast), background var(--transition-fast);
        }
        .rx__btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.05); border-color: var(--color-accent-primary); }
        .rx__btn:active:not(:disabled) { transform: scale(0.94); }
        .rx__btn:disabled { opacity: 0.5; cursor: default; }
        .rx__btn.is-active {
          border-color: var(--color-accent-primary);
          background: color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-bg-secondary));
          color: var(--color-text-primary);
        }
        .rx__emoji { font-size: 1.05rem; }
        .rx__n { font-variant-numeric: tabular-nums; font-family: var(--font-mono); font-size: var(--text-xs); }
      `}</style>
    </div>
  );
}
