/**
 * Recommendations — visitors tell Aryan what to read/watch/listen to.
 * A small form (kind, title, optional author/link/note, optional name) and a
 * live, filterable feed of what everyone's suggested. D1-backed, moderated.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, timeAgo, REC_KINDS, LIMITS, type Recommendation } from "../../lib/interactive";

const KIND_LABEL = Object.fromEntries(REC_KINDS.map((k) => [k.key, k.label]));

export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const [kind, setKind] = useState<string>("book");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const website = useRef("");

  const load = useCallback(async () => {
    const res = await api.listRecommendations(200);
    if (res.ok) setRecs(res.data.recommendations || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (busy) return;
    if (!title.trim()) {
      setErr("Give it a title at least.");
      return;
    }
    setBusy(true);
    setErr(null);
    const clean = name.trim().slice(0, LIMITS.name);
    const res = await api.addRecommendation({
      kind,
      title: title.trim(),
      author: author.trim(),
      url: url.trim(),
      note: note.trim(),
      name: clean || "anon",
      website: website.current,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error || "Could not save that.");
      return;
    }
    setTitle("");
    setAuthor("");
    setUrl("");
    setNote("");
    setDone(true);
    setRecs((r) => [res.data.recommendation, ...r]);
    setTimeout(() => setDone(false), 2500);
  };

  const counts: Record<string, number> = { all: recs.length };
  for (const r of recs) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  const usedKinds = REC_KINDS.filter((k) => counts[k.key]);
  const shown = filter === "all" ? recs : recs.filter((r) => r.kind === filter);

  return (
    <div className="rec">
      <form
        className="rec__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="rec__row rec__row--top">
          <select
            className="rec__select"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="What kind of thing"
          >
            {REC_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          <input
            className="rec__input rec__input--title"
            value={title}
            maxLength={LIMITS.recTitle}
            placeholder="Title *"
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
          />
        </div>
        <div className="rec__row">
          <input
            className="rec__input"
            value={author}
            maxLength={LIMITS.recAuthor}
            placeholder="Author / creator (optional)"
            onChange={(e) => setAuthor(e.target.value)}
            aria-label="Author or creator"
          />
          <input
            className="rec__input"
            value={url}
            maxLength={LIMITS.recUrl}
            placeholder="Link (optional)"
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Link"
          />
        </div>
        <textarea
          className="rec__note"
          value={note}
          maxLength={LIMITS.recNote}
          placeholder="Why should I? (optional)"
          onChange={(e) => setNote(e.target.value)}
          aria-label="Why should I"
          rows={2}
        />
        <div className="rec__row rec__row--send">
          <input
            className="rec__input rec__input--name"
            value={name}
            maxLength={LIMITS.name}
            placeholder="your name (optional)"
            onChange={(e) => setName(e.target.value)}
            aria-label="Your name"
          />
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            className="rec__hp"
            onChange={(e) => (website.current = e.target.value)}
            aria-hidden="true"
          />
          <button className="rec__btn" disabled={busy}>
            {busy ? "sending…" : "recommend it"}
          </button>
        </div>
        {err && <p className="rec__err">{err}</p>}
        {done && <p className="rec__ok">added. thank you, I'll take a look.</p>}
      </form>

      <div className="rec__filters">
        <button
          className={`rec__chip${filter === "all" ? " on" : ""}`}
          onClick={() => setFilter("all")}
        >
          all <span>{counts.all}</span>
        </button>
        {usedKinds.map((k) => (
          <button
            key={k.key}
            className={`rec__chip${filter === k.key ? " on" : ""}`}
            onClick={() => setFilter(k.key)}
          >
            {k.label.toLowerCase()} <span>{counts[k.key]}</span>
          </button>
        ))}
      </div>

      <ul className="rec__list">
        {loading && <li className="rec__empty">loading…</li>}
        {!loading && shown.length === 0 && (
          <li className="rec__empty">nothing here yet. be the first to recommend something.</li>
        )}
        {shown.map((r) => (
          <li key={r.id} className="rec__item">
            <span className="rec__kind">{KIND_LABEL[r.kind] || r.kind}</span>
            <div className="rec__body">
              <p className="rec__title">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer nofollow">
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}
                {r.author && <span className="rec__by">, {r.author}</span>}
              </p>
              {r.note && <p className="rec__why">"{r.note}"</p>}
              <p className="rec__who">
                {r.name} · {timeAgo(r.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <style>{`
        .rec { display: flex; flex-direction: column; gap: var(--space-lg); }
        .rec__form { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--color-border);
          padding: var(--space-md); }
        .rec__row { display: flex; gap: 8px; }
        .rec__row--top .rec__select { flex: 0 0 auto; }
        .rec__input, .rec__select, .rec__note { background: transparent; color: var(--color-text-primary);
          border: 1px solid var(--color-border); padding: 8px 10px; font-family: var(--font-mono);
          font-size: var(--text-xs); min-width: 0; }
        .rec__input { flex: 1; }
        .rec__input--title { flex: 1; }
        .rec__select { cursor: pointer; }
        .rec__note { width: 100%; resize: vertical; font-family: var(--font-sans); font-size: var(--text-sm); }
        .rec__input:focus-visible, .rec__select:focus-visible, .rec__note:focus-visible {
          outline: 1px solid var(--color-accent-primary); outline-offset: 0; }
        .rec__row--send { align-items: center; }
        .rec__input--name { flex: 1; }
        .rec__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .rec__btn { flex: 0 0 auto; background: var(--color-text-primary); color: var(--color-bg-primary);
          border: none; padding: 9px 16px; font-family: var(--font-mono); font-size: var(--text-xs); cursor: pointer; }
        .rec__btn:hover { background: var(--color-accent-highlight); }
        .rec__btn:disabled { opacity: 0.5; cursor: default; }
        .rec__err { margin: 0; color: var(--color-error); font-family: var(--font-mono); font-size: var(--text-xs); }
        .rec__ok { margin: 0; color: var(--color-success); font-family: var(--font-mono); font-size: var(--text-xs); }

        .rec__filters { display: flex; flex-wrap: wrap; gap: 6px; }
        .rec__chip { background: transparent; border: 1px solid var(--color-border-subtle);
          color: var(--color-text-tertiary); padding: 4px 10px; font-family: var(--font-mono);
          font-size: var(--text-xs); cursor: pointer; }
        .rec__chip:hover { color: var(--color-text-primary); }
        .rec__chip.on { color: var(--color-accent-highlight); border-color: var(--color-accent-primary); }
        .rec__chip span { opacity: 0.55; }

        .rec__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .rec__item { display: grid; grid-template-columns: 88px 1fr; gap: var(--space-md); align-items: baseline;
          padding: var(--space-md) 0; border-top: 1px solid var(--color-border-subtle); }
        .rec__item:first-child { border-top: none; }
        .rec__empty { padding: var(--space-md) 0; font-family: var(--font-mono); font-size: var(--text-xs);
          color: var(--color-text-tertiary); }
        .rec__kind { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--color-text-tertiary); padding-top: 3px; }
        .rec__body { min-width: 0; }
        .rec__title { margin: 0; font-family: var(--font-serif); font-size: var(--text-lg); color: var(--color-text-primary); line-height: 1.3; }
        .rec__title a { color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); }
        .rec__title a:hover { color: var(--color-accent-highlight); border-bottom-color: var(--color-accent-highlight); }
        .rec__by { font-family: var(--font-sans); font-size: var(--text-sm); color: var(--color-text-secondary); font-style: italic; }
        .rec__why { margin: 4px 0 0; font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; }
        .rec__who { margin: 4px 0 0; font-family: var(--font-mono); font-size: 10px; color: var(--color-text-tertiary); }
      `}</style>
    </div>
  );
}
