import landscapeUrl from "../assets/starry-night.webp?url";
import portraitUrl from "../assets/starry-night-portrait.webp?url";
import logoUrl from "../assets/logo.svg?url";
import { loadImageField, type ImageField } from "../lib/ascii/image-field";
import { CALM_STRIDE, Convergence, WAVE_STRIDE, type Painting } from "../lib/ascii/convergence";
import { clamp, lerp, smoothstep } from "../lib/ascii/math";
import {
  AMBIENT_FRAME_MS,
  AMBIENT_REST_MS,
  DISSOLVE_DURATION,
  DISSOLVE_START,
  FINALE_HOLD,
  HORIZON_ALPHA,
  LOGO_AT,
  LOGO_SCROLL,
  MAX_RATE,
  MAX_WAVES,
  POINTER_HOLD_MS,
  POINTER_RESPONSE,
  RATE_RESPONSE,
  SCENE_HOLD,
  STAGE_RESPONSE,
  SWAY_FULL,
  SWAY_RESPONSE,
  WAVE_DURATION_MS,
  WAVE_REACH,
  afterLogo,
  stageAt,
} from "../lib/choreography";
import { SYMBOLS, type SymbolName } from "../lib/symbols";
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
 * El equipo «no llega» si, con todos los caracteres en pantalla, los fotogramas
 * duran de media más que esto y bastante más que al empezar la intro, cuando
 * casi no hay nada que dibujar. Comparar con el principio evita castigar a quien
 * tiene la pantalla limitada a 30 fps por el ahorro de batería.
 */
const SLOW_FRAME_MS = 1000 / 50;
const SLOW_RATIO = 1.3;
/** Segundos de intro: hasta aquí se toma la referencia y desde aquí se mide. */
const BASELINE_UNTIL = 0.8;
const MEASURE_FROM = 2;
/** Fotogramas por ventana de medida, y los mínimos para fiarse de la referencia. */
const QUALITY_WINDOW = 30;
const BASELINE_FRAMES = 5;
/** Un parón largo (cambio de pestaña) no cuenta entero como lentitud. */
const LONGEST_FRAME_MS = 200;
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

/** Zonas de texto que el ruido de fondo respeta a la vez: las escenas en pantalla. */
const MAX_CALM = 3;

