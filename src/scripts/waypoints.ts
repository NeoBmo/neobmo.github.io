import { NOISE } from "../lib/ascii/glyphs";

/** Lo que el índice sigue a la vista tras el último gesto, y al abrirse la página. */
const AWAKE_MS = 1800;
const WELCOME_MS = 3200;
/** Cada cuánto cambia un carácter mientras el índice está a la vista. */
const FLICKER_MS = 140;
/** Franja del borde derecho, en píxeles, donde el puntero lo despierta. */
const EDGE = 96;
/** Lo que marca la parada actual, y las demás cuando no hay movimiento. */
const HERE = "█";
const STILL = "·";

/**
 * Índice de paradas: marca en cuál está el visitante y lleva a la que pulse.
 * Está hecho de caracteres que cambian, aparece mientras se navega y se retira
 * en reposo. Los enlaces apuntan a anclas reales: sin JavaScript también saltan.
 */
export function mountWaypoints() {
  const nav = document.querySelector<HTMLElement>("[data-waypoints]");
  if (!nav) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // En una pantalla táctil el «puntero encima» se queda pegado tras un toque.
  const hovers = matchMedia("(hover: hover)");
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("a")];
  const glyphs = links.map((link) => link.querySelector<HTMLElement>("[data-glyph]"));
  const targets = links.map((link) => document.getElementById(link.hash.slice(1)));

  let frame = 0;
  let current = -1;
  let asleep = 0;
  let flicker = 0;

  const mark = (index: number, glyph: string) => {
    const slot = glyphs[index];
    if (slot && slot.textContent !== glyph) slot.textContent = glyph;
  };

  const update = () => {
    frame = 0;
    // La parada actual es la última que ya pasó de la mitad de la pantalla.
    const middle = innerHeight / 2;
    let next = 0;
    targets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top <= middle) next = index;
    });
    if (next === current) return;
    links[current]?.removeAttribute("aria-current");
    links[next]?.setAttribute("aria-current", "location");
    if (current >= 0) mark(current, STILL);
    mark(next, HERE);
    current = next;
  };

  const rest = () => {
    // Con el puntero encima o el foco dentro, sigue a la vista.
    if (nav.matches(":focus-within") || (hovers.matches && nav.matches(":hover"))) return wake();
    nav.removeAttribute("data-awake");
    clearInterval(flicker);
    flicker = 0;
    glyphs.forEach((_, index) => mark(index, index === current ? HERE : STILL));
  };

  /** Un gesto lo trae a la vista; sin más gestos, se retira solo. */
  function wake(hold = AWAKE_MS) {
    // Sin movimiento no aparece ni desaparece: está siempre, y quieto.
    if (reducedMotion.matches) return;
    nav?.toggleAttribute("data-awake", true);
    clearTimeout(asleep);
    asleep = window.setTimeout(rest, hold);
    // Mientras se ve, uno de sus caracteres cambia cada poco.
    flicker ||= window.setInterval(() => {
      const index = Math.floor(Math.random() * glyphs.length);
      if (index !== current) mark(index, NOISE[Math.floor(Math.random() * NOISE.length)]);
    }, FLICKER_MS);
  }

  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      const target = targets[index];
      // Con una tecla modificadora se quiere el enlace en otra pestaña o ventana.
      if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Sin ancla en la dirección: al recargar, la página vuelve a empezar arriba.
      event.preventDefault();
      // Con ratón o dedo el enlace no se queda con el foco: si no, el índice no se
      // retiraría. Con teclado sí lo conserva.
      if (event.detail > 0) link.blur();
      scrollTo({
        top: Math.round(target.getBoundingClientRect().top + scrollY),
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    });
  });

  addEventListener(
    "scroll",
    () => {
      frame ||= requestAnimationFrame(update);
      wake();
    },
    { passive: true },
  );
  addEventListener("resize", () => {
    frame ||= requestAnimationFrame(update);
  });
  addEventListener(
    "pointermove",
    (event) => {
      if (event.clientX > innerWidth - EDGE) wake();
    },
    { passive: true },
  );
  // Al abrirse la página se enseña un momento: así se sabe que existe.
  new MutationObserver(() => {
    if (document.documentElement.dataset.stage === "open") wake(WELCOME_MS);
  }).observe(document.documentElement, { attributeFilter: ["data-stage"] });

  // Sin movimiento se queda fijo: no se marca como mejorado y no se esconde.
  const enhance = () => nav.toggleAttribute("data-enhanced", !reducedMotion.matches);
  reducedMotion.addEventListener("change", enhance);
  enhance();
  update();
}
