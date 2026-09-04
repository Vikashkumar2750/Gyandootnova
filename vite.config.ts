import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Compute a stable build id at config-load time so it is embedded in the
// client bundle. Falls back to an ISO timestamp for local dev builds.
const BUILD_ID =
  process.env.VITE_BUILD_ID ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Layer folders (frontend/, backend/, database/) are navigation views that
    // symlink to the real source dirs — don't watch them twice.
    watch: {
      ignored: ["**/frontend/**", "**/backend/**", "**/database/**"],
    },
    fs: { allow: [path.resolve(__dirname)] },
  },

  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Split large vendor libs into their own chunks so first-page load
        // doesn't pull in the entire admin/editor surface.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("react-router")) return "router";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("sonner")) return "ui-vendor";
          if (id.includes("@supabase") || id.includes("@tanstack/react-query")) return "data-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("dompurify") || id.includes("marked") || id.includes("dayjs") || id.includes("date-fns")) return "utils";
          if (id.includes("lucide-react")) return "icons";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
