import landscapeUrl from "../assets/starry-night.webp?url";
import portraitUrl from "../assets/starry-night-portrait.webp?url";
import logoUrl from "../assets/logo.svg?url";
import { loadImageField, type ImageField } from "../lib/ascii/image-field";
import { Convergence, type Painting } from "../lib/ascii/convergence";
import { clamp, lerp } from "../lib/ascii/math";
import {
  DISSOLVE_DURATION,
  DISSOLVE_START,
  HORIZON_ALPHA,
  LOGO_AT,
  LOGO_SCROLL,
  MAX_RATE,
  POINTER_HOLD_MS,
  POINTER_RESPONSE,
  RATE_RESPONSE,
  STAGE_RESPONSE,
  SWAY_FULL,
  SWAY_RESPONSE,
  afterLogo,
  stageAt,
} from "../lib/choreography";
import { mountTerminal } from "./terminal";

const FONT_FAMILY = '"JetBrains Mono", monospace';
/** Los teléfonos reciben menos píxeles: su pantalla ya es densa. */
const MAX_PIXEL_RATIO = 2;
const PORTRAIT_MAX_PIXEL_RATIO = 1.5;
/**
 * Niveles de calidad. Si el equipo no llega, cada nivel agranda los caracteres
 * (menos que mover) y reduce los píxeles; la figura y la coreografía no cambian.
 */
const QUALITY = [
  { glyphScale: 1, maxPixelRatio: Infinity },
  { glyphScale: 1.2, maxPixelRatio: 1.25 },
  { glyphScale: 1.45, maxPixelRatio: 1 },
];
/**
 * Dibujar no debe pasar de este tiempo medio: deja libre parte del fotograma de
 * 60 fps (16,7 ms), porque después el navegador aún tiene que pintarlo.
 */
const DRAW_BUDGET_MS = 10;
const QUALITY_WINDOW = 30;
/** Los primeros dibujos tras cargar o cambiar de nivel son lentos sin que el equipo lo sea. */
const QUALITY_WARMUP = 20;
/** Una ventana lenta puede ser casualidad (fuentes cargando); dos seguidas, no. */
const SLOW_WINDOWS = 2;
const QUALITY_KEY = "backdrop-quality";

/** El nivel se recuerda por navegador: la siguiente visita no vuelve a medir desde arriba. */
function storedQuality() {
  try {
    const level = Number(localStorage.getItem(QUALITY_KEY));
    return Number.isInteger(level) ? clamp(level, 0, QUALITY.length - 1) : 0;
  } catch {
    return 0;
  }
}

