import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

/** Published posts, newest first. Drafts show up only in `astro dev`. */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection("posts", (p) => import.meta.env.DEV || !p.data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function readingMinutes(post: Post): number {
  const words = (post.body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const tagLabel = (t: string) => t.replace(/-/g, " ");
