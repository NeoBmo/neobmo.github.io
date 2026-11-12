import { clamp } from "./ascii/math";

export const GREETING = "hola, soy NeoBmo";

/** Punto del scroll tras el logo (0–1) en que el saludo queda escrito. */
const TYPED = 0.45;
/** Parte de la llegada a una escena en que aún se lee la línea de la anterior. */
export const HANDOVER = 0.25;
/** Parte de la llegada que tarda en escribirse el comando de la escena. */
const TYPING = 0.5;

/** La línea depende solo del progreso, así que subir la "desescribe" sin guardar estado. */
export function lineAt(progress: number) {
  return GREETING.slice(0, Math.round(GREETING.length * clamp(progress / TYPED)));
}

/**
 * Qué muestra la terminal mientras llega la línea `index` (de 1 en adelante):
 * primero sigue la anterior; después pasa a ser historial y la nueva se escribe.
 */
export function narrate(lines: readonly string[], index: number, arrived: number) {
  const previous = lines[index - 1] ?? "";
  if (arrived < HANDOVER) return { line: previous, echo: lines[index - 2] ?? "" };
  const next = lines[index] ?? "";
  const typed = Math.round(next.length * clamp((arrived - HANDOVER) / TYPING));
  return { line: next.slice(0, typed), echo: previous };
}
