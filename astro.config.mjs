import { defineConfig } from "astro/config";

// SITE_URL and BASE_PATH are provided by the Pages workflow, so the same
// build works under a project path or the root user domain.
export default defineConfig({
  site: process.env.SITE_URL ?? "https://neobmo.github.io",
  base: process.env.BASE_PATH ?? "/",
  // El CSS es pequeño (~2 KB): dentro del HTML se ahorra una petición que
  // bloquea el primer pintado, que en una red lenta cuesta segundos.
  build: { inlineStylesheets: "always" },
});
