# NeoBmo

Sitio personal de Luis Rodríguez (NeoBmo), versión 7: un portafolio que se recorre como una obra en terminal.

**En vivo:** https://neobmo.github.io/

## Qué es

Una sola página coreografiada. Un lienzo de caracteres fijo detrás de todo cambia de figura según avanza el visitante:

1. El caos forma *La noche estrellada*, dibujada con caracteres.
2. La pintura se disuelve en el logo `\|°` y el saludo se escribe solo.
3. El logo se deshace en un ruido de caracteres que acompaña toda la página.
4. Cada escena (proyectos, método, contacto) forma su propio símbolo con ese ruido.

La intro corre sola. Después, el visitante no arrastra la página: un gesto pequeño lo lleva a la parada siguiente. El lienzo reacciona al puntero, al tacto, a la velocidad del scroll y a los clics.

## Principios

- **Minimalismo.** Astro, TypeScript y CSS. Sin librerías de UI ni de animación.
- **Rendimiento.** El lienzo se dibuja con WebGL (Canvas 2D de respaldo), mide los fotogramas durante la intro y baja de calidad solo si el equipo no llega. En reposo no dibuja nada.
- **Mejora progresiva.** Sin JavaScript el contenido sigue ahí y los enlaces funcionan. Con `prefers-reduced-motion` no hay raíles ni animación.
- **Cada animación comunica un estado** y anima solo `transform` y `opacity`.

## Stack

- [Astro](https://astro.build) como generador estático.
- TypeScript, CSS y WebGL escritos a mano.
- JetBrains Mono, servida desde el propio sitio.
- GitHub Pages para publicar.

## Desarrollo

Requiere Node 24 (ver `.nvmrc`).

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

`npm run build` verifica los tipos (`astro check`) y genera el sitio en `dist/`. El proyecto no tiene tests automáticos: los cambios se comprueban con esa compilación y en un navegador real, en escritorio, en móvil y con movimiento reducido.

## Estructura

```
src/
  components/   Hero, Backdrop (el lienzo), Sections, Projects, Sheet (ventana de lectura)
  content/      el texto del sitio, en Markdown
  lib/ascii/    motor del lienzo: partículas, formaciones y dibujo en WebGL
  lib/          partitura, símbolos ASCII y el saludo que se escribe solo
  scripts/      lo que corre en el navegador: hero, raíles, índice, ventanas
  pages/        portada, páginas de detalle, 404, robots.txt y sitemap.xml
  styles/       tokens y estilos globales
scripts/        preparación de recursos (pintura e imagen para compartir)
```

## Cómo funciona

- **Una sola partitura.** `src/scripts/hero.ts` lleva un número: 0 es la pintura, 1 el logo, 2 solo ruido y de ahí en adelante un símbolo por escena. La intro lo mueve con el reloj y después lo mueve el scroll; el lienzo lo persigue con suavidad.
- **El lienzo.** `src/lib/ascii/convergence.ts` mueve los caracteres entre formaciones y `glyph-renderer.ts` los dibuja en una sola llamada.
- **Los raíles.** `src/scripts/rails.ts` lleva la rueda y el teclado de parada en parada; el dedo lo encaja el navegador con `scroll-snap`.
- **El saludo.** Se escribe solo bajo el logo y, al abrirse la página, sube a su sitio como título de «Sobre mí».
- **Ventanas de lectura.** «Leer más» abre el texto completo en un `<dialog>` sobre la escena. El enlace sigue apuntando a la página de detalle, que es lo que se abre sin JavaScript.

## Contenido

Todo el texto vive en Markdown, con dos profundidades: el `summary` del frontmatter es lo que se ve en la portada y el cuerpo es la historia completa.

- `src/content/sections/*.md` → secciones (`sobre-mi.md` → `/sobre-mi/`).
- `src/content/projects/*.md` → proyectos (`blog.md` → `/proyectos/blog/`).

Los campos de cada colección están en `src/content.config.ts`. Una sección o un proyecto aparece en el sitio en cuanto existe su archivo.

## Recursos generados

- **Pintura.** `npm run prepare:painting <imagen>` genera, desde una reproducción de *La noche estrellada*, la versión horizontal y una reinterpretación vertical para teléfonos. Cada pantalla descarga solo la que necesita.
- **Imagen para compartir.** `npm run prepare:share` genera `public/share.png` (1200×630) a partir del logo: es la vista previa del enlace en LinkedIn, WhatsApp y similares.

## Despliegue

Cada push a `main` publica en GitHub Pages mediante `.github/workflows/deploy.yml`.

## Licencias

- Código: © Luis Rodríguez.
- JetBrains Mono: SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
- *La noche estrellada* (Vincent van Gogh, 1889): dominio público.
