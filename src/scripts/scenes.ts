/** Parte de la escena que debe verse para darla por presente. */
const PRESENT = 0.5;

/**
 * Entrada y salida de cada escena: marca con `data-present` la que está en
 * pantalla, y el CSS hace entrar su texto por partes y lo retira al irse.
 * Sin este script, o sin movimiento, el texto está siempre visible.
 */
export function mountScenes() {
  const scenes = document.querySelectorAll<HTMLElement>(".scene");
  if (!scenes.length) return;

  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute("data-present", entry.intersectionRatio >= PRESENT);
      }
    },
    { threshold: PRESENT },
  );

  for (const scene of scenes) watcher.observe(scene);
  // Solo con el observador en marcha se esconde lo que aún no ha entrado.
  document.documentElement.toggleAttribute("data-reveal", true);
}
