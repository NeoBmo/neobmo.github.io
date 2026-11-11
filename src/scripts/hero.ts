import landscapeUrl from "../assets/starry-night.webp?url";
import portraitUrl from "../assets/starry-night-portrait.webp?url";
import logoUrl from "../assets/logo.svg?url";
import { loadImageField, type ImageField } from "../lib/ascii/image-field";
import { Convergence, INTRO_DURATION, type Painting } from "../lib/ascii/convergence";
import { clamp, lerp } from "../lib/ascii/math";
import {
  DISSOLVE_DURATION,
  DISSOLVE_START,
  HORIZON_ALPHA,
  LOGO_AT,
  LOGO_SCROLL,
  MAX_RATE,
  RATE_RESPONSE,
  STAGE_RESPONSE,
  afterLogo,
  stageAt,
} from "../lib/choreography";
import { mountTerminal } from "./terminal";

const FONT_FAMILY = '"JetBrains Mono", monospace';
/** After the intro the painting only breathes, so 30 fps is plenty. */
const IDLE_FRAME_MS = 1000 / 30;
/** Los teléfonos reciben menos fotogramas y píxeles: su pantalla ya es densa. */
const PORTRAIT_IDLE_FRAME_MS = 1000 / 20;
const MAX_PIXEL_RATIO = 2;
const PORTRAIT_MAX_PIXEL_RATIO = 1.5;
/** Below this aspect ratio the vertical composition fits better. */
const PORTRAIT_QUERY = "(max-aspect-ratio: 6/7)";

const VARIANTS = {
  landscape: { url: landscapeUrl, focus: { x: 0.4, y: 0.5 } },
  portrait: { url: portraitUrl, focus: { x: 0.5, y: 0.5 } },
};

const fields = new Map<string, Promise<ImageField>>();

/** Each variant is fetched only when a screen of that shape needs it. */
async function paintingFor(portrait: boolean): Promise<Painting> {
  const { url, focus } = VARIANTS[portrait ? "portrait" : "landscape"];
  if (!fields.has(url)) fields.set(url, loadImageField(url));
  return { field: await fields.get(url)!, focus };
}

export async function mountHero(section: HTMLElement) {
  // El lienzo vive fuera del hero: es el fondo fijo de toda la página.
  const canvas = document.querySelector<HTMLCanvasElement>("[data-backdrop]");
  if (!canvas) return;

  // Cada carga empieza arriba: la coreografía no puede arrancar a mitad del scroll.
  history.scrollRestoration = "manual";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const portrait = window.matchMedia(PORTRAIT_QUERY);
  const scene = new Convergence({ canvas, fontFamily: FONT_FAMILY });

  let elapsed = 0;
  let lastFrame = 0;
  let lastDraw = 0;
  let frame = 0;
  let rate = 1;
  let progress = 0;
  let horizon = 0;
  // Un solo número recorre toda la obra: 0–1 pintura → logo, 1–2 logo → línea,
  // 2–3 la línea sube a horizonte detrás del contenido.
  let position = 0;
  let drawnPosition = -1;
  // El velo atenúa el lienzo cuando hay texto encima. Sigue al horizonte aparte de
  // `position` porque también debe actuar si alguien baja durante la intro.
  let veil = 0;
  let drawnVeil = -1;
  // La intro mantiene el logo hasta que el visitante baja; desde ahí manda el scroll,
  // así que al volver arriba la pintura se queda quieta y no se disuelve sola.
  let introHolds = true;
  // Hasta que el lienzo tiene tamaño no hay nada que dibujar.
  let ready = false;
  let laidWidth = 0;
  let laidHeight = 0;

  const logo = new Image();
  logo.src = logoUrl;

  // Reduced motion siempre muestra la pintura fija, sin importar dónde iba la coreografía.
  const draw = () => {
    drawnPosition = position;
    drawnVeil = veil;
    if (reducedMotion.matches) return scene.render(elapsed, true);
    if (position > 1) scene.renderFormation(position - 1, elapsed);
    else scene.render(elapsed, false, position);
    if (veil > 0) scene.dim(lerp(1, HORIZON_ALPHA, veil));
  };

  const layout = async () => {
    const { width, height } = canvas.getBoundingClientRect();
    // Una pestaña sin tamaño todavía (oculta, en segundo plano) espera al ResizeObserver.
    if (width < 1 || height < 1) return;
    if (width === laidWidth && height === laidHeight) return;
    laidWidth = width;
    laidHeight = height;

    const painting = await paintingFor(portrait.matches);
    const maxPixelRatio = portrait.matches ? PORTRAIT_MAX_PIXEL_RATIO : MAX_PIXEL_RATIO;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    scene.layout(width, height, pixelRatio, painting, logo);
    draw();

    if (ready) return;
    ready = true;
    section.dataset.ready = "";
    canvas.dataset.ready = "";
    play();
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const delta = Math.min((now - (lastFrame || now)) / 1000, 0.1);
    lastFrame = now;

    const introRunning = elapsed < LOGO_AT;
    const targetRate = introRunning && progress > 0 ? MAX_RATE : 1;
    rate += (targetRate - rate) * Math.min(delta * RATE_RESPONSE, 1);
    elapsed += delta * rate;

    if (!introRunning && progress >= LOGO_SCROLL) introHolds = false;
    const dissolve = introHolds
      ? clamp((elapsed - DISSOLVE_START) / DISSOLVE_DURATION)
      : clamp(progress / LOGO_SCROLL);
    const target = dissolve + (introRunning ? 0 : stageAt(afterLogo(progress)) + horizon);

    // La intro va exacta al reloj; después los caracteres persiguen al scroll,
    // así que incluso un salto brusco, en cualquier sentido, viaja suave.
    if (introRunning) position = target;
    else position += (target - position) * Math.min(delta * STAGE_RESPONSE, 1);
    if (Math.abs(target - position) < 0.001) position = target;
    veil += (horizon - veil) * Math.min(delta * STAGE_RESPONSE, 1);
    if (Math.abs(horizon - veil) < 0.001) veil = horizon;

    if (position === drawnPosition && veil === drawnVeil) {
      if (position >= 1) {
        // Figura quieta y en su destino: el bucle se detiene hasta el próximo scroll.
        if (position === target && veil === horizon) pause();
        return;
      }
      const idleFrameMs = portrait.matches ? PORTRAIT_IDLE_FRAME_MS : IDLE_FRAME_MS;
      if (elapsed > INTRO_DURATION && now - lastDraw < idleFrameMs) return;
    }

    section.toggleAttribute("data-settled", position >= 1);
    lastDraw = now;
    draw();
  };

  const play = () => {
    if (frame || !ready || reducedMotion.matches || document.hidden) return;
    lastFrame = 0;
    frame = requestAnimationFrame(tick);
  };

  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  mountTerminal(section, (heroProgress, horizonProgress) => {
    progress = heroProgress;
    horizon = horizonProgress;
    play();
  });

  section.toggleAttribute("data-settled", reducedMotion.matches);

  // Los observadores van antes del primer dibujo: si el lienzo aún no tiene tamaño,
  // serán ellos quienes lo dibujen cuando lo tenga.
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 120);
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  reducedMotion.addEventListener("change", () => {
    pause();
    section.toggleAttribute("data-settled", reducedMotion.matches);
    if (ready) draw();
    play();
  });

  await Promise.all([document.fonts.load(`600 12px ${FONT_FAMILY}`), logo.decode().catch(() => {})]);
  await layout();
}
