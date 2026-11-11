import { clamp } from "../lib/ascii/math";
import { HORIZON_SCROLL, afterLogo } from "../lib/choreography";
import { lineAt } from "../lib/terminal";

/**
 * Lee el scroll y avisa de dos avances, ambos de 0 a 1: el recorrido del hero y,
 * después de él, la subida de la línea a horizonte.
 */
export function mountTerminal(
  section: HTMLElement,
  onProgress: (progress: number, horizon: number) => void,
) {
  const line = section.querySelector<HTMLElement>("[data-terminal-line]");
  const stage = section.querySelector<HTMLElement>(".hero__stage");
  if (!line || !stage) return;

  let frame = 0;

  const update = () => {
    frame = 0;
    // Se mide contra el escenario, no contra la ventana: la barra de URL del móvil
    // cambia innerHeight, pero no la altura en svh que usa el CSS.
    const travel = section.offsetHeight - stage.offsetHeight;
    const scrolled = -section.getBoundingClientRect().top;
    // Sin recorrido (reduced motion) el hero no se desplaza: va directo al saludo.
    const progress = travel > 0 ? clamp(scrolled / travel) : 1;
    const horizon =
      travel > 0 ? clamp((scrolled - travel) / (stage.offsetHeight * HORIZON_SCROLL)) : 0;
    onProgress(progress, horizon);
    const text = lineAt(afterLogo(progress));
    if (line.textContent !== text) line.textContent = text;
  };

  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", schedule);
  update();
}
