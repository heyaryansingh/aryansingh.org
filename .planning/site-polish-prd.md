# PRD — Site Aesthetics, Readability, Responsiveness & Loading

Audit of the live codebase with concrete findings (file:line) and an implementation
plan. Scope: site-wide polish across desktop, mobile, and reduced-motion users.
Principle: high-impact, low-risk changes that preserve the existing *Spacetime Manifold*
identity — no redesign, no churn of nitpicks.

## A. Findings

### Loading / performance (highest impact)
1. **Three.js ships to every device.** `StarField.tsx` pulls in Three.js — the build
   reports `StarField.*.js ≈ 488 kB (124 kB gzip)`, by far the largest asset, hydrated
   site-wide (`BaseLayout.astro:117`). On phones it's a faint background that isn't worth
   124 kB of JS + a WebGL context.
2. **StarField re-uploads a buffer every frame.** `StarField.tsx:167-172` loops all
   ~2000 stars on the CPU and sets `needsUpdate = true` each frame, re-uploading the
   opacity attribute to the GPU every frame. `uTime` is already passed to the shader but
   the twinkle isn't computed there — it should be, eliminating the per-frame CPU work.
3. **SpacetimeCursor is a perpetual 2D-canvas loop.** `SpacetimeCursor.tsx:116-163`
   clears the canvas and redraws ~30 lines × 60 segments (~1,800 `lineTo`) **plus** a
   radial gradient every frame, forever — on the main thread. It's a *cursor* effect with
   zero value on touch devices, yet still mounts/runs there (`BaseLayout.astro:120`).
4. **Animation loops never pause when the tab is hidden** (StarField, SpacetimeCursor,
   CustomCursor) — wasted CPU/GPU/battery in background tabs.
5. Minor: `RandomQuote` hydrates `client:load` (`index.astro:72`) though it's
   below-the-fold and non-critical.

### Readability
6. **Tertiary text fails WCAG AA.** `--color-text-tertiary: #5A5A64` on `#0A0A0C`
   ≈ 3.0:1 (`global.css:38`). It's used everywhere for dates, labels, meta, footer,
   captions — much of it small text, which needs ≥ 4.5:1.
7. **Homepage intro is set in `--text-sm`** (`index.astro:158`) — the primary "who I am"
   copy is ~14px; the main introduction should read at base size.

### Responsiveness / mobile
8. **`100vh` on full-height sections** (`index.astro:84`, `gallery.astro` hero) jumps when
   mobile browser chrome shows/hides; should use `dvh`/`svh`.
9. **Mobile nav drawer is unfinished** (`Navigation.astro:204-251`): appears with
   `display:block` (no transition), the backdrop is `display:none` (dead code), body
   scroll isn't locked, and it doesn't close on link click or Escape — so tapping a link
   navigates with the menu still "open" and the page scrollable underneath.
10. **Hardcoded "Ctrl+K" hint** (`index.astro:77`) is wrong for the ~half of visitors on
    macOS (it's ⌘K there).

### Aesthetics / consistency (lower priority — mostly deferred)
11. Scattered hardcoded `rgba()`/hex instead of CSS tokens in portfolio/gallery/cards
    (`portfolio.astro:178-181,224`, `gallery.astro:110`, `ProjectFilter.astro:104,110`).
    Cosmetic; deferred to avoid risky churn.
12. `ProjectFilter.astro:166-170` forces layout thrash (`offsetHeight` in a loop) on every
    filter click. Real but isolated; deferred.

## B. Implementation (this pass)

| # | Change | Files | Why |
|---|--------|-------|-----|
| 1 | Hydrate StarField only on `(min-width:768px) and (pointer:fine)`; SpacetimeCursor only on `(pointer:fine) and (min-width:768px)` via `client:media` | `BaseLayout.astro` | Three.js + the canvas loop are **not downloaded/run** on phones & touch → large mobile load + battery win. |
| 2 | Move twinkle into the vertex shader (pass phase/speed as attributes, use `uTime`); drop the per-frame CPU loop + buffer upload; pause rAF on `visibilitychange` | `StarField.tsx` | Removes per-frame CPU work and GPU re-upload; identical look. |
| 3 | Pause rAF when tab hidden; bail on coarse pointer | `SpacetimeCursor.tsx` | No wasted frames in background/touch. |
| 4 | Raise `--color-text-tertiary` to ~`#7E7E8A` (dark) / keep AA in light | `global.css` | Meets WCAG AA for the many small meta labels. |
| 5 | Homepage intro → `--text-base`; full-height → `100dvh`; OS-aware ⌘/Ctrl+K hint | `index.astro` | Readable intro; no mobile jump; correct shortcut per OS. |
| 6 | Full-height hero → `100dvh` | `gallery.astro` | Stable mobile viewport. |
| 7 | Mobile drawer: slide/fade transition, body scroll-lock, live backdrop, close on link-click + Escape | `Navigation.astro` | A finished, modern mobile menu. |
| 8 | `RandomQuote` → `client:idle` | `index.astro` | Defer non-critical hydration. |

## C. Out of scope (recommended follow-ups)
- Gate Lenis smooth-scroll (`SmoothScroll.astro`, ~50 kB gzip) to desktop; native momentum
  is better on mobile.
- Token cleanup of hardcoded colors (#11) and the filter reflow (#12).
- Gallery currently shows empty states; when images are added use Astro `<Image>` with
  `loading="lazy"` + explicit dimensions.

## D. Acceptance
- Mobile/touch loads **without** downloading Three.js or running the cursor canvas;
  desktop visuals unchanged.
- Background animations stop in hidden tabs.
- Tertiary text passes AA; homepage intro reads at base size.
- Mobile menu animates, locks scroll, and closes on navigation/Escape.
- No `100vh` on first-paint full-height sections.
- `npm run build` succeeds.
