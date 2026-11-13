import { clamp } from "./ascii/math";

/** Segundos que tarda cada letra, y la pausa entre una línea y la siguiente. */
const LETTER = 0.055;
const LINE_PAUSE = 0.45;

/** Lo que tarda en escribirse el saludo entero. */
export const typingTime = (lines: readonly string[]) =>
  lines.reduce((total, line) => total + line.length * LETTER, 0) +
  Math.max(lines.length - 1, 0) * LINE_PAUSE;

/** Cada línea tal como va a los `seconds` de empezar: se escriben una tras otra. */
export function typedAt(lines: readonly string[], seconds: number) {
  let left = seconds;
  return lines.map((line) => {
    const typed = line.slice(0, clamp(Math.floor(left / LETTER), 0, line.length));
    left -= line.length * LETTER + LINE_PAUSE;
    return typed;
  });
}
