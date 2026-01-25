# Roadmap: aryansingh.org

**Created:** 2026-01-24
**Depth:** comprehensive
**Core Value:** "I've never seen a site like this" — creative uniqueness as the first impression

## Overview

| Phase | Name | Goal | Requirements | Success Criteria |
|-------|------|------|--------------|------------------|
| 1 | Foundation | Astro project configured and ready for development | INFR-01, INFR-02, INFR-03, INFR-04, INFR-05 | 5 |
| 2 | Design System | Complete visual identity with theming support | DSGN-01, DSGN-02, DSGN-03, DSGN-04 | 4 |
| 3 | Layout & Navigation | Base layouts and mobile navigation functional | NAVX-06 | 3 |
| 4 | Homepage Foundation | Basic homepage structure with content sections | HOME-04, HOME-05, HOME-06, HOME-08 | 4 |
| 5 | Homepage Hero | Signature WebGL particle effect and kinetic animations | HOME-01, HOME-02, HOME-03, HOME-07 | 4 |
| 6 | Portfolio System | GitHub-powered project showcase with filtering | PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06 | 5 |
| 7 | Blog Foundation | MDX blog system with content collections | BLOG-01, BLOG-02, BLOG-03 | 3 |
| 8 | Blog Features | Advanced blog features and discoverability | BLOG-04, BLOG-05, BLOG-06, BLOG-07, BLOG-08 | 5 |
| 9 | Resume & About | Interactive resume and personal narrative | RESM-01, RESM-02, RESM-03, RESM-04, RESM-05, ABUT-01, ABUT-02 | 5 |
| 10 | UX Polish | Command palette, theme toggle, and micro-interactions | NAVX-01, NAVX-02, NAVX-03, NAVX-04, NAVX-05 | 5 |
| 11 | SEO & Meta | Search engine optimization and social sharing | SEOX-01, SEOX-02, SEOX-03, SEOX-04 | 4 |

## Phases

### Phase 1: Foundation

**Goal:** Astro project is configured with all dependencies, build tools, and deployment pipeline ready for development

**Requirements:**
- INFR-01: Project uses Astro 4.x with proper configuration
- INFR-02: Interactive components use React islands (minimal hydration)
- INFR-03: Styling uses Tailwind utilities + custom CSS with variables
- INFR-04: Project deploys to Cloudflare Pages
- INFR-05: GitHub token configured via environment variables

**Success Criteria:**
1. User can run `npm run dev` and see a basic Astro page at localhost
2. User can create a React island component and see it hydrate in browser
3. User can use both Tailwind utilities and custom CSS variables in components
4. User can deploy to Cloudflare Pages and see the site live
5. User can access GitHub API using environment variable token

**Dependencies:** None

---

### Phase 2: Design System

**Goal:** Complete visual identity established with theming system, typography, and experimental layouts ready to use

**Requirements:**
- DSGN-01: Site has complete visual identity (colors, typography, spacing)
- DSGN-02: Site uses CSS variables for theming (3 theme options)
- DSGN-03: Site features experimental/artistic layouts (asymmetric, creative whitespace)
- DSGN-04: Site is fully responsive with mobile-first design

**Success Criteria:**
1. User sees consistent colors, fonts, and spacing across all pages
2. User can switch between 3 distinct theme variations (light/dark/auto modes)
3. User experiences unique, artistic layouts with asymmetric grids and intentional whitespace
4. User sees responsive design that adapts from mobile (320px) to desktop (1920px+)

**Dependencies:** Phase 1 (Foundation)

---

### Phase 3: Layout & Navigation

**Goal:** Site-wide layouts and mobile-optimized navigation provide consistent structure across all pages

**Requirements:**
- NAVX-06: User can navigate on mobile with optimized menu

**Success Criteria:**
1. User sees consistent header and footer across all pages
2. User can open and close mobile navigation menu with smooth animation
3. User can navigate to all main sections (home, portfolio, blog, resume, about) from any page

**Dependencies:** Phase 2 (Design System)

