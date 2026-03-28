# aryansingh.org

Personal website and portfolio for Aryan Singh, built with Astro and deployed to Cloudflare.

## What It Includes

- Landing page with animated hero and custom interactive components
- Portfolio, blog, reading list, gallery, and resume pages
- Content collections for blog posts, projects, media, and research
- Cloudflare-ready Astro configuration with sitemap generation

## Stack

- Astro
- React
- Tailwind CSS
- Cloudflare adapter
- GSAP / Three.js for interactive visual elements

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The build output is generated into `dist/`.

## Project Structure

```text
src/
  components/   UI and interactive components
  content/      Blog, project, media, and research content
  data/         Structured JSON data for the site
  layouts/      Shared Astro layouts
  pages/        Route-level pages
  styles/       Global styling and theme files
public/
  images/       Static image assets
  resume/       Resume assets
  videos/       Video assets
```

## Notes

- The repository currently contains generated build output in `dist/`, but it is ignored for source control.
- Some Astro content collections may be intentionally empty depending on what content has been published.
