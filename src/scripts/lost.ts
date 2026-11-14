import { NOISE } from "../lib/ascii/glyphs";
import { clamp, createRandom, easeInOutCubic, lerp } from "../lib/ascii/math";

const FONT_FAMILY = '"JetBrains Mono", monospace';
const CODE = "404";
/** Segundos: cada carácter sale con un retraso propio y viaja hasta su sitio. */
const STAGGER = 1.4;
const TRAVEL = 1.6;
/** Parte de las celdas vacías que queda como ruido de fondo, y cuánto se ve. */
const AMBIENT_DENSITY = 0.03;
const AMBIENT_ALPHA = 0.26;
const MAX_PIXEL_RATIO = 2;

interface Glyph {
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  delay: number;
  /** El carácter que queda al final: el dígito que ayuda a formar. */
  glyph: string;
  seed: number;
}

/**
 * La página de error: caracteres sueltos que se ordenan hasta escribir «404»,
 * cada cifra hecha de su propio dígito. Del caos al orden, como la portada.
 */
export async function mountLost(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  await document.fonts.load(`600 12px ${FONT_FAMILY}`);

  let glyphs: Glyph[] = [];
  let ambient: Glyph[] = [];
  let width = 0;
  let height = 0;
  let started = 0;
  let frame = 0;
  let laidOut = "";

  const layout = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;
    ({ width, height } = box);
    const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const size = clamp(width / 90, 9, 13);
    context.font = `600 ${size}px ${FONT_FAMILY}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    const cellWidth = context.measureText("0").width;
    const cellHeight = size * 1.3;
    const cols = Math.floor(width / cellWidth);
    const rows = Math.floor(height / cellHeight);
    if (cols < 6 || rows < 3) return false;

    // El número se dibuja en una capa con un píxel por celda. Las celdas son más
    // altas que anchas, así que se ensancha el trazo para que no salga estrecho.
    const mask = document.createElement("canvas");
    mask.width = cols;
    mask.height = rows;
    const layer = mask.getContext("2d", { willReadFrequently: true });
    if (!layer) return false;
    const stretch = cellHeight / cellWidth;
    const letter = Math.min(rows * 0.95, (cols * 0.92) / (CODE.length * 0.6 * stretch));
    layer.setTransform(stretch, 0, 0, 1, 0, 0);
    layer.font = `700 ${letter}px ${FONT_FAMILY}`;
    layer.textAlign = "center";
    layer.textBaseline = "middle";
    layer.fillStyle = "#fff";
    layer.fillText(CODE, cols / 2 / stretch, rows / 2);
    const { data } = layer.getImageData(0, 0, cols, rows);

    const random = createRandom(404);
    const left = (width - cols * cellWidth) / 2;
    const top = (height - rows * cellHeight) / 2;
    // Dónde empieza y acaba el número, para saber a qué cifra pertenece cada celda.
    const span = CODE.length * 0.6 * stretch * letter;
    const first = (cols - span) / 2;
    glyphs = [];
    ambient = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const filled = data[(row * cols + col) * 4 + 3] > 128;
        if (!filled && random() > AMBIENT_DENSITY) continue;
        const digit = clamp(Math.floor(((col + 0.5 - first) / span) * CODE.length), 0, CODE.length - 1);
        (filled ? glyphs : ambient).push({
          fromX: random() * width,
          fromY: random() * height,
          x: left + (col + 0.5) * cellWidth,
          y: top + (row + 0.5) * cellHeight,
          delay: random() * STAGGER,
          glyph: filled ? CODE[digit] : NOISE[Math.floor(random() * NOISE.length)],
          seed: Math.floor(random() * NOISE.length),
        });
      }
    }
    return true;
  };

  const draw = (seconds: number) => {
    context.clearRect(0, 0, width, height);
    const flicker = Math.floor(seconds * 12);

    context.globalAlpha = AMBIENT_ALPHA;
    for (const { x, y, glyph } of ambient) context.fillText(glyph, x, y);

    for (const { fromX, fromY, x, y, delay, glyph, seed } of glyphs) {
      const arrived = easeInOutCubic(clamp((seconds - delay) / TRAVEL));
      // Mientras viaja es ruido; al llegar se queda con su cifra.
      context.globalAlpha = lerp(AMBIENT_ALPHA, 1, arrived);
      context.fillText(
        arrived > 0.9 ? glyph : NOISE[(flicker + seed) % NOISE.length],
        lerp(fromX, x, arrived),
        lerp(fromY, y, arrived),
      );
    }
  };

  const tick = (now: number) => {
    started ||= now;
    const seconds = (now - started) / 1000;
    draw(seconds);
    // Cuando el último llega, no queda nada que mover.
    frame = seconds < STAGGER + TRAVEL ? requestAnimationFrame(tick) : 0;
  };

  const show = () => {
    // El observador avisa también al empezar: con el mismo tamaño no hay nada que rehacer.
    const box = canvas.getBoundingClientRect();
    const key = `${Math.round(box.width)}x${Math.round(box.height)}`;
    if (key === laidOut) return;
    laidOut = key;
    cancelAnimationFrame(frame);
    frame = 0;
    // Si no cabe, vuelve el número escrito como texto.
    const fits = layout();
    canvas.toggleAttribute("data-ready", fits);
    if (!fits) return;
    // Sin movimiento, o si ya se había formado, se dibuja ordenado de una vez.
    if (reducedMotion.matches || started) draw(Infinity);
    else frame = requestAnimationFrame(tick);
  };

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(show, 120);
  }).observe(canvas);
  show();
}