---

### Phase 4: Homepage Foundation

**Goal:** Homepage displays core content sections with smooth scrolling and featured content

**Requirements:**
- HOME-04: User can browse featured projects in a carousel
- HOME-05: User sees preview of 3 most recent blog posts
- HOME-06: User sees "Currently" widget showing reading/building/thinking
- HOME-08: User experiences Lenis smooth scrolling throughout

**Success Criteria:**
1. User experiences buttery-smooth scrolling throughout the entire homepage
2. User can browse featured projects in a working carousel with navigation controls
3. User sees 3 most recent blog posts with titles, dates, and excerpts
4. User sees "Currently" widget showing placeholder or real reading/building/thinking data

**Dependencies:** Phase 3 (Layout & Navigation)

---

### Phase 5: Homepage Hero

**Goal:** Signature WebGL particle background and kinetic typography create memorable first impression

**Requirements:**
- HOME-01: User sees WebGL particle background with Three.js animation
- HOME-02: User sees kinetic typography animation revealing name and tagline
- HOME-03: User experiences GSAP ScrollTrigger reveal animations on scroll
- HOME-07: User experiences custom cursor effects on hover interactions

**Success Criteria:**
1. User sees animated WebGL particle field in the hero background (60fps performance)
2. User sees name and tagline animate in with kinetic typography effect on page load
3. User triggers reveal animations for homepage sections as they scroll
4. User sees custom cursor styling that responds to hover states on interactive elements

**Dependencies:** Phase 4 (Homepage Foundation)

---

### Phase 6: Portfolio System

**Goal:** Dynamic project showcase automatically fetches from GitHub with filtering and detailed write-ups

**Requirements:**
- PORT-01: User sees projects automatically fetched from GitHub API
- PORT-02: User sees repo stats: stars, language, description, last updated
- PORT-03: User can filter projects by all/pinned/language/topic
- PORT-04: User can view detailed project write-ups (manual overrides)
- PORT-05: User sees project detail pages with problem/solution/tech/learnings/demo
- PORT-06: User sees projects in masonry grid layout

**Success Criteria:**
1. User sees live project list fetched from GitHub API at build time
2. User sees accurate repo metadata (stars, language, description, last updated) for each project
3. User can filter projects using interactive controls (all/pinned/language/topic)
4. User can click a project card to view detailed write-up page
5. User sees projects arranged in an attractive masonry grid layout

**Dependencies:** Phase 3 (Layout & Navigation), Phase 1 (INFR-05 for GitHub token)

---

### Phase 7: Blog Foundation

**Goal:** MDX-powered blog system with content collections and post type taxonomy

**Requirements:**
- BLOG-01: User can read blog posts written in MDX
- BLOG-02: User can distinguish post types (paper-summary, technical, reflection, update)
- BLOG-03: User sees consistent frontmatter (title, date, category, tags, description)

**Success Criteria:**
1. User can read blog posts with rich MDX content (headings, lists, code, images)
2. User can identify post type by visual styling or badge (paper-summary, technical, reflection, update)
3. User sees consistent metadata display (title, date, category, tags) on all blog post pages

**Dependencies:** Phase 3 (Layout & Navigation)

---

### Phase 8: Blog Features

**Goal:** Advanced blog features enhance readability and discoverability

**Requirements:**
- BLOG-04: User sees auto-generated table of contents for h2/h3 headings
- BLOG-05: User sees estimated reading time for each post
- BLOG-06: User sees syntax-highlighted code blocks with copy button (Shiki)
- BLOG-07: User can filter posts by tag and search
- BLOG-08: User can subscribe via RSS feed

**Success Criteria:**
1. User sees sticky table of contents that highlights current section while scrolling
2. User sees accurate reading time estimate at the top of each blog post
3. User can copy code snippets with one click from syntax-highlighted code blocks
4. User can filter blog posts by tag and search by title/content
5. User can subscribe to RSS feed in their preferred reader

**Dependencies:** Phase 7 (Blog Foundation)

