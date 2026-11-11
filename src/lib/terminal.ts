import { clamp } from "./ascii/math";

const GREETING = "hola, soy NeoBmo";

/** Punto del scroll tras el logo (0–1) en que el saludo queda escrito. */
const TYPED = 0.45;

/** La línea depende solo del progreso, así que subir la "desescribe" sin guardar estado. */
export function lineAt(progress: number) {
  return GREETING.slice(0, Math.round(GREETING.length * clamp(progress / TYPED)));
}
