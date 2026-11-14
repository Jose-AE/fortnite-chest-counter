import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Link previews need a full image URL. Vercel gives the build its domain without the https:// part;
// anywhere else (a local build) this is empty and the image path stays relative.
const domain =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = domain ? `https://${domain}` : "";

// vercel.json caches /_framework forever. Every file there has a content hash in its name except dotnet.js,
// so the worker loads it as dotnet.js?v=<its hash>. dotnet.js lists the other files' names, so any .NET change changes it.
let dotnetHash = "dev";
try {
  dotnetHash = createHash("sha256")
    .update(readFileSync("public/_framework/dotnet.js"))
    .digest("hex")
    .slice(0, 12);
} catch {
  // no `npm run build:wasm` yet: keep "dev"
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "site-url",
      transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", siteUrl),
    },
  ],
  define: {
    "import.meta.env.VITE_DOTNET_HASH": JSON.stringify(dotnetHash),
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
