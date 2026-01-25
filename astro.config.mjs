// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Site URL for sitemap and canonical URLs
  site: 'https://aryansingh.org',

  // Use static output for Cloudflare Pages (SSG with on-demand rendering for API routes)
  output: 'static',

  integrations: [
    react(),
    mdx({
      // Shiki is now built-in to Astro, we'll configure it in the markdown options
    }),
    sitemap(),
  ],

  // Markdown configuration with Shiki syntax highlighting
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    // Optimize dependencies
    ssr: {
      noExternal: ['gsap', 'three'],
    },
  },

  adapter: cloudflare({
    imageService: 'cloudflare',
  }),
});
