import { clamp, lerp } from "./ascii/math";

/** Segundos de la coreografía automática: pintura → contemplación → logo. */
export const DISSOLVE_START = 6.3;
export const DISSOLVE_DURATION = 1.4;
export const LOGO_AT = DISSOLVE_START + DISSOLVE_DURATION;

/** Parte del recorrido de scroll que separa la pintura del logo. */
export const LOGO_SCROLL = 0.12;

/** Quien hace scroll durante la intro la acelera de forma gradual hasta este ritmo. */
export const MAX_RATE = 8;
/** Qué tan rápido el ritmo alcanza su objetivo, por segundo. */
export const RATE_RESPONSE = 2.5;
/** Qué tan rápido los caracteres alcanzan al scroll, por segundo. */
export const STAGE_RESPONSE = 8;

/** Pantallas de scroll, tras el hero, que tarda la línea en subir a horizonte. */
export const HORIZON_SCROLL = 0.6;
/** Milisegundos que el puntero sigue empujando después de su último movimiento. */
export const POINTER_HOLD_MS = 180;
/** Qué tan rápido crece y se apaga el empuje del puntero, por segundo. */
export const POINTER_RESPONSE = 6;
/** Pantallas por segundo de scroll que dan el arrastre máximo. */
export const SWAY_FULL = 3;
/** Qué tan rápido el arrastre sigue a la velocidad del scroll, por segundo. */
export const SWAY_RESPONSE = 7;

/** Lo que dura la onda de un clic y hasta dónde llega, como parte de la diagonal. */
export const WAVE_DURATION_MS = 1400;
export const WAVE_REACH = 0.3;
/** Ondas a la vez: una más sustituye a la más antigua. */
export const MAX_WAVES = 3;

/**
 * Parte del recorrido entre dos proyectos en la que el símbolo se queda quieto, a
 * cada lado: así se sostiene mientras el proyecto está en pantalla.
 */
export const SCENE_HOLD = 0.25;

/**
 * Parte de la última pantalla que el lienzo espera antes de empezar a rebobinar
 * hacia el logo. En ese tramo se apaga el texto de la escena anterior, para que
 * las figuras del rebobinado no se dibujen encima de él.
 */
export const FINALE_HOLD = 0.3;

/**
 * Con la figura quieta solo se mueve el ruido de fondo: se dibuja a este ritmo, y
 * tras este rato sin gestos el lienzo se duerme hasta el siguiente. Es lo que
 * cuida la batería de un teléfono.
 */
export const AMBIENT_FRAME_MS = 1000 / 20;
export const AMBIENT_REST_MS = 20_000;

/** Opacidad del lienzo cuando hay texto encima. */
export const HORIZON_ALPHA = 0.4;

/**
 * Pares [avance del scroll tras el logo, formación]. Dos paradas con la misma
 * formación son una pausa: el logo espera a la consola y luego baja a la línea.
 */
const STAGES = [
  [0, 0],
  [0.55, 0],
  [1, 1],
] as const;

/** Tramo del scroll que usa el hero tras el logo, de 0 a 1. */
export const afterLogo = (progress: number) => clamp((progress - LOGO_SCROLL) / (1 - LOGO_SCROLL));

export function stageAt(scroll: number) {
  const value = clamp(scroll);
  const next = STAGES.findIndex(([stop]) => stop >= value);
  if (next <= 0) return STAGES[0][1];
  const [startScroll, startStage] = STAGES[next - 1];
  const [endScroll, endStage] = STAGES[next];
  return lerp(startStage, endStage, (value - startScroll) / (endScroll - startScroll));
}
