/**
 * StickerWall.tsx — a shared canvas anyone can drop stickers onto.
 * Pick a sticker from the palette, then click/tap the wall to place it.
 * Positions are stored normalized (0..1) so the wall scales on any screen.
 */
import { useEffect, useRef, useState } from "react";
import { api, STICKER_KINDS, type Sticker } from "../../lib/interactive";

export default function StickerWall() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(STICKER_KINDS[0]);
  const [status, setStatus] = useState<string | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const placing = useRef(false);

  useEffect(() => {
    let live = true;
    api.listStickers().then((r) => {
      if (!live) return;
      if (r.ok) setStickers(r.data.stickers ?? []);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  function toast(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2200);
  }

  async function place(clientX: number, clientY: number) {
    const el = wallRef.current;
    if (!el || placing.current) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const rotation = Math.round((Math.random() - 0.5) * 40); // -20..20°
    const scale = 0.85 + Math.random() * 0.5;

    placing.current = true;
    // Optimistic with a temporary negative id.
    const temp: Sticker = { id: -Date.now(), kind: selected, x, y, rotation, scale, createdAt: Date.now() };
    setStickers((s) => [...s, temp]);

    const r = await api.addSticker({ kind: selected, x, y, rotation, scale, website: "" });
    placing.current = false;
    if (r.ok) {
      setStickers((s) => s.map((st) => (st.id === temp.id ? r.data.sticker : st)));
    } else {
      setStickers((s) => s.filter((st) => st.id !== temp.id));
      toast(r.error ?? "Couldn't place that one.");
    }
  }

  return (
    <div className="sw">
      <div className="sw__palette" role="toolbar" aria-label="Sticker palette">
        {STICKER_KINDS.map((k) => (
          <button
            key={k}
            className={`sw__pick ${selected === k ? "is-active" : ""}`}
            onClick={() => setSelected(k)}
            aria-pressed={selected === k}
            title={`Select ${k}`}
          >
            {k}
          </button>
        ))}
      </div>

      <div
        ref={wallRef}
        className="sw__wall"
        onClick={(e) => place(e.clientX, e.clientY)}
        role="button"
        tabIndex={0}
        aria-label="Sticker wall. Click to place the selected sticker"
      >
        {stickers.map((s) => (
          <span
            key={s.id}
            className="sw__sticker"
            style={{
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})`,
            }}
          >
            {s.kind}
          </span>
        ))}
        {!loading && stickers.length === 0 && <span className="sw__empty">click anywhere to drop a sticker</span>}
        {loading && <span className="sw__empty">loading the wall…</span>}
      </div>

      <div className="sw__foot">
        <span className="sw__count">{stickers.length} stickers on the wall</span>
        {status && <span className="sw__status">{status}</span>}
      </div>

      <style>{`
        .sw { display: grid; gap: var(--space-md); }
        .sw__palette { display: flex; flex-wrap: wrap; gap: 6px; }
        .sw__pick {
          width: 40px; height: 40px; font-size: 1.25rem; line-height: 1;
          border: 1px solid var(--color-border); border-radius: var(--radius-md);
          background: var(--color-bg-secondary); cursor: pointer;
          transition: transform var(--transition-fast) var(--ease-elastic), border-color var(--transition-fast), background var(--transition-fast);
        }
        .sw__pick:hover { transform: translateY(-2px) scale(1.08); }
        .sw__pick.is-active { border-color: var(--color-accent-primary);
          background: color-mix(in srgb, var(--color-accent-primary) 22%, var(--color-bg-secondary)); }
        .sw__wall {
          position: relative; width: 100%; aspect-ratio: 16 / 10; max-height: 68vh;
          border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
          background:
            radial-gradient(circle at 20% 20%, var(--color-manifold) 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, var(--color-manifold) 0%, transparent 45%),
            var(--color-bg-secondary);
          overflow: hidden; cursor: crosshair; user-select: none;
        }
        .sw__wall:focus-visible { outline: 2px solid var(--color-accent-primary); outline-offset: 2px; }
        .sw__sticker {
          position: absolute; font-size: clamp(1.5rem, 4vw, 2.4rem); line-height: 1;
          pointer-events: none; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
          animation: sw-pop 0.35s var(--ease-elastic) both;
        }
        @keyframes sw-pop { from { transform: translate(-50%,-50%) scale(0); } }
        .sw__empty { position: absolute; inset: 0; display: grid; place-items: center;
          color: var(--color-text-tertiary); font-size: var(--text-sm); pointer-events: none; }
        .sw__foot { display: flex; justify-content: space-between; gap: var(--space-md); align-items: center; }
        .sw__count { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }
        .sw__status { font-size: var(--text-xs); color: var(--color-error); }
        @media (prefers-reduced-motion: reduce) { .sw__sticker { animation: none; } }
      `}</style>
    </div>
  );
}