---

### Phase 9: Resume & About

**Goal:** Interactive resume and personal narrative showcase professional experience and personality

**Requirements:**
- RESM-01: User sees interactive HTML resume with collapsible sections
- RESM-02: User sees timeline visualization of experience
- RESM-03: User sees skills displayed with custom iconography (not progress bars)
- RESM-04: User can download PDF resume
- RESM-05: User can print resume with optimized CSS
- ABUT-01: User can read about page with personality and background
- ABUT-02: User sees professional but personal narrative

**Success Criteria:**
1. User can expand/collapse resume sections (experience, education, skills)
2. User sees visual timeline showing career progression
3. User sees skills represented with custom icons (no generic progress bars)
4. User can download resume as formatted PDF file
5. User sees well-formatted resume when printing or saving as PDF from browser
6. User reads about page that balances professional credibility with personal voice

**Dependencies:** Phase 3 (Layout & Navigation)

---

### Phase 10: UX Polish

**Goal:** Advanced UX features create polished, delightful interactions throughout the site

**Requirements:**
- NAVX-01: User can open command palette with Cmd+K for quick navigation
- NAVX-02: User can toggle theme (light/dark/auto) with custom color schemes
- NAVX-03: User sees reading progress bar on blog posts
- NAVX-04: User experiences animated page transitions
- NAVX-05: User can click back to top button with smooth scroll

**Success Criteria:**
1. User can press Cmd+K (or Ctrl+K) to open command palette for quick navigation
2. User can toggle between light/dark/auto themes with persistence across sessions
3. User sees progress bar indicating scroll position on long blog posts
4. User experiences smooth, tasteful page transition animations when navigating
5. User can click back-to-top button that appears after scrolling down

**Dependencies:** Phase 2 (Design System for theming), Phase 3 (Layout & Navigation)

---

### Phase 11: SEO & Meta

**Goal:** Site is optimized for search engines and generates rich social sharing previews

**Requirements:**
- SEOX-01: Blog posts have dynamic Open Graph images
- SEOX-02: Pages have JSON-LD structured data
- SEOX-03: Site has auto-generated sitemap
- SEOX-04: Pages have meta descriptions from frontmatter

**Success Criteria:**
1. User sees custom Open Graph image when sharing blog post on social media
2. User sees rich snippets in search results from JSON-LD structured data
3. User (search engines) can access auto-generated sitemap at /sitemap.xml
4. User sees accurate meta descriptions in search results from page frontmatter

**Dependencies:** Phase 7 (Blog Foundation for SEOX-01), Phase 3 (Layout & Navigation)

---

## Coverage Validation

**Total v1 requirements:** 48
**Mapped to phases:** 48
**Unmapped:** 0 ✓

### Requirement Mapping

| Phase | Requirements | Count |
|-------|--------------|-------|
| Phase 1 | INFR-01, INFR-02, INFR-03, INFR-04, INFR-05 | 5 |
| Phase 2 | DSGN-01, DSGN-02, DSGN-03, DSGN-04 | 4 |
| Phase 3 | NAVX-06 | 1 |
| Phase 4 | HOME-04, HOME-05, HOME-06, HOME-08 | 4 |
| Phase 5 | HOME-01, HOME-02, HOME-03, HOME-07 | 4 |
| Phase 6 | PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06 | 6 |
| Phase 7 | BLOG-01, BLOG-02, BLOG-03 | 3 |
| Phase 8 | BLOG-04, BLOG-05, BLOG-06, BLOG-07, BLOG-08 | 5 |
| Phase 9 | RESM-01, RESM-02, RESM-03, RESM-04, RESM-05, ABUT-01, ABUT-02 | 7 |
| Phase 10 | NAVX-01, NAVX-02, NAVX-03, NAVX-04, NAVX-05 | 5 |
| Phase 11 | SEOX-01, SEOX-02, SEOX-03, SEOX-04 | 4 |
| **Total** | | **48** |

---
*Roadmap created: 2026-01-24*
