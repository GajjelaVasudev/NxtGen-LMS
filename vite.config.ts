import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./Server";  // Changed "./Server" to "./server" (lowercase) — adjust if needed

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: "./src",  // 👈 Set root to src

  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [path.resolve(__dirname, "src"),
      path.resolve(__dirname, "shared"),],  // 👈 Allow serving files from src and shared
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },

  build: {
    outDir: "../dist/spa",  // 👈 Because root is now src, build output is one level up
  },

  plugins: [react(), expressPlugin()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  // 👈 Alias @ to src
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
