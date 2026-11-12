/**
 * Índice de paradas: marca en cuál está el visitante y lleva a la que pulse.
 * Los enlaces apuntan a anclas reales, así que sin JavaScript también saltan.
 */
export function mountWaypoints() {
  const nav = document.querySelector<HTMLElement>("[data-waypoints]");
  if (!nav) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("a")];
  const targets = links.map((link) => document.getElementById(link.hash.slice(1)));

  let frame = 0;
  let current = -1;

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
    current = next;
  };

  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      const target = targets[index];
      // Con una tecla modificadora se quiere el enlace en otra pestaña o ventana.
      if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Sin ancla en la dirección: al recargar, la página vuelve a empezar arriba.
      event.preventDefault();
      scrollTo({
        top: Math.round(target.getBoundingClientRect().top + scrollY),
        behavior: reducedMotion.matches ? "instant" : "smooth",
      });
    });
  });

  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
}
