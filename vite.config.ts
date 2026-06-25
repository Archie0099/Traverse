import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project sites live under /<repo>/, so the CI workflow sets
// BASE_PATH. Locally and on root-domain hosts it defaults to "/".
const base = process.env.BASE_PATH ?? "/";
// Deployed origin (e.g. https://user.github.io), set by CI. Used to make
// og:image / canonical absolute, which social crawlers require.
const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const siteRoot = siteUrl ? siteUrl + base : base;

export default defineConfig({
  base,
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
  plugins: [
    {
      name: "traverse-social-meta",
      transformIndexHtml(html: string): string {
        return html
          .replaceAll("__OG_IMAGE__", siteRoot + "og-image.png")
          .replaceAll("__SITE_URL__", siteRoot);
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Traverse - Algorithm Visualizer",
        short_name: "Traverse",
        description:
          "Interactive pathfinding & sorting algorithm visualizer with a guided learning mode.",
        theme_color: "#0A0C12",
        background_color: "#0A0C12",
        display: "standalone",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
});
