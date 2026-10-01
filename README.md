# isabelleqywang.github.io

Personal site of Qiuyi (Isabelle) Wang — built with [Astro](https://astro.build) and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

```sh
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # checks photos for GPS data, then builds to dist/
```

## Where things live

| What | Where |
| --- | --- |
| Blog posts | `content/posts/*.md` |
| Astrophotography | `content/observatory/` (one `.md` + its image per photo) |
| Travel photos | `content/voyages/` (one `.md` + its photo per stop) |
| Home page text | `src/pages/index.astro` |
| Project constellation | `src/components/ProjectConstellation.astro` |
| Moon-phase navigation | `src/lib/phases.ts` |

## Writing a post

Add a Markdown file to `content/posts/`. The file name becomes the URL (`my-post.md` → `/writing/my-post/`).

~~~md
---
title: "Post title"
date: 2026-10-01
summary: "One or two sentences — used in the list, RSS and search results."
tags: [technical-notes, backend]
draft: false
---

Your text in Markdown. Code blocks get syntax highlighting:

```python
print("hello")
```
~~~

Set `draft: true` to keep a post out of the published site. The RSS feed (`/rss.xml`) and sitemap update automatically.

## Adding an astrophotograph

Put the image (JPG/PNG/WebP, any size — it is resized automatically) in `content/observatory/`, next to a Markdown file with the same name:

```md
---
title: Orion Nebula
target: M42 · Orion
date: 2026-01-12
image: ./m42.jpg
alt: The Orion Nebula's glowing gas clouds around a bright star cluster
location: Upstate New York            # optional
equipment: 80 mm refractor, ZWO ASI533 # optional
exposure: 90 × 120 s, gain 100         # optional
---

Optional notes about the session.
```

## Adding a travel stop

Same idea in `content/voyages/`. Stops are joined into a constellation in date order.

```md
---
place: Kyoto
date: 2025-04-03
photo: ./kyoto.jpg
alt: Lanterns along a narrow street at dusk
caption: Optional one-line caption.
x: 40   # optional position in the sky, 0–100
y: 30
---
```

Delete the `sample-*` files when you add your own.

## Photos and privacy

The repository is public, so **original photo files can be downloaded by anyone** — not just the resized versions on the site. Phones and cameras often embed GPS coordinates.

- Export photos without location before adding them (iPhone: Share → Options → turn off Location; Lightroom: Export → Metadata → Remove Location Info).
- `npm run build` (and the deploy workflow) runs `scripts/check-photo-privacy.mjs`, which **fails the deploy** and names any photo in `content/` that still contains GPS data.
- The published images never carry EXIF; the build re-encodes them.

## NASA imagery

`tools/nasa.py` (run by `.github/workflows/nasa-images.yml`) downloads NASA imagery listed in `tools/picks.txt` into `public/assets/`. Credits are listed in the site footer.
