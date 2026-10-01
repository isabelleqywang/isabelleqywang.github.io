import rss from "@astrojs/rss";
import { getPosts } from "../lib/posts";

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: "Isabelle Wang — Writing",
    description: "Project retrospectives, technical notes and reading notes.",
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.summary,
      categories: p.data.tags,
      link: `/writing/${p.id}/`,
    })),
    customData: "<language>en-us</language>",
  });
}
