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

// Projects collection schema (for manual project write-ups)
const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),

    // Links
    github: z.string().url().optional(),
    demo: z.string().url().optional(),

    // Project details
    problem: z.string().optional(),
    solution: z.string().optional(),
    techStack: z.array(z.string()).default([]),
    learnings: z.array(z.string()).default([]),

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

export const collections = {
  blog: blogCollection,
  projects: projectsCollection,
  research: researchCollection,
  media: mediaCollection,
};
