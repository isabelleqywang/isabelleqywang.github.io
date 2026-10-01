import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://isabelleqywang.github.io",
  trailingSlash: "always",
  integrations: [sitemap()],
  vite: {
    // three.js is one large chunk by nature; it only loads on the home page
    build: { chunkSizeWarningLimit: 900 },
  },
  markdown: {
    shikiConfig: { theme: "vitesse-dark", wrap: false },
  },
});
