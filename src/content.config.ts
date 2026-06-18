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
  }),
});

export const collections = {
  'case-studies': caseStudies,
};
