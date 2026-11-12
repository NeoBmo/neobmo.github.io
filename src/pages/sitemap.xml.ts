import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { href } from "../lib/url";

/** Mapa del sitio: la portada y cada página de detalle que existe. */
export const GET: APIRoute = async ({ site }) => {
  // Las mismas reglas que las páginas: una sección sin cuerpo no tiene la suya.
  const sections = (await getCollection("sections")).filter(({ body }) => body?.trim());
  const projects = await getCollection("projects");
  const paths = [
    "",
    ...sections.map(({ id }) => `${id}/`),
    ...projects.map(({ id }) => `proyectos/${id}/`),
  ];
  const urls = paths.map((path) => `  <url><loc>${new URL(href(path), site)}</loc></url>`);

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
