import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SYMBOL_NAMES } from "./lib/symbols";

/**
 * Every entry has two depths: the frontmatter `summary` is what the home
 * page shows at a glance; the Markdown body is the full story on its own
 * page, for whoever wants to go further.
 */

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    status: z.enum(["activo", "en desarrollo", "piloto", "próximamente"]),
    /** The strength this project proves. */
    strength: z.string(),
    summary: z.string(),
    /** Tecnologías, solo las que el proyecto ya usa. */
    stack: z.array(z.string()).default([]),
    repo: z.url().optional(),
    /** Dónde se puede abrir el proyecto, si es público. */
    site: z.url().optional(),
    /** Figura que forman los caracteres del lienzo al llegar al proyecto. */
    symbol: z.enum(SYMBOL_NAMES),
    order: z.number(),
  }),
});

const sections = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/sections" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    /** Etiqueta breve sobre el título. */
    kicker: z.string().optional(),
    /** Pasos de un recorrido, en orden. */
    steps: z.array(z.string()).default([]),
    repo: z.url().optional(),
    /** Figura que forman los caracteres del lienzo al llegar a la sección. */
    symbol: z.enum(SYMBOL_NAMES).optional(),
    /** Enlaces de contacto. */
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    /** La sección va después de los proyectos y no antes. */
    afterProjects: z.boolean().default(false),
    /** Es el final de la página: al llegar, el lienzo vuelve a la pintura. */
    finale: z.boolean().default(false),
    order: z.number(),
  }),
});

export const collections = { projects, sections };
