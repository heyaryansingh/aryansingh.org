/**
 * Content Collections Configuration
 *
 * This file defines the schema for all content collections used on the site.
 * Each collection type (blog, projects, research, media) has its own schema.
 *
 * HOW TO ADD CONTENT:
 *
 * Blog Posts:
 *   Create a new .mdx file in src/content/blog/
 *   Example: src/content/blog/my-first-post.mdx
 *
 * Projects:
 *   Create a new .mdx file in src/content/projects/
 *   These override/supplement GitHub API data
 *   Example: src/content/projects/my-cool-project.mdx
 *
 * Research:
 *   Create a new .mdx file in src/content/research/
 *   Example: src/content/research/paper-summary-gpt4.mdx
 *
 * Media:
 *   Create a new .json or .mdx file in src/content/media/
 *   Example: src/content/media/january-2026.mdx
 */

import { defineCollection, z } from 'astro:content';

// Blog post types - used for filtering and styling
const postTypes = ['paper-summary', 'technical', 'reflection', 'monthly-update'] as const;

// Blog collection schema
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),

    // Post categorization
    type: z.enum(postTypes).default('reflection'),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),

    // Display options
    coverImage: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),

    // SEO
    canonicalUrl: z.string().url().optional(),
  }),
});

// Project categories — keys drive filtering; labels/icons live in src/lib/projects.ts
const projectCategories = [
  'ai',
  'quantum',
  'biotech',
  'trading',
  'devtools',
  'automation',
] as const;

const projectStatus = ['active', 'research', 'complete'] as const;

// Projects collection schema (single source of truth for the portfolio)
const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),
    tagline: z.string(),
    category: z.enum(projectCategories),

    // Links
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    npm: z.string().url().optional(),
    closedSource: z.boolean().default(false),

    // Project details
    problem: z.string().optional(),
    solution: z.string().optional(),
    techStack: z.array(z.string()).default([]),
    metrics: z.array(z.string()).default([]),
    learnings: z.array(z.string()).default([]),

    // Categorization / status
    status: z.enum(projectStatus).default('active'),
    year: z.string().optional(),

    // Display options
    coverImage: z.string().optional(),
    featured: z.boolean().default(false),
    pinned: z.boolean().default(false),
    order: z.number().default(0),

    // Dates
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),

    // Override GitHub data if needed
    overrideGithub: z.boolean().default(false),
  }),
});

// Research/papers collection schema
const researchCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),

    // Paper details
    authors: z.array(z.string()).default([]),
    publication: z.string().optional(),
    pdfUrl: z.string().url().optional(),
    arxivUrl: z.string().url().optional(),

    // Categorization
    tags: z.array(z.string()).default([]),
    paperOfTheMonth: z.boolean().default(false),

    // Display
    coverImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Media collection schema
const mediaCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),

    // Media items
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
      exif: z.object({
        camera: z.string().optional(),
        lens: z.string().optional(),
        aperture: z.string().optional(),
        shutter: z.string().optional(),
        iso: z.string().optional(),
        location: z.string().optional(),
      }).optional(),
    })).default([]),

    videos: z.array(z.object({
      src: z.string(),
      title: z.string(),
      type: z.enum(['youtube', 'vimeo', 'local']).default('local'),
    })).default([]),

    // Display
    featured: z.boolean().default(false),
  }),
});

// Reads collection — books, with optional long-form personal notes in the body.
// Frontmatter = structured metadata; MDX body = my own thoughts/review (optional).
const readsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    type: z.string().default('book'),
    status: z.enum(['reading', 'completed']),

    // Dates (ISO strings, e.g. 2026-05-27)
    startedDate: z.coerce.date().optional(),
    finishedDate: z.coerce.date().optional(),

    // Where to find it online
    link: z.string().url(),

    // One-paragraph factual summary of the book
    overview: z.string(),

    // Factual genre/theme classification
    tags: z.array(z.string()).default([]),

    // My personal rating (0–5). Optional — left unset until I decide.
    rating: z.number().min(0).max(5).optional(),

    // Cover/spine accent colour for the (image-free) visual treatment
    spine: z.string().default('#4A5FBD'),

    // Manual sort override within a section (higher = first)
    order: z.number().default(0),
  }),
});

export const collections = {
  blog: blogCollection,
  projects: projectsCollection,
  research: researchCollection,
  media: mediaCollection,
  reads: readsCollection,
};
