// Genera la imagen de las vistas previas (WhatsApp, LinkedIn, X, Slack):
// 1200x630, el logo a la izquierda (~30 %) y, a la derecha, el caos de
// caracteres que se va ordenando hasta formar La noche estrellada, con el
// mismo vocabulario que el lienzo del sitio.
// Uso: node scripts/prepare-share.mjs [salida]
import sharp from "sharp";
import { glyphFor, GLYPHS, NOISE } from "../src/lib/ascii/glyphs.ts";

const [output = "src/assets/share.png"] = process.argv.slice(2);

const SIZE = { width: 1200, height: 630 };
/** Franja del logo: el 30 % izquierdo. */
const LOGO_PANEL = 360;
const LOGO_HEIGHT = 300;
/** Rejilla de caracteres de la pintura. */
const CELL = { width: 8, height: 14 };
const FONT_SIZE = 13;

const cols = Math.floor((SIZE.width - LOGO_PANEL) / CELL.width);
const rows = Math.floor(SIZE.height / CELL.height);
const left = SIZE.width - cols * CELL.width;
const top = Math.round((SIZE.height - rows * CELL.height) / 2);

// Semilla fija: el mismo script da siempre la misma imagen.
let seed = 7;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Un píxel de la pintura por celda, igual que la rejilla del lienzo. Primero
// se recorta a la proporción del área real; luego se reparte en celdas, que
// son más altas que anchas.
const area = await sharp("src/assets/starry-night.webp")
  .resize(cols * CELL.width, rows * CELL.height, { fit: "cover" })
  .toBuffer();
const { data } = await sharp(area)
  .resize(cols, rows, { fit: "fill" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const luminance = new Float32Array(cols * rows);
for (let i = 0; i < luminance.length; i++) {
  luminance[i] = (0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]) / 255;
}

/** Orientación del trazo (perpendicular al gradiente) y su coherencia. */
function stroke(x, y) {
  let a = 0;
  let b = 0;
  let c = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = Math.min(cols - 2, Math.max(1, x + dx));
      const py = Math.min(rows - 2, Math.max(1, y + dy));
      const at = (u, v) => luminance[(py + v) * cols + px + u];
      const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
      const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
      a += gx * gx;
      b += gx * gy;
      c += gy * gy;
    }
  }
  const trace = a + c;
  return {
    angle: 0.5 * Math.atan2(2 * b, a - c) + Math.PI / 2,
    coherence: trace > 1e-6 ? Math.sqrt((a - c) ** 2 + 4 * b * b) / trace : 0,
  };
}

const escape = (glyph) => glyph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const texts = [];
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const i = y * cols + x;
    // De izquierda a derecha, el caos se ordena: junto al logo casi todo es
    // ruido; al otro lado, la pintura completa.
    const order = smoothstep(0.05, 0.6, x / cols);
    const px = left + x * CELL.width;
    const py = top + y * CELL.height + FONT_SIZE - 2;

    if (random() < order) {
      const { angle, coherence } = stroke(x, y);
      const glyph = glyphFor(luminance[i], angle, coherence);
      if (glyph < 0) continue;
      // Los caracteres toman el color de la pintura, algo aclarado sobre negro.
      const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]].map((v) =>
        Math.min(255, Math.round(v * 1.25 + 18)),
      );
      texts.push(`<text x="${px}" y="${py}" fill="rgb(${r},${g},${b})">${escape(GLYPHS[glyph])}</text>`);
    } else if (random() < 0.55 * (1 - order) + 0.08) {
      // Ruido blanco, desplazado de su celda: aún no encontró su sitio.
      const glyph = NOISE[Math.floor(random() * NOISE.length)];
      const jitterX = (random() - 0.5) * CELL.width * 2 * (1 - order);
      const jitterY = (random() - 0.5) * CELL.height * 2 * (1 - order);
      const opacity = (0.18 + random() * 0.5).toFixed(2);
      texts.push(
        `<text x="${(px + jitterX).toFixed(1)}" y="${(py + jitterY).toFixed(1)}" fill="#fff" fill-opacity="${opacity}">${escape(glyph)}</text>`,
      );
    }
  }
}

const field = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE.width}" height="${SIZE.height}">
  <g font-family="JetBrains Mono, Consolas, monospace" font-size="${FONT_SIZE}" font-weight="700">${texts.join("")}</g>
</svg>`,
);

const logo = await sharp("src/assets/logo.svg", { density: 300 }).resize({ height: LOGO_HEIGHT }).toBuffer();
const { width: logoWidth } = await sharp(logo).metadata();

const info = await sharp({ create: { ...SIZE, channels: 3, background: "#000" } })
  .composite([
    { input: field, top: 0, left: 0 },
    {
      input: logo,
      top: Math.round((SIZE.height - LOGO_HEIGHT) / 2),
      left: Math.round((LOGO_PANEL - logoWidth) / 2) + 10,
    },
  ])
  .png({ compressionLevel: 9, palette: true, colours: 128, effort: 10 })
  .toFile(output);

console.log(`${output}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