function storeQuality(level: number) {
  try {
    localStorage.setItem(QUALITY_KEY, String(level));
  } catch {
    // Sin almacenamiento (modo privado), cada visita vuelve a medir.
  }
}

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
  if (!fields.has(url)) {
    const field = loadImageField(url);
    // Una descarga fallida no se guarda: el siguiente intento vuelve a pedirla.
    field.catch(() => fields.delete(url));
    fields.set(url, field);
  }
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
  // El visitante altera el lienzo: `force` crece mientras mueve el puntero o toca,
  // y `sway` sigue a la velocidad del scroll. Ambos vuelven solos a cero.
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let lastPointer = -Infinity;
  let force = 0;
  let sway = 0;
  let lastScrollY = 0;
  let drawnStirred = false;
  // La intro mantiene el logo hasta que el visitante baja; desde ahí manda el scroll,
  // así que al volver arriba la pintura se queda quieta y no se disuelve sola.
  let introHolds = true;
  // Hasta que el lienzo tiene tamaño no hay nada que dibujar.
  let ready = false;
  let laidOut = "";
  let layoutRun = 0;
  let quality = storedQuality();
  let drawTime = 0;
  let drawCount = -QUALITY_WARMUP;
  let slowWindows = 0;

  const logo = new Image();
  logo.src = logoUrl;

  // Reduced motion siempre muestra la pintura fija, sin importar dónde iba la coreografía.
  const draw = () => {
    drawnPosition = position;
    drawnVeil = veil;
    drawnStirred = force > 0 || sway !== 0;
    if (reducedMotion.matches) return scene.render(elapsed, true);
    scene.disturb(pointerX, pointerY, force, sway);
    if (position > 1) scene.renderFormation(position - 1, elapsed);
    else scene.render(elapsed, false, position);
    if (veil > 0) scene.dim(lerp(1, HORIZON_ALPHA, veil));
  };

  const layout = async () => {
    const { width, height } = canvas.getBoundingClientRect();
    // Una pestaña sin tamaño todavía (oculta, en segundo plano) espera al ResizeObserver.
    if (width < 1 || height < 1) return;

    // Todo se lee antes de esperar: tras la descarga la pantalla puede haber cambiado.
    const isPortrait = portrait.matches;
    const { glyphScale, maxPixelRatio } = QUALITY[quality];
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      isPortrait ? PORTRAIT_MAX_PIXEL_RATIO : MAX_PIXEL_RATIO,
      maxPixelRatio,
    );
    const key = `${width}x${height}@${pixelRatio}/${quality}`;
    if (key === laidOut) return;

    const run = ++layoutRun;
    let painting: Painting;
    try {
      painting = await paintingFor(isPortrait);
    } catch {
      // Sin pintura queda el prompt de carga; el próximo cambio de tamaño reintenta.
      return;
    }
    // Si llegó una petición más nueva mientras se descargaba, esta ya no vale.
    if (run !== layoutRun) return;
    laidOut = key;

    scene.layout(width, height, pixelRatio, painting, logo, glyphScale);
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

    const stirring = now - lastPointer < POINTER_HOLD_MS;
    force += ((stirring ? 1 : 0) - force) * Math.min(delta * POINTER_RESPONSE, 1);
    if (!stirring && force < 0.001) force = 0;
    // El hueco persigue al puntero en vez de saltar con él.
    pointerX += (targetX - pointerX) * Math.min(delta * STAGE_RESPONSE * 2, 1);
    pointerY += (targetY - pointerY) * Math.min(delta * STAGE_RESPONSE * 2, 1);

    // Velocidad del scroll en pantallas por segundo, con signo.
    // Una ventana sin altura (minimizada, iframe oculto) no puede medir velocidad.
    const screen = window.innerHeight;
    const speed = delta > 0 && screen > 0 ? (window.scrollY - lastScrollY) / delta / screen : 0;
    lastScrollY = window.scrollY;
    sway += (clamp(speed / SWAY_FULL, -1, 1) - sway) * Math.min(delta * SWAY_RESPONSE, 1);
    if (speed === 0 && Math.abs(sway) < 0.001) sway = 0;
    const stirred = force > 0 || sway !== 0;

    // Mientras el visitante lo altera, o justo después, hay que redibujar aunque
    // la figura no haya cambiado.
    if (position === drawnPosition && veil === drawnVeil && !stirred && !drawnStirred) {
      if (position >= 1) {
        // Figura quieta y en su destino: el bucle se detiene hasta el próximo gesto.
        // El primer fotograma tras reanudar no mide tiempo: se espera al siguiente
        // para que el gesto que lo despertó llegue a notarse.
        if (position === target && veil === horizon && delta > 0 && !stirring) pause();
        return;
      }
    }

    section.toggleAttribute("data-settled", position >= 1);
    // En el último nivel ya no hay nada que decidir: no se mide.
    if (quality >= QUALITY.length - 1) return draw();
    const started = performance.now();
    draw();
    measure(performance.now() - started);
  };

  // Se mide lo que tarda el dibujo y no el intervalo entre fotogramas: el ahorro
  // de batería limita la pantalla a 30 fps aunque el equipo vaya sobrado.
  const measure = (ms: number) => {
    if (++drawCount <= 0) return;
    drawTime += ms;
    if (drawCount < QUALITY_WINDOW) return;
    const average = drawTime / drawCount;
    drawTime = 0;
    drawCount = 0;
    slowWindows = average > DRAW_BUDGET_MS ? slowWindows + 1 : 0;
    if (slowWindows < SLOW_WINDOWS) return;
    // El equipo no llega: se baja un nivel y no se vuelve a subir, porque probar
    // de nuevo el nivel caro sería repetir el tirón.
    slowWindows = 0;
    drawCount = -QUALITY_WARMUP;
    quality++;
    storeQuality(quality);
    layout();
  };

  const play = () => {
    if (frame || !ready || reducedMotion.matches || document.hidden) return;
    lastFrame = 0;
    // El scroll hecho con el bucle parado no cuenta como velocidad.
    lastScrollY = window.scrollY;
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

  // Un solo camino para ratón, lápiz y dedo. Reacciona al movimiento, no a la
  // presencia: un puntero quieto no deja un hueco y el bucle puede detenerse.
  const stir = (event: PointerEvent) => {
    if (reducedMotion.matches) return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (force === 0) {
      pointerX = targetX;
      pointerY = targetY;
    }
    lastPointer = performance.now();
    play();
  };
  addEventListener("pointermove", stir, { passive: true });
  addEventListener("pointerdown", stir, { passive: true });

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
    force = 0;
    sway = 0;
    section.toggleAttribute("data-settled", reducedMotion.matches);
    if (ready) draw();
    play();
  });

  await Promise.all([document.fonts.load(`600 12px ${FONT_FAMILY}`), logo.decode().catch(() => {})]);
  await layout();
}
