import type { APIRoute } from "astro";
import { href } from "../lib/url";

/** Deja pasar a los buscadores y les dice dónde está el mapa del sitio. */
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(href("sitemap.xml"), site)}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
