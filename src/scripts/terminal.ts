import { clamp } from "../lib/ascii/math";
import { HORIZON_SCROLL, afterLogo } from "../lib/choreography";
import { GREETING, lineAt, narrate } from "../lib/terminal";

/** Parte de la llegada a una escena en que la terminal ya se ha hecho pequeña. */
const NARRATING_FROM = 0.05;
/** Margen, en píxeles: en una parada, la escena siguiente asoma una fracción de píxel. */
const SLACK = 2;

/**
 * Lee el scroll y avisa de dos avances, ambos de 0 a 1: el recorrido del hero y,
 * después de él, la subida de la línea a horizonte. La terminal escribe el saludo
 * en el hero y, después, el comando de cada escena.
 */
export function mountTerminal(
  section: HTMLElement,
  onProgress: (progress: number, horizon: number) => void,
) {
  const terminal = section.querySelector<HTMLElement>("[data-terminal]");
  const line = section.querySelector<HTMLElement>("[data-terminal-line]");
  const echo = section.querySelector<HTMLElement>("[data-terminal-echo]");
  const stage = section.querySelector<HTMLElement>(".hero__stage");
  if (!terminal || !line || !echo || !stage) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // Las escenas que tienen algo que decir, en orden, y lo que dice cada una.
  const scenes = [...document.querySelectorAll<HTMLElement>("[data-command]")];
  const lines = [GREETING, ...scenes.map((scene) => scene.dataset.command ?? "")];
  // En el final, el sitio de la terminal lo ocupa el panel de contacto.
  const ending = document.querySelector<HTMLElement>("[data-finale]");

  let frame = 0;

  const update = () => {
    frame = 0;
    // Se mide contra el escenario, no contra la ventana: la barra de URL del móvil
    // cambia innerHeight, pero no la altura en svh que usa el CSS.
    const screen = stage.offsetHeight;
    const travel = section.offsetHeight - screen;
    const scrolled = -section.getBoundingClientRect().top;
    // Sin recorrido (reduced motion) el hero no se desplaza: va directo al saludo.
    const progress = travel > 0 ? clamp(scrolled / travel) : 1;
    const horizon = travel > 0 ? clamp((scrolled - travel) / (screen * HORIZON_SCROLL)) : 0;
    onProgress(progress, horizon);

    // La última escena que ya asoma, y cuánto ha entrado: 1 cuando llena la pantalla.
    let index = -1;
    let arrived = 0;
    for (let next = 0; next < scenes.length && screen > 0; next++) {
      const entered = clamp(1 - scenes[next].getBoundingClientRect().top / screen);
      if (entered <= 0) break;
      index = next;
      arrived = entered;
    }
    // Sin movimiento no se escribe letra a letra: la línea cambia entera.
    if (reducedMotion.matches) arrived = Math.round(arrived);

    const shown =
      index < 0
        ? { line: lineAt(afterLogo(progress)), echo: "" }
        : narrate(lines, index + 1, arrived);
    if (line.textContent !== shown.line) line.textContent = shown.line;
    if (echo.textContent !== shown.echo) echo.textContent = shown.echo;

    // Pasada la primera escena ya no vuelve a crecer: la siguiente asoma una
    // fracción de píxel en cada parada y no por eso empieza de cero.
    terminal.toggleAttribute("data-narrating", index > 0 || arrived >= NARRATING_FROM);
    terminal.toggleAttribute(
      "data-quiet",
      !!ending && screen > 0 && ending.getBoundingClientRect().top < screen - SLACK,
    );
  };

  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  reducedMotion.addEventListener("change", schedule);
  update();
}
