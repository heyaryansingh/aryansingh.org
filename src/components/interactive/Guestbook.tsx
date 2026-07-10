/**
 * Guestbook.tsx — leave-a-message wall. Newest first, optimistic post.
 * Moderated + rate-limited server-side.
 */
import { useEffect, useRef, useState } from "react";
import { api, LIMITS, timeAgo, type GuestEntry } from "../../lib/interactive";

export default function Guestbook() {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    api.listGuestbook(60).then((r) => {
      if (!live) return;
      if (r.ok) setEntries(r.data.entries ?? []);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !message.trim()) return;
    setBusy(true);
    setStatus(null);
    const r = await api.addGuestbook({
      name: name.trim() || undefined,
      message: message.trim(),
      website: hp.current?.value || "",
    });
    setBusy(false);
    if (r.ok) {
      setEntries((prev) => [r.data.entry, ...prev]);
      setMessage("");
      setStatus("Thanks for signing 👋");
      setTimeout(() => setStatus(null), 2500);
    } else {
      setStatus(r.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="gb">
      <form className="gb__form" onSubmit={submit}>
        <input
          className="gb__name"
          placeholder="your name (optional)"
          value={name}
          maxLength={LIMITS.name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="gb__msg"
          placeholder="leave a message on the wall…"
          value={message}
          maxLength={LIMITS.message}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input ref={hp} className="gb__hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
        <div className="gb__actions">
          <span className="gb__hint">be nice — messages are moderated</span>
          <div className="gb__actions-right">
            <span className="gb__count">{message.length}/{LIMITS.message}</span>
            <button className="gb__submit" disabled={busy || !message.trim()}>
              {busy ? "Signing…" : "Sign the wall"}
            </button>
          </div>
        </div>
        {status && <p className="gb__status">{status}</p>}
      </form>

      <div className="gb__feed">
        {loading ? (
          <p className="gb__muted">Loading the wall…</p>
        ) : entries.length === 0 ? (
          <p className="gb__muted">No messages yet. Be the first!</p>
        ) : (
          entries.map((e) => (
            <article key={e.id} className="gb__entry">
              <div className="gb__entry-head">
                <span className="gb__entry-name">{e.name}</span>
                <span className="gb__entry-time">{timeAgo(e.createdAt)}</span>
              </div>
              <p className="gb__entry-msg">{e.message}</p>
            </article>
          ))
        )}
      </div>

      <style>{`
        .gb { display: grid; gap: var(--space-xl); }
        .gb__form { display: flex; flex-direction: column; gap: var(--space-sm);
          padding: var(--space-lg); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
          background: var(--color-bg-secondary); }
        .gb__name, .gb__msg {
          width: 100%; font-family: var(--font-sans); font-size: var(--text-sm);
          background: var(--color-bg-primary); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); padding: 10px 12px; color: var(--color-text-primary);
          transition: border-color var(--transition-fast);
        }
        .gb__name:focus, .gb__msg:focus { outline: none; border-color: var(--color-accent-primary); }
        .gb__msg { resize: vertical; line-height: 1.5; }
        .gb__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .gb__actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; }
        .gb__actions-right { display: flex; align-items: center; gap: var(--space-md); }
        .gb__hint { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .gb__count { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }
        .gb__submit {
          padding: 8px 18px; border-radius: var(--radius-md); border: 1px solid var(--color-accent-primary);
          background: var(--color-accent-primary); color: #fff; font-size: var(--text-sm); cursor: pointer;
          transition: transform var(--transition-fast), opacity var(--transition-fast);
        }
        .gb__submit:hover:not(:disabled) { transform: translateY(-1px); }
        .gb__submit:disabled { opacity: 0.5; cursor: default; }
        .gb__status { margin: 0; font-size: var(--text-xs); color: var(--color-accent-highlight); }
        .gb__feed { display: grid; gap: var(--space-md); }
        .gb__muted { color: var(--color-text-tertiary); font-size: var(--text-sm); }
        .gb__entry { padding: var(--space-md) var(--space-lg); border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md); background: var(--color-bg-secondary);
          transition: border-color var(--transition-fast), transform var(--transition-fast); }
        .gb__entry:hover { border-color: var(--color-border); transform: translateX(2px); }
        .gb__entry-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-sm); }
        .gb__entry-name { font-weight: 600; font-size: var(--text-sm); color: var(--color-text-primary); }
        .gb__entry-time { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }
        .gb__entry-msg { margin: 4px 0 0; font-size: var(--text-sm); color: var(--color-text-secondary);
          line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
      `}</style>
    </div>
  );
}
