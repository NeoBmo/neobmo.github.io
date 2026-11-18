import landscapeUrl from "../assets/starry-night.webp?url";
import portraitUrl from "../assets/starry-night-portrait.webp?url";

/**
 * Por debajo de esta proporción la composición vertical encaja mejor. La usan
 * el hero, que elige la pintura, y la portada, que la precarga; el CSS repite
 * el valor en `global.css` porque no puede importarlo.
 */
export const PORTRAIT_QUERY = "(max-aspect-ratio: 6/7)";

/**
 * Lo contrario exacto de `PORTRAIT_QUERY`, para precargar sólo una de las dos
 * (con `min-aspect-ratio`, justo en 6/7 se cumplirían ambas).
 */
export const LANDSCAPE_QUERY = `not all and ${PORTRAIT_QUERY}`;

export const PAINTINGS = {
  landscape: { url: landscapeUrl, focus: { x: 0.4, y: 0.5 } },
  portrait: { url: portraitUrl, focus: { x: 0.5, y: 0.5 } },
};
