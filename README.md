<p align="center">
  <img src="assets/banner.svg" width="100%" alt="El logo \|° en rosa sobre negro, junto a «NeoBmo, portafolio v6 · React + GSAP» y una etiqueta «archivado».">
</p>

# NeoBmo · portafolio v6

**La versión 6 de mi portafolio, en React y GSAP. Ya no es la actual.** La v7 es una
página coreografiada en caracteres, hecha con Astro:
[neobmo.github.io](https://neobmo.github.io) ·
[su código](https://github.com/NeoBmo/neobmo.github.io).

> [!NOTE]
> Sin commits desde el 2026-05-26 y sin publicar. Queda como registro de la v6, no
> como proyecto activo.

## Qué era

Una sola página oscura (`#050505`), con un único acento rosa (`#fb64b6`) y
JetBrains Mono en todo el texto. Cuatro vistas en `src/views/`: Hero, About, Skills
y Contact. El movimiento iba con GSAP, y los fondos animados con WebGL: `Silk` y
`Antigravity` con Three.js, `Particles` con OGL.

<!-- TODO: captura de la portada de la v6. Compilar el último commit con `npm run build`, servir `dist/` y capturar a 1280 px y a 375 px. -->

## Arrancarla en local

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias |
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | Genera el sitio en `dist/` |
| `npm run lint` | Revisa el código con ESLint |

<details>
<summary>Dependencias principales</summary>

React 19, Vite 6, Tailwind CSS 4, GSAP 3, Three.js con `@react-three/fiber` y OGL.
La lista completa está en `package.json`.

</details>

---

Hecho por Luis Rodríguez · [neobmo.github.io](https://neobmo.github.io)
