/**
 * Comments.tsx — anonymous comments with one level of replies.
 * Keyed by (targetType, targetSlug). Moderated + rate-limited server-side.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { api, LIMITS, timeAgo, type Comment } from "../../lib/interactive";

interface Props {
  targetType: string;
  targetSlug: string;
}

export default function Comments({ targetType, targetSlug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    api.listComments(targetType, targetSlug).then((r) => {
      if (!live) return;
      if (r.ok) setComments(r.data.comments ?? []);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [targetType, targetSlug]);

  const { roots, childrenOf } = useMemo(() => {
    const roots: Comment[] = [];
    const childrenOf = new Map<number, Comment[]>();
    for (const c of comments) {
      if (c.parentId == null) roots.push(c);
      else childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) ?? []), c]);
    }
    return { roots, childrenOf };
  }, [comments]);

  function onPosted(c: Comment) {
    setComments((prev) => [...prev, c]);
    setReplyTo(null);
  }

  return (
    <section className="cm" aria-label="Comments">
      <h3 className="cm__title">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h3>

      <CommentForm targetType={targetType} targetSlug={targetSlug} onPosted={onPosted} />

      {loading ? (
        <p className="cm__muted">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="cm__muted">Be the first to say something.</p>
      ) : (
        <ul className="cm__list">
          {roots.map((c) => (
            <li key={c.id} className="cm__item">
              <CommentRow c={c} />
              <button className="cm__reply" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                {replyTo === c.id ? "Cancel" : "Reply"}
              </button>
              {replyTo === c.id && (
                <div className="cm__replybox">
                  <CommentForm
                    targetType={targetType}
                    targetSlug={targetSlug}
                    parentId={c.id}
                    compact
                    onPosted={onPosted}
                  />
                </div>
              )}
              {(childrenOf.get(c.id) ?? []).length > 0 && (
                <ul className="cm__children">
                  {(childrenOf.get(c.id) ?? []).map((child) => (
                    <li key={child.id} className="cm__item">
                      <CommentRow c={child} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .cm { margin-top: var(--space-2xl); }
        .cm__title { font-family: var(--font-sans); font-size: var(--text-lg); font-weight: 600;
          margin: 0 0 var(--space-lg); color: var(--color-text-primary); letter-spacing: 0; }
        .cm__muted { color: var(--color-text-tertiary); font-size: var(--text-sm); }
        .cm__list, .cm__children { list-style: none; margin: var(--space-lg) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-lg); }
        .cm__children { margin-top: var(--space-md); margin-left: var(--space-lg); padding-left: var(--space-lg); border-left: 1px solid var(--color-border-subtle); }
        .cm__reply { margin-top: 6px; background: none; border: none; padding: 0; cursor: pointer;
          color: var(--color-accent-secondary); font-size: var(--text-xs); font-family: var(--font-mono); }
        .cm__reply:hover { color: var(--color-accent-highlight); }
        .cm__replybox { margin-top: var(--space-sm); }
      `}</style>
    </section>
  );
}

function CommentRow({ c }: { c: Comment }) {
  return (
    <div className="cmr">
      <div className="cmr__head">
        <span className="cmr__name">{c.name}</span>
        <span className="cmr__time">{timeAgo(c.createdAt)}</span>
      </div>
      <p className="cmr__body">{c.body}</p>
      <style>{`
        .cmr__head { display: flex; align-items: baseline; gap: var(--space-sm); }
        .cmr__name { font-weight: 600; font-size: var(--text-sm); color: var(--color-text-primary); }
        .cmr__time { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }
        .cmr__body { margin: 4px 0 0; font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
      `}</style>
    </div>
  );
}

function CommentForm({
  targetType,
  targetSlug,
  parentId,
  compact,
  onPosted,
}: Props & { parentId?: number; compact?: boolean; onPosted: (c: Comment) => void }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hp = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setStatus(null);
    const r = await api.addComment({
      targetType,
      targetSlug,
      name: name.trim() || undefined,
      body: body.trim(),
      parentId,
      website: hp.current?.value || "",
    });
    setBusy(false);
    if (r.ok) {
      onPosted(r.data.comment);
      setBody("");
      setName("");
    } else {
      setStatus(r.error ?? "Something went wrong.");
    }
  }

  return (
    <form className="cf" onSubmit={submit}>
      <div className="cf__row">
        <input
          className="cf__name"
          placeholder="name (optional)"
          value={name}
          maxLength={LIMITS.name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <textarea
        className="cf__body"
        placeholder={parentId ? "Write a reply…" : "Add a comment…"}
        value={body}
        maxLength={LIMITS.comment}
        rows={compact ? 2 : 3}
        onChange={(e) => setBody(e.target.value)}
      />
      {/* honeypot */}
      <input ref={hp} className="cf__hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
      <div className="cf__actions">
        <span className="cf__count">{body.length}/{LIMITS.comment}</span>
        <button className="cf__submit" disabled={busy || !body.trim()}>
          {busy ? "Posting…" : parentId ? "Reply" : "Post"}
        </button>
      </div>
      {status && <p className="cf__status">{status}</p>}
      <style>{`
        .cf { display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-lg); }
        .cf__row { display: flex; gap: var(--space-sm); }
        .cf__name, .cf__body {
          width: 100%; font-family: var(--font-sans); font-size: var(--text-sm);
          background: var(--color-bg-secondary); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); padding: 10px 12px; color: var(--color-text-primary);
          transition: border-color var(--transition-fast);
        }
        .cf__name:focus, .cf__body:focus { outline: none; border-color: var(--color-accent-primary); }
        .cf__body { resize: vertical; line-height: 1.5; }
        .cf__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .cf__actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-md); }
        .cf__count { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }
        .cf__submit {
          padding: 7px 16px; border-radius: var(--radius-md); border: 1px solid var(--color-accent-primary);
          background: var(--color-accent-primary); color: #fff; font-size: var(--text-sm); cursor: pointer;
          transition: opacity var(--transition-fast), transform var(--transition-fast);
        }
        .cf__submit:hover:not(:disabled) { transform: translateY(-1px); }
        .cf__submit:disabled { opacity: 0.5; cursor: default; }
        .cf__status { margin: 0; font-size: var(--text-xs); color: var(--color-error); }
      `}</style>
    </form>
  );
}
