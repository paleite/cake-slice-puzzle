import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = "/cake-slice-puzzle/";

export default defineConfig({
  base,
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Cake Slice Puzzle",
        short_name: "Cake Puzzle",
        description: "A kawaii isometric cake-slice sorting puzzle.",
        theme_color: "#ffe8d5",
        background_color: "#ffe8d5",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        icons: [
          {
            src: `${base}icon.svg`,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        clientsClaim: true,
      }
    })
  ]
});
