/** Tras dar un paso, cuánto se espera antes de aceptar otro. */
const STEP_LOCK_MS = 450;
/** Pausa entre eventos de rueda que separa un gesto del siguiente. */
const GESTURE_GAP_MS = 180;
/**
 * Un empujón así de mayor que los eventos recientes también es un gesto nuevo,
 * si además supera un mínimo: la cola de una inercia salta entre 1 y 3 píxeles y
 * esas subidas no son gestos.
 */
const GESTURE_SURGE = 1.6;
const GESTURE_MIN = 40;
/** Cuánto se olvida, por evento, el pico reciente de la rueda. */
const PEAK_DECAY = 0.8;
/** Píxeles por línea cuando el navegador mide la rueda en líneas. */
const LINE_HEIGHT = 16;
/** Margen, en píxeles, para decidir si ya se está en una parada. */
const SLACK = 2;

const FORWARD_KEYS = new Set(["ArrowDown", "PageDown", " "]);
const BACKWARD_KEYS = new Set(["ArrowUp", "PageUp"]);
/** Con el foco aquí, las teclas ya tienen su propio efecto. */
const TYPING = "input, select, textarea, [contenteditable]";
const PRESSABLE = "a, button, summary";

interface Stop {
  top: number;
  /** Final del contenido, si la parada es una escena que puede no caber en pantalla. */
  bottom?: number;
}

/**
 * Raíles: un gesto pequeño lleva a la parada siguiente o anterior, una por gesto.
 * El dedo lo encaja el navegador (CSS); aquí se llevan la rueda y el teclado, que
 * con el encaje nativo volverían a la misma parada si el gesto es corto.
 */
export function mountRails() {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const marks = [...document.querySelectorAll<HTMLElement>("[data-stop], .scene")];
  if (!marks.length) return;

  // Se miden en cada gesto: la altura de la página cambia con la ventana.
  const stops = (): Stop[] =>
    marks
      .map((mark) => {
        const rect = mark.getBoundingClientRect();
        const top = Math.round(rect.top + scrollY);
        return mark.matches(".scene") ? { top, bottom: Math.round(rect.bottom + scrollY) } : { top };
      })
      .sort((a, b) => a.top - b.top);

  /** A dónde lleva un paso, o `undefined` si el scroll debe seguir siendo el normal. */
  const destination = (direction: 1 | -1) => {
    const list = stops();
    const here = scrollY;
    let current: Stop | undefined;
    for (const stop of list) if (stop.top <= here + SLACK) current = stop;

    if (direction > 0) {
      // Una escena más alta que la pantalla se lee entera antes de seguir.
      if (current?.bottom && current.bottom > here + innerHeight + SLACK) return undefined;
      return list.find((stop) => stop.top > here + SLACK)?.top;
    }

    // Dentro de una escena alta también se sube leyendo, con el scroll normal.
    if (current?.bottom && here > current.top + SLACK && tall(current)) return undefined;

    let previous: Stop | undefined;
    for (const stop of list) if (stop.top < here - SLACK) previous = stop;
    if (!previous) return undefined;
    // A una escena alta se entra por su final, no por su principio.
    return previous.bottom && tall(previous) ? previous.bottom - innerHeight : previous.top;
  };

  const tall = (stop: Stop) => stop.bottom !== undefined && stop.bottom - stop.top > innerHeight + SLACK;

  /**
   * Con una ventana de lectura abierta, la rueda y las teclas son suyas; y durante
   * la intro la página no se desplaza.
   */
  const reading = () =>
    document.querySelector("dialog[open]") !== null ||
    ["intro", "greeting"].includes(document.documentElement.dataset.stage ?? "");

  let lockedUntil = 0;
  let lastWheel = 0;
  let peak = 0;

  const step = (direction: 1 | -1, now: number) => {
    const top = destination(direction);
    if (top === undefined) return false;
    if (now >= lockedUntil) {
      lockedUntil = now + STEP_LOCK_MS;
      scrollTo({ top, behavior: "smooth" });
    }
    return true;
  };

  addEventListener(
    "wheel",
    (event) => {
      // Con Ctrl la rueda hace zoom; en horizontal no es un cambio de escena.
      if (reducedMotion.matches || event.ctrlKey || reading()) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      // Algunos navegadores miden la rueda en líneas o en páginas, no en píxeles.
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? LINE_HEIGHT
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? innerHeight
            : 1;
      const size = Math.abs(event.deltaY) * unit;
      // La inercia de un trackpad manda decenas de eventos cada vez más pequeños:
      // solo empieza un gesto tras una pausa o con un empujón claramente mayor
      // que el pico reciente.
      const fresh =
        event.timeStamp - lastWheel > GESTURE_GAP_MS ||
        (size >= GESTURE_MIN && size > peak * GESTURE_SURGE);
      lastWheel = event.timeStamp;
      peak = Math.max(size, peak * PEAK_DECAY);

      const direction = event.deltaY > 0 ? 1 : -1;
      if (destination(direction) === undefined) return;
      // El resto del gesto se descarta: si no, el scroll normal desharía el paso.
      event.preventDefault();
      if (fresh) step(direction, event.timeStamp);
    },
    { passive: false },
  );

  addEventListener("keydown", (event) => {
    if (reducedMotion.matches || event.defaultPrevented || reading()) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(TYPING)) return;
    // Espacio sobre un enlace o un botón lo activa: no es un paso.
    if (event.key === " " && target?.closest(PRESSABLE)) return;

    const backward = BACKWARD_KEYS.has(event.key) || (event.key === " " && event.shiftKey);
    const forward = !backward && FORWARD_KEYS.has(event.key);
    if (!backward && !forward) return;
    if (step(backward ? -1 : 1, event.timeStamp)) event.preventDefault();
  });
}
