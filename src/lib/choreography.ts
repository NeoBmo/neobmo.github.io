/**
 * Segundos de la intro, que corre sola: el caos forma la pintura (hasta ~5,5),
 * se contempla, y se disuelve en el logo.
 */
export const DISSOLVE_START = 7.8;
export const DISSOLVE_DURATION = 1.4;
export const LOGO_AT = DISSOLVE_START + DISSOLVE_DURATION;

/** Con el logo formado, lo que espera el saludo antes de escribirse. */
export const GREETING_DELAY = 0.3;
/** Con el saludo escrito, lo que se sostiene antes de soltar al visitante. */
export const GREETING_HOLD = 0.9;
/** Lo que tarda el logo en deshacerse en el ruido de fondo. */
export const RELEASE_DURATION = 1.6;

/** Un gesto durante la intro la acelera de forma gradual hasta este ritmo. */
export const MAX_RATE = 8;
/** Qué tan rápido el ritmo alcanza su objetivo, por segundo. */
export const RATE_RESPONSE = 2.5;
/** Qué tan rápido los caracteres alcanzan al scroll, por segundo. */
export const STAGE_RESPONSE = 8;

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
