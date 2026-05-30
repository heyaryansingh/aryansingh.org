# PRD — Reading / "The Stacks" Redesign

## 1. Problem & Goals

The `/reading` page is a flat list of bordered cards. It works but is generic and has
no way to capture longer, personal reactions to a book — only a one-line `overview`.

Goals:
1. **Data accuracy** — record real reading history (finish Monte Cristo, add two new books).
2. **Authoring** — a first-class, durable way for Aryan to *write and publish his own
   thoughts* on any book.
3. **Design** — replace the plain list with a distinctive, literary, "personal library"
   experience that is on-brand with the site's *Spacetime Manifold* identity and is not
   generic/templated.
4. **Performance polish** — small, low-risk site-wide load improvement.

## 2. Content changes (explicit asks)

| Book | Action |
|------|--------|
| The Count of Monte Cristo — Dumas | Move to **Finished**. Started 2026-05-03, finished **2026-05-27**. |
| A Short Stay in Hell — Steven L. Peck | **Add** to Finished. Started **2026-05-29**, finished **2026-05-29**. Faithful, original-worded description. |
| The Brothers Karamazov — Dostoevsky | **Add** to Currently Reading. |
| Tomorrow, and Tomorrow, and Tomorrow | Stays Currently Reading. |
| The Stranger — Camus | Stays Finished. |

Descriptions: written in my own words — accurate to the actual book (premise, themes,
author), **not** copied jacket/publisher copy (copyright), and not vague "AI slop".
Verified links: Monte Cristo → Gutenberg 1184; Brothers Karamazov → Gutenberg 28054;
A Short Stay in Hell → Goodreads 13456414.

Ratings are NOT fabricated — a rating is Aryan's opinion, so the field is optional and
left unset until he fills it in. Genre/theme `tags` (factual classification) are added.

## 3. Architecture decision — MDX content collection

Replace `src/data/reading-list.json` with a new `reads` **content collection** (MDX),
matching the existing `blog` / `projects` / `research` collections.

- One `.mdx` file per book in `src/content/reads/`.
- **Frontmatter** = structured metadata (title, author, type, status, dates, link,
  overview, tags, rating?, spine accent, order).
- **Body** = Aryan's thoughts/review (full MDX: prose, headings, quotes, images).

This is the "write & publish my own thoughts" mechanism: to record a reaction he just
writes in the file body; on build it publishes to the book's detail page. To add a book,
create a file. Single source of truth, no JSON↔MDX drift.

`reads` schema:
```
title, author, type='book', status: 'reading'|'completed',
startedDate?, finishedDate?, link(url), overview(string),
tags: string[], rating?: 0–5, spine?: hex (cover accent), order=0
```

## 4. Pages

### `/reading` — index ("The Stacks")
- Editorial header: serif title, subtitle, **stat line** (mono caps): total books ·
  finished · currently reading.
- **Currently Reading**: prominent feature cards with a subtle animated "in progress"
  pulse on the spine.
- **Finished**: responsive grid of cards. Each card = a CSS-generated book "spine"
  accent (per-book `spine` color — visual variety with zero images), serif title,
  author, meta row (dates · type), overview, tag chips, and links:
  `Read notes →` (detail page) and `Find online ↗` (external).
- CSS-only entrance + hover micro-interactions (lift, accent glow). No heavy JS.

### `/reading/[slug]` — book detail (new)
- `getStaticPaths` over `reads` (output is `static`).
- Large CSS book "jacket" using the spine color + title; meta rail (author, dates,
  status, rating if set, tags, external link); `overview` as a lede; then the rendered
  MDX body as **Notes**. If no notes yet → tasteful "Notes in progress" placeholder
  (does not fabricate Aryan's opinions). Back link to `/reading`.

## 5. Performance polish (site-wide, low risk)
`BaseLayout.astro`: hydrate the always-on canvas/UX islands with `client:idle` instead
of `client:load` (StarField, SpacetimeCursor, CommandPalette). Improves first load /
time-to-interactive; behavior unchanged (Cmd+K, effects still attach on idle).

## 6. Out of scope
- No runtime CMS / comment system (static site).
- No global redesign beyond the reading experience + the hydration tweak.
- No fabricated ratings or fabricated personal notes.

## 7. Acceptance
- Monte Cristo in Finished with 5/03–5/27/2026; A Short Stay in Hell finished 5/29/2026;
  Brothers Karamazov in Currently Reading.
- Every book links to its own `/reading/[slug]` page where notes can be written/published.
- `npm run build` succeeds; `/reading` + all detail routes generate.
- Reading page visually distinct, modern, on-brand.
