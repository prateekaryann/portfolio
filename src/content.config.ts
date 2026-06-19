import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    publishedAt: z.string(),
    stack: z.array(z.string()),
    order: z.number().default(99),
    featured: z.boolean().default(true),
    accent: z.enum(['violet', 'cyan', 'indigo', 'amber', 'teal', 'pink']).default('violet'),
    metric: z.string().optional(),
    metricLabel: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),                 // display name, e.g. "documind"
    tagline: z.string(),               // one-liner — card + page subtitle
    description: z.string(),           // meta / OG description
    stack: z.array(z.string()),
    github: z.string().url(),
    live: z.string().url().optional(),
    glyph: z.string(),                 // key into GLYPHS (src/lib/covers.ts)
    accent: z.enum(['violet', 'cyan', 'indigo', 'amber', 'teal', 'pink']).default('violet'),
    banner: z.string().optional(),       // /projects/<slug>/banner.png (Canva)
    demoVideo: z.string().optional(),    // /projects/<slug>/demo.mp4
    demoPoster: z.string().optional(),   // /projects/<slug>/poster.png
    architecture: z.string().optional(), // /projects/<slug>/architecture.png
    order: z.number().default(99),
    featured: z.boolean().default(true),
  }),
});

export const collections = {
  'case-studies': caseStudies,
  projects,
};
