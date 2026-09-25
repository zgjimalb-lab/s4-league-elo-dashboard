import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@data": path.resolve(import.meta.dirname, "data"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Bibliotheken und Match-Daten getrennt cachen: ein Daten-Update lädt nur den kleinen Daten-Chunk neu
        manualChunks: (id) =>
          id.includes("/data/matches.json") ? "matches" : id.includes("node_modules") ? "vendor" : undefined,
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 3000,
  },
});
