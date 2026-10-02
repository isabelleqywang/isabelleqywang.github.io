import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Writing: one Markdown file per post in content/posts/
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Observatory: one Markdown file per astrophotograph, image next to it in content/observatory/
const observatory = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/observatory" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      target: z.string(),
      date: z.coerce.date(),
      image: image(),
      alt: z.string(),
      location: z.string().optional(),
      equipment: z.string().optional(),
      exposure: z.string().optional(),
      credit: z.string().optional(),
    }),
});

// Voyages: one Markdown file per stop in content/voyages/, connected in date order
const voyages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/voyages" }),
  schema: ({ image }) =>
    z.object({
      place: z.string(),
      date: z.coerce.date(),
      photo: image(),
      alt: z.string(),
      caption: z.string().optional(),
      // optional position in the sky, 0 to 100 on each axis; omitted stops are placed automatically
      x: z.number().min(0).max(100).optional(),
      y: z.number().min(0).max(100).optional(),
    }),
});

export const collections = { posts, observatory, voyages };