/** Un clic aquí ya tiene su propio efecto: no lanza onda. */
const INTERACTIVE = "a, button, input, select, textarea, summary, label, dialog";

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
  const backdrop = document.querySelector<HTMLCanvasElement>("[data-backdrop]");
  if (!backdrop) return;
  let canvas = backdrop;

  // Cada carga empieza arriba: la coreografía no puede arrancar a mitad del scroll.
  history.scrollRestoration = "manual";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const portrait = window.matchMedia(PORTRAIT_QUERY);
  const onRestore = () => {
    if (ready) draw();
  };
  let scene: Convergence;
  try {
    scene = new Convergence({ canvas, fontFamily: FONT_FAMILY, onRestore });
  } catch {
    // La tarjeta gráfica rechazó el dibujo. Un lienzo que ya pidió WebGL no puede
    // dar Canvas 2D, así que se sustituye por una copia limpia.
    canvas = canvas.cloneNode() as HTMLCanvasElement;
    backdrop.replaceWith(canvas);
    scene = new Convergence({ canvas, fontFamily: FONT_FAMILY, onRestore, webgl: false });
  }

  let elapsed = 0;
  let lastFrame = 0;
  let frame = 0;
  let rate = 1;
  let progress = 0;
  let horizon = 0;
  // Las escenas que siguen al horizonte: cada una anuncia su símbolo en la página.
  const scenes = [...document.querySelectorAll<HTMLElement>("[data-symbol]")];
  const symbols = scenes.map((scene) => SYMBOLS[scene.dataset.symbol as SymbolName] ?? []);
  let scenery = 0;
  // El texto de cada escena: donde está, el ruido de fondo se apaga.
  const texts = [...document.querySelectorAll<HTMLElement>(".scene")];
  const range = document.createRange();
  const zones = new Float32Array(MAX_CALM * CALM_STRIDE);
  // El ruido se mueve solo: se dibuja despacio y se duerme si nadie hace nada.
  let lastDraw = 0;
  let lastInput = performance.now();
  // El final de la página: de 0 a 1 mientras entra, el lienzo rebobina hasta el logo.
  const ending = document.querySelector<HTMLElement>("[data-finale]");
  const leaving = ending?.previousElementSibling;
  let finale = 0;
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
  // Cada clic lanza una onda que crece desde su punto y se apaga sola.
  const ripples: { x: number; y: number; start: number }[] = [];
  const waves = new Float32Array(MAX_WAVES * WAVE_STRIDE);
  let waveCount = 0;
  // La intro mantiene el logo hasta que el visitante baja; desde ahí manda el scroll,
  // así que al volver arriba la pintura se queda quieta y no se disuelve sola.
  let introHolds = true;
  // Hasta que el lienzo tiene tamaño no hay nada que dibujar.
  let ready = false;
  let laidOut = "";
  let layoutRun = 0;
  let quality = storedQuality();
  const baseline: number[] = [];
  let frameTime = 0;
  let frameCount = 0;
  let slowWindows = 0;

  const logo = new Image();
  logo.src = logoUrl;

  // Reduced motion siempre muestra la pintura fija, sin importar dónde iba la coreografía.
  const draw = () => {
    drawnPosition = position;
    drawnVeil = veil;
    drawnStirred = force > 0 || sway !== 0 || waveCount > 0;
    scene.dim(reducedMotion.matches ? 1 : lerp(1, HORIZON_ALPHA, veil));
    if (reducedMotion.matches) return scene.render(elapsed, true);
    scene.disturb(pointerX, pointerY, force, sway, waves, waveCount);
    // Desde el logo mandan las figuras, con el ruido de fondo alrededor.
    if (position >= 1) scene.renderFormation(position - 1, elapsed);
    else scene.render(elapsed, false, position);
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

    scene.layout(width, height, pixelRatio, painting, logo, glyphScale, symbols, isPortrait);
    // Con otro tamaño de pantalla el texto cambia de sitio: se vuelve a medir.
    calm();
    draw();

    if (ready) return;
    ready = true;
    section.dataset.ready = "";
    canvas.dataset.ready = "";
    play();
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const interval = now - (lastFrame || now);
    const delta = Math.min(interval / 1000, 0.1);
    lastFrame = now;

    const introRunning = elapsed < LOGO_AT;
    const targetRate = introRunning && progress > 0 ? MAX_RATE : 1;
    rate += (targetRate - rate) * Math.min(delta * RATE_RESPONSE, 1);
    elapsed += delta * rate;

    if (!introRunning && progress >= LOGO_SCROLL) introHolds = false;
    const dissolve = introHolds
      ? clamp((elapsed - DISSOLVE_START) / DISSOLVE_DURATION)
      : clamp(progress / LOGO_SCROLL);
    // El final multiplica por lo que falta todo lo recorrido después del logo: lo
    // deshace pasando por cada figura hasta dejar el logo, y al subir lo rehace en
    // el mismo orden. La pintura no vuelve: es solo del principio.
    const journey = introRunning ? 0 : stageAt(afterLogo(progress)) + horizon + scenery;
    const target = dissolve + journey * (1 - finale);
    const veilTarget = horizon * (1 - finale);

    // La intro va exacta al reloj; después los caracteres persiguen al scroll,
    // así que incluso un salto brusco, en cualquier sentido, viaja suave.
    if (introRunning) position = target;
    else position += (target - position) * Math.min(delta * STAGE_RESPONSE, 1);
    if (Math.abs(target - position) < 0.001) position = target;
    veil += (veilTarget - veil) * Math.min(delta * STAGE_RESPONSE, 1);
    if (Math.abs(veilTarget - veil) < 0.001) veil = veilTarget;

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

    while (ripples.length && now - ripples[0].start >= WAVE_DURATION_MS) ripples.shift();
    waveCount = ripples.length;
    const reach = Math.hypot(window.innerWidth, window.innerHeight) * WAVE_REACH;
    for (let index = 0; index < waveCount; index++) {
      const { x, y, start } = ripples[index];
      // El anillo sale rápido y frena; su fuerza se apaga antes de llegar al final.
      const fading = (1 - clamp((now - start) / WAVE_DURATION_MS)) ** 2;
      waves[index * WAVE_STRIDE] = x;
      waves[index * WAVE_STRIDE + 1] = y;
      waves[index * WAVE_STRIDE + 2] = (1 - fading) * reach;
      waves[index * WAVE_STRIDE + 3] = fading;
    }
    const stirred = force > 0 || sway !== 0 || waveCount > 0;

    // Mientras el visitante lo altera, o justo después, hay que redibujar aunque
    // la figura no haya cambiado.
    if (position === drawnPosition && veil === drawnVeil && !stirred && !drawnStirred) {
      if (position >= 1) {
        // Figura quieta y en su destino: solo queda el ruido de fondo, que se dibuja
        // despacio. Tras un rato sin gestos, el bucle se detiene hasta el próximo.
        // El primer fotograma tras reanudar no mide tiempo: se espera al siguiente
        // para que el gesto que lo despertó llegue a notarse.
        const settled = position === target && veil === veilTarget && delta > 0 && !stirring;
        if (settled && now - lastInput > AMBIENT_REST_MS) return pause();
        if (now - lastDraw < AMBIENT_FRAME_MS) return;
      }
    }

    section.toggleAttribute("data-settled", position >= 1);
    lastDraw = now;
    draw();
    // Solo se mide durante la intro, que es cuando viajan todos los caracteres, y
    // nunca en el último nivel, donde ya no hay nada que decidir.
    if (introRunning && interval > 0 && quality < QUALITY.length - 1) measure(interval);
  };

  // Se mide el tiempo entre fotogramas: el dibujo lo hace la tarjeta gráfica
  // después de que el código termina, así que cronometrar el código no dice nada.
  const measure = (interval: number) => {
    if (elapsed < BASELINE_UNTIL) baseline.push(interval);
    if (elapsed < MEASURE_FROM || baseline.length < BASELINE_FRAMES) return;
    frameTime += Math.min(interval, LONGEST_FRAME_MS);
    if (++frameCount < QUALITY_WINDOW) return;
    const average = frameTime / frameCount;
    frameTime = 0;
    frameCount = 0;
    // La mediana ignora los tirones sueltos del arranque.
    const usual = [...baseline].sort((a, b) => a - b)[baseline.length >> 1];
    slowWindows = average > Math.max(SLOW_FRAME_MS, usual * SLOW_RATIO) ? slowWindows + 1 : 0;
    if (slowWindows < SLOW_WINDOWS) return;
    // El equipo no llega: se baja un nivel y no se vuelve a subir, porque probar
    // de nuevo el nivel caro sería repetir el tirón.
    slowWindows = 0;
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

  /** Un gesto del visitante: despierta el lienzo y reinicia la cuenta del descanso. */
  const wake = () => {
    lastInput = performance.now();
    play();
  };

  /** Dónde está el texto de las escenas en pantalla, para que el ruido lo respete. */
  const calm = () => {
    let count = 0;
    for (const text of texts) {
      if (count === MAX_CALM) break;
      const box = text.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight) continue;
      // El contenido y no la caja: una escena ocupa la pantalla, su texto no.
      range.selectNodeContents(text);
      const { left, top, right, bottom } = range.getBoundingClientRect();
      if (right <= left || bottom <= top) continue;
      zones[count * CALM_STRIDE] = left;
      zones[count * CALM_STRIDE + 1] = top;
      zones[count * CALM_STRIDE + 2] = right;
      zones[count * CALM_STRIDE + 3] = bottom;
      count++;
    }
    scene.calm(zones, count);
  };

  /**
   * Qué escena está en pantalla: 0 antes de la primera, 1 con la primera centrada,
   * 2 con la segunda, etc. Entre dos, el símbolo se sostiene y luego cambia.
   */
  const sceneAt = () => {
    const middle = window.innerHeight / 2;
    // La primera empieza a formarse cuando está una pantalla por debajo del centro.
    let span = window.innerHeight;
    let above = 0;
    for (let index = 0; index < scenes.length; index++) {
      const rect = scenes[index].getBoundingClientRect();
      const below = rect.top + rect.height / 2 - middle;
      if (index > 0) span = below - above;
      if (below > 0) {
        const arrived = span > 0 ? clamp(1 - below / span) : 1;
        return index + smoothstep(SCENE_HOLD, 1 - SCENE_HOLD, arrived);
      }
      above = below;
    }
    return scenes.length;
  };

  mountTerminal(section, (heroProgress, horizonProgress) => {
    progress = heroProgress;
    horizon = horizonProgress;
    scenery = sceneAt();
    const screen = window.innerHeight;
    const entered = ending && screen > 0 ? 1 - ending.getBoundingClientRect().top / screen : 0;
    finale = smoothstep(FINALE_HOLD, 1, entered);
    // Sin movimiento no hay rebobinado: el texto anterior se queda como está.
    if (leaving instanceof HTMLElement) {
      leaving.style.opacity = reducedMotion.matches
        ? ""
        : String(1 - smoothstep(0, FINALE_HOLD, entered));
    }
    calm();
    wake();
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
    wake();
  };
  addEventListener("pointermove", stir, { passive: true });
  addEventListener("pointerdown", stir, { passive: true });

  // `click` y no `pointerdown`: en un teléfono, el dedo que empieza un scroll
  // también dispara `pointerdown`; `click` solo llega con un toque de verdad.
  addEventListener("click", (event) => {
    if (reducedMotion.matches || !ready) return;
    // Un clic hecho con el teclado no tiene punto de origen: llegaría en la esquina.
    if (event.detail === 0) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    if (ripples.length === MAX_WAVES) ripples.shift();
    ripples.push({ x: event.clientX, y: event.clientY, start: performance.now() });
    wake();
  });

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
    ripples.length = 0;
    waveCount = 0;
    section.toggleAttribute("data-settled", reducedMotion.matches);
    if (ready) draw();
    play();
  });

  await Promise.all([document.fonts.load(`600 12px ${FONT_FAMILY}`), logo.decode().catch(() => {})]);
  await layout();
}
