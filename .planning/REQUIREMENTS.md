# Requirements: aryansingh.org

**Defined:** 2026-01-24
**Core Value:** "I've never seen a site like this" — creative uniqueness as the first impression

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Homepage

- [ ] **HOME-01**: User sees WebGL particle background with Three.js animation
- [ ] **HOME-02**: User sees kinetic typography animation revealing name and tagline
- [ ] **HOME-03**: User experiences GSAP ScrollTrigger reveal animations on scroll
- [ ] **HOME-04**: User can browse featured projects in a carousel
- [ ] **HOME-05**: User sees preview of 3 most recent blog posts
- [ ] **HOME-06**: User sees "Currently" widget showing reading/building/thinking
- [ ] **HOME-07**: User experiences custom cursor effects on hover interactions
- [ ] **HOME-08**: User experiences Lenis smooth scrolling throughout

### Portfolio

- [ ] **PORT-01**: User sees projects automatically fetched from GitHub API
- [ ] **PORT-02**: User sees repo stats: stars, language, description, last updated
- [ ] **PORT-03**: User can filter projects by all/pinned/language/topic
- [ ] **PORT-04**: User can view detailed project write-ups (manual overrides)
- [ ] **PORT-05**: User sees project detail pages with problem/solution/tech/learnings/demo
- [ ] **PORT-06**: User sees projects in masonry grid layout

### Blog

- [ ] **BLOG-01**: User can read blog posts written in MDX
- [ ] **BLOG-02**: User can distinguish post types (paper-summary, technical, reflection, update)
- [ ] **BLOG-03**: User sees consistent frontmatter (title, date, category, tags, description)
- [ ] **BLOG-04**: User sees auto-generated table of contents for h2/h3 headings
- [ ] **BLOG-05**: User sees estimated reading time for each post
- [ ] **BLOG-06**: User sees syntax-highlighted code blocks with copy button (Shiki)
- [ ] **BLOG-07**: User can filter posts by tag and search
- [ ] **BLOG-08**: User can subscribe via RSS feed

### Resume

- [ ] **RESM-01**: User sees interactive HTML resume with collapsible sections
- [ ] **RESM-02**: User sees timeline visualization of experience
- [ ] **RESM-03**: User sees skills displayed with custom iconography (not progress bars)
- [ ] **RESM-04**: User can download PDF resume
- [ ] **RESM-05**: User can print resume with optimized CSS

### Navigation & UX

- [ ] **NAVX-01**: User can open command palette with Cmd+K for quick navigation
- [ ] **NAVX-02**: User can toggle theme (light/dark/auto) with custom color schemes
- [ ] **NAVX-03**: User sees reading progress bar on blog posts
- [ ] **NAVX-04**: User experiences animated page transitions
- [ ] **NAVX-05**: User can click back to top button with smooth scroll
- [ ] **NAVX-06**: User can navigate on mobile with optimized menu

### Design System

- [ ] **DSGN-01**: Site has complete visual identity (colors, typography, spacing)
- [ ] **DSGN-02**: Site uses CSS variables for theming (3 theme options)
- [ ] **DSGN-03**: Site features experimental/artistic layouts (asymmetric, creative whitespace)
- [ ] **DSGN-04**: Site is fully responsive with mobile-first design

### SEO & Meta

- [ ] **SEOX-01**: Blog posts have dynamic Open Graph images
- [ ] **SEOX-02**: Pages have JSON-LD structured data
- [ ] **SEOX-03**: Site has auto-generated sitemap
- [ ] **SEOX-04**: Pages have meta descriptions from frontmatter

### Infrastructure

- [ ] **INFR-01**: Project uses Astro 4.x with proper configuration
- [ ] **INFR-02**: Interactive components use React islands (minimal hydration)
- [ ] **INFR-03**: Styling uses Tailwind utilities + custom CSS with variables
- [ ] **INFR-04**: Project deploys to Cloudflare Pages
- [ ] **INFR-05**: GitHub token configured via environment variables

### About Page

- [ ] **ABUT-01**: User can read about page with personality and background
- [ ] **ABUT-02**: User sees professional but personal narrative

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Research Section

- **RSCH-01**: User can browse research/papers with academic formatting
- **RSCH-02**: User can see citation formatting
- **RSCH-03**: User can access PDF upload links
- **RSCH-04**: User can see "Paper of the month" feature

### Media Gallery

- **MDIA-01**: User can browse photo gallery with lazy loading
- **MDIA-02**: User can view photos in lightbox modal
- **MDIA-03**: User can see video embeds with custom styling
- **MDIA-04**: User can browse monthly collections

### Interactive Features

- **INTR-01**: User can leave messages in guestbook
- **INTR-02**: User can see reading list sidebar across site
- **INTR-03**: User can see Now page with current activities
- **INTR-04**: User can submit contact form (Cloudflare Workers)

### Blog Enhancements

- **BLGE-01**: User sees footnotes with margin notes on desktop
- **BLGE-02**: User sees related posts at bottom of articles

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts/auth | Personal site, no user management needed |
| Comments system | Adds moderation burden, use social for discussion |
| Analytics dashboard | Use Cloudflare Analytics or Plausible directly |
| CMS admin interface | Edit content in code, keep simple |
| Real-time features | Static site approach, no WebSocket needs |
| E-commerce | Not selling anything on this site |
| Multi-language i18n | English only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| INFR-05 | Phase 1 | Pending |
| DSGN-01 | Phase 2 | Pending |
| DSGN-02 | Phase 2 | Pending |
| DSGN-03 | Phase 2 | Pending |
| DSGN-04 | Phase 2 | Pending |
| (remaining to be mapped) | — | — |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 9
- Unmapped: 30 (to be completed by roadmapper)

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after initial definition*
