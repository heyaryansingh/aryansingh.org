# HANDOFF — aryansingh.org interactive + refresh

## Goal
Add D1-backed interactive layer (guestbook, sticker wall, reactions, comments, minigames),
overhaul projects onto the content collection with full write-ups, and bold-redesign the core.

## Frozen API contract (owned by main session — do not change silently)

Base: `/api/*`, JSON, same-origin, `export const prerender = false`. Envelope: `{ ok, error?, ...data }`.
Shared constants + typed client: `src/lib/interactive.ts`. Server helpers: `src/lib/api.ts`.

- `GET  /api/guestbook?limit=50` → `{ ok, entries: [{id,name,message,createdAt}] }` (newest first)
- `POST /api/guestbook` `{ name?<=40, message 1..500, website(honeypot="") }` → 201 `{ ok, entry }`
- `GET  /api/stickers` → `{ ok, stickers: [{id,kind,x,y,rotation,scale,createdAt}] }`
- `POST /api/stickers` `{ kind∈STICKER_KINDS, x 0..1, y 0..1, rotation?, scale?, website }` → 201 `{ ok, sticker }`
- `GET  /api/reactions?targetType=&targetSlug=` → `{ ok, counts:{emoji:n}, mine:[emoji] }`
- `POST /api/reactions` `{ targetType, targetSlug, emoji∈REACTION_EMOJIS }` → `{ ok, counts, mine, toggled }`
- `GET  /api/comments?targetType=&targetSlug=` → `{ ok, comments:[{id,name,body,parentId,createdAt}] }`
- `POST /api/comments` `{ targetType, targetSlug, name?, body 1..1000, parentId?, website }` → 201 `{ ok, comment }`
- `POST /api/moderate` `{ key, table∈{guestbook,stickers,comments}, id, action∈{hide,unhide,delete} }` → `{ ok }` | 401

All writes: honeypot + length caps + profanity filter + per-ip_hash rate limit (429). Store salted IP hash only.
Reads exclude `hidden=1`.

## D1 schema: `workers/schema.sql` (binding `DB` in wrangler.jsonc)
Secrets: `MODERATION_KEY`, `IP_SALT` (Cloudflare secrets; fallback constants for local dev).

## File ownership
- Backend (DONE, main): schema, `src/lib/interactive.ts`, `src/lib/api.ts`, `src/lib/moderation.ts`, `src/pages/api/*`, wrangler, `src/env.d.ts`.
- Interactive islands: `src/components/interactive/*`, `src/components/games/*`, `src/pages/playground.astro`.
- Content: `src/content/config.ts` (schema bump), `src/content/projects/*.mdx`, `src/pages/portfolio.astro`, `src/pages/portfolio/[slug].astro`.
- Design: `src/pages/index.astro`, `src/styles/*`, `src/components/Navigation.astro`, `src/components/Footer.astro`, `src/components/ProjectCard.astro`, `src/pages/resume.astro`.

## Acceptance
`npm run build` clean; local D1 + wrangler dev: post/persist for each feature; 429 on flood; profanity/honeypot 400; owner hide removes from reads. Every project card → working detail page.

## VERDICT — verified (local D1 + wrangler dev @ :8788 + Playwright)
- Build: clean. 20 project detail pages + portfolio + playground + blog reactions emitted; `_worker.js/pages/api/*` server endpoints confirmed (output:'static' + prerender=false works).
- guestbook: GET/POST/persist ✓; profanity/honeypot/over-length → 400 ✓; 6th rapid post → 429 ✓.
- stickers: POST/persist ✓; bad kind → 400 ✓ (earlier "unknown" failures were Git-Bash mangling inline emoji; UTF-8 file payloads pass; built chunk holds correct bytes).
- reactions: add → count 1; toggle off → 0; bad emoji → 400 ✓. Live browser click round-trips.
- comments: POST/GET ✓. moderate: owner hide removes from reads; wrong key → 401 ✓.
- Frontend (browser): home hero+credential strip+featured(QuSim/Persona/gCas9); persona case study rich; reactions/comments hydrate on `client:visible` (scroll into view); portfolio filter 20 cards, quantum→2. 0 console errors.

## REMAINING MANUAL (needs owner's Cloudflare account, before `wrangler deploy`)
1. `wrangler d1 create aryansingh_interactive` → paste id into wrangler.jsonc `database_id`.
2. `wrangler d1 execute aryansingh_interactive --remote --file ./workers/schema.sql`.
3. `wrangler secret put MODERATION_KEY` and `wrangler secret put IP_SALT`.
