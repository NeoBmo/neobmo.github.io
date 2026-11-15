import { createRandom } from "./ascii/math";

/** Ritmo de la terminal, en segundos: cada letra y cada borrado. */
const LETTER = 0.04;
const ERASE = 0.025;
/** Cuánto varía cada pulsación, en proporción: escribir a mano no es un metrónomo. */
const JITTER = 0.6;
/** Pausas: tras una coma, antes de empezar a borrar y después de borrar. */
const COMMA_PAUSE = 0.18;
const BEFORE_ERASE = 0.45;
const AFTER_ERASE = 0.15;

/** Lo que muestra la terminal desde el segundo `at`. */
export interface Keystroke {
  at: number;
  text: string;
}

/**
 * Las pulsaciones que escriben cada toma de `takes`, en orden. De una a la
 * siguiente solo se borra hasta lo que comparten: «hola, soy NeoBmo» vuelve a
 * «hola, » y sigue desde ahí. La secuencia es siempre la misma: el ritmo es parte
 * de la obra.
 */
export function keystrokes(takes: readonly string[]): Keystroke[] {
  const random = createRandom(7);
  const strokes: Keystroke[] = [];
  let text = "";
  let at = 0;

  const press = (next: string, pace: number) => {
    at += pace * (1 + (random() - 0.5) * JITTER);
    text = next;
    strokes.push({ at, text });
  };

  takes.forEach((take, index) => {
    if (index > 0) {
      let shared = 0;
      while (shared < text.length && text[shared] === take[shared]) shared++;
      at += BEFORE_ERASE;
      while (text.length > shared) press(text.slice(0, -1), ERASE);
      at += AFTER_ERASE;
    }
    for (let letter = text.length; letter < take.length; letter++) {
      press(take.slice(0, letter + 1), LETTER);
      if (take[letter] === ",") at += COMMA_PAUSE;
    }
  });

  return strokes;
}

/** Lo que muestra la terminal a los `seconds` de empezar a escribir. */
export function typedAt(strokes: readonly Keystroke[], seconds: number) {
  let shown = "";
  for (const { at, text } of strokes) {
    if (at > seconds) break;
    shown = text;
  }
  return shown;
}
