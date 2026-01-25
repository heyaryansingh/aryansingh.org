# aryansingh.org

## What This Is

A highly custom, experimental personal website that showcases Aryan Singh's technical work, research, writing, and personality. Built with Astro, React islands, and advanced animations (GSAP, Three.js), it prioritizes creative uniqueness over convention—the site itself is a design statement, not a template.

## Core Value

**"I've never seen a site like this."** The site must be visually memorable and creatively unique. Everything else can be compromised; the distinctive design impression cannot.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Homepage & Hero:**
- [ ] WebGL particle background using Three.js via React island
- [ ] Kinetic typography animation revealing name and tagline
- [ ] GSAP ScrollTrigger reveal animations for sections
- [ ] Featured projects carousel
- [ ] Latest blog posts preview (3 most recent)
- [ ] "Currently" widget (reading/building/thinking)
- [ ] Custom cursor effect on hover interactions
- [ ] Lenis smooth scrolling

**Portfolio/Projects:**
- [ ] GitHub API integration to fetch public repos automatically
- [ ] Display repo stats: stars, language, description, last updated
- [ ] Filter by: all/pinned/language/topic
- [ ] Manual project overrides via content/projects/ for detailed write-ups
- [ ] Project detail pages: problem, solution, tech stack, learnings, demo, GitHub
- [ ] Masonry grid layout

**Blog System:**
- [ ] Astro content collections with MDX
- [ ] Post types: paper-summary, technical, reflection, monthly-update
- [ ] Frontmatter: title, date, category, tags, description, coverImage
- [ ] Auto-generated table of contents for h2/h3
- [ ] Reading time calculation
- [ ] Shiki syntax highlighting with copy button
- [ ] Footnotes with margin notes on desktop
- [ ] Related posts at bottom
- [ ] Tag filtering and search
- [ ] RSS feed generation

**About & Resume:**
- [ ] About page with personality and background
- [ ] Interactive HTML resume with collapsible sections
- [ ] Timeline visualization of experience
- [ ] Skills with custom iconography (not progress bars)
- [ ] PDF download button
- [ ] Print-optimized CSS

**Navigation & UX:**
- [ ] Command palette (Cmd+K) for quick navigation
- [ ] Theme toggle: light/dark/auto with custom color schemes
- [ ] Reading progress bar on blog posts
- [ ] Back to top button with smooth scroll
- [ ] Mobile-optimized navigation
- [ ] Page transition animations

**Design System:**
- [ ] Complete visual identity: colors, typography, spacing
- [ ] CSS variables for theming (3 theme options)
- [ ] Experimental/artistic but readable layouts
- [ ] Asymmetric grids and creative whitespace
- [ ] Responsive mobile-first design

**SEO & Meta:**
- [ ] Dynamic Open Graph images for blog posts
- [ ] JSON-LD structured data
- [ ] Sitemap generation
- [ ] Meta descriptions from frontmatter

**Infrastructure:**
- [ ] Astro 4.x with React islands
- [ ] Tailwind for spacing/layout only
- [ ] Custom CSS with CSS variables for theming
- [ ] Cloudflare Pages deployment
- [ ] Environment variable setup for GITHUB_TOKEN

### Out of Scope (v1)

- Research/Papers section — Defer to v2 after blog is solid
- Media Gallery — Nice-to-have, not core to first impression
- Guestbook — Fun but not essential for launch
- Now page — Can be added quickly later
- Reading List Sidebar — Defer until content workflow established
- Contact Form with Cloudflare Workers — Can use mailto initially
- Admin moderation for guestbook — v2 feature

## Context

**Technical Environment:**
- Astro 4.x as static site generator with React islands for interactivity
- GSAP + ScrollTrigger for scroll-based animations
- Lenis for smooth scrolling
- Three.js for WebGL particle effects (React island)
- Shiki for code syntax highlighting
- MDX for rich blog content
- GitHub REST API for dynamic project fetching
- Target deployment: Cloudflare Pages

**Design Direction:**
- Experimental/artistic but still readable and accessible
- Editorial/magazine influence with bold typography
- Avoid: generic dev portfolios, corporate SaaS vibes, unreadable brutalism
- The design should feel custom-crafted, not template-derived
- Balance polish with personality

**Content Strategy:**
- System-first approach: build infrastructure, populate content later
- Clear editing workflows with extensive comments
- Demo/placeholder content for initial development
- JSON files for easily editable data (reading list, now page, social links)

## Constraints

- **Framework**: Astro 4.x with React islands only — no full SPA
- **Styling**: Custom CSS + CSS variables primary, Tailwind utilities for spacing only
- **Animations**: GSAP + Lenis — no other animation libraries
- **Content**: MDX with YAML frontmatter — standard Astro content collections
- **Deployment**: Cloudflare Pages — must work with their build system
- **Performance**: Static-first, hydrate only what needs interactivity

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Astro over Next.js | Static-first, better performance for content site | — Pending |
| React islands over full React | Minimal JS, hydrate only interactive parts | — Pending |
| GSAP over Framer Motion | More control for experimental animations | — Pending |
| Three.js for particle hero | WebGL required for the signature effect | — Pending |
| Custom CSS over Tailwind-only | Need full control for unique design | — Pending |
| GitHub API fetch at build | Fresh data each deploy, no runtime API calls | — Pending |

---
*Last updated: 2026-01-24 after initialization*
