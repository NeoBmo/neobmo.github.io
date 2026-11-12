import type { ImageField } from "./image-field";
import { createGlyphAtlas, type GlyphAtlas } from "./glyph-atlas";
import { GLYPH_STRIDE, createGlyphRenderer, type GlyphRenderer } from "./glyph-renderer";
import { EMPTY, GLYPHS, LOGO_INDEX, NOISE_INDEX, glyphFor } from "./glyphs";
import { clamp, createRandom, easeInOutCubic, easeOutCubic, lerp, smoothstep } from "./math";

/**
 * Seconds. Characters appear one by one, few at first and then many; each
 * travels, lands, and only then do colour and life arrive.
 */
const TIMING = {
  revealStart: 0.2,
  reveal: 1.6,
  departure: 1.4,
  stagger: 1.4,
  travel: 1.7,
  colorStart: 3.2,
  colorDuration: 1.6,
  lifeStart: 4.4,
  lifeDuration: 2.5,
};

/** Points per journey: a random origin, then a stroke that ends at home. */
const STROKE_STEPS = 18;
const POINTS = STROKE_STEPS + 2;
/** Share of the journey spent flying from the noise into the stroke. */
const SWEEP = 0.3;

/** Tamaño máximo y altura del logo, como proporción de la pantalla. */
const LOGO_WIDTH = 0.85;
const LOGO_HEIGHT = 0.5;
const LOGO_TOP = 0.42;
/** Parte de la disolución que dura el viaje de cada carácter hasta el logo. */
const LOGO_TRAVEL = 0.6;
/** Curvatura del viaje: sale siguiendo su pincelada antes de ir al logo. */
const LOGO_ARC = 0.25;
/**
 * El logo es «\|°». Hasta estas fracciones de su ancho llegan la barra inclinada
 * y la barra vertical; el resto es el círculo.
 */
const LOGO_SLASH_END = 0.42;
const LOGO_BAR_END = 0.6;
const LINE_GLYPH = glyphFor(0.5, 0, 1);

/** Altura de la línea de salida del hero y del horizonte que queda tras él. */
const EXIT_LINE_TOP = 0.8;
const HORIZON_TOP = 0.08;

/**
 * Dónde se forma el símbolo de un proyecto y cuánto puede ocupar, como parte de la
 * pantalla: a la derecha del texto en horizontal y sobre él en vertical.
 */
const SYMBOL_WIDE = { x: 0.76, y: 0.5, width: 0.28, height: 0.4 };
const SYMBOL_TALL = { x: 0.5, y: 0.24, width: 0.7, height: 0.26 };
const SYMBOL_MAX_SCALE = 2.2;
/**
 * Los caracteres se dibujan una vez al doble de tamaño: así los símbolos, que los
 * amplían, siguen nítidos.
 */
const ATLAS_DETAIL = 2;

/** Radio de la perturbación del puntero, en alturas de celda, y cuánto empuja. */
const POINTER_RADIUS = 6;
const POINTER_PUSH = 0.3;
/** Desde esta intensidad el carácter empujado vuelve a ser ruido. */
const POINTER_NOISE = 0.35;
/** Celdas que arrastra el scroll a máxima velocidad. */
const SWAY_CELLS = 1.6;
/** Medio grosor del anillo de una onda y cuánto empuja, en alturas de celda. */
const WAVE_WIDTH = 3;
const WAVE_PUSH = 1.4;
/** Valores por onda en la lista que recibe `disturb`: x, y, radio e intensidad. */
export const WAVE_STRIDE = 4;

/** Una figura hecha de caracteres: el carácter `order[j]` va a la posición `j`. */
interface Formation {
  x: Float32Array;
  y: Float32Array;
  size: number;
  /** Carácter de cada posición. */
  glyph: Uint8Array;
  /** Tamaño de cada carácter respecto a su celda. */
  scale: number;
}

export interface ConvergenceOptions {
  canvas: HTMLCanvasElement;
  fontFamily: string;
  seed?: number;
  /** Se llama cuando el navegador devuelve la tarjeta gráfica y hay que redibujar. */
  onRestore?: () => void;
  /** `false` fuerza Canvas 2D. */
  webgl?: boolean;
}

export interface Painting {
  field: ImageField;
  /** Focal point of the cover crop, 0–1 on each axis. */
  focus: { x: number; y: number };
}

/**
 * A field of characters that begins as noise and converges into an image,
 * each glyph following the image's own stroke directions on its way home.
 */
export class Convergence {
  private readonly renderer: GlyphRenderer;
  private readonly canvas: HTMLCanvasElement;
  private readonly fontFamily: string;
  private readonly seed: number;
  private readonly colorLayer = document.createElement("canvas");

  private field!: ImageField;
  private focus = { x: 0.5, y: 0.5 };
  private atlas!: GlyphAtlas;
  private width = 0;
  private height = 0;
  private gridX = 0;
  private gridY = 0;
  private cols = 0;
  private rows = 0;
  private cover = { scale: 1, x: 0, y: 0 };

  private count = 0;
  private path = new Float32Array(0);
  private homeX = new Float32Array(0);
  private homeY = new Float32Array(0);
  private dirX = new Float32Array(0);
  private dirY = new Float32Array(0);
  private phase = new Float32Array(0);
  private appear = new Float32Array(0);
  private departure = new Float32Array(0);
  private noise = new Float32Array(0);
  private luminance = new Float32Array(0);
  private angle = new Float32Array(0);
  private coherence = new Float32Array(0);
  private inLogo = new Uint8Array(0);
  private logoX = new Float32Array(0);
  private logoY = new Float32Array(0);
  private logoGlyph = new Uint8Array(0);
  private logoDelay = new Float32Array(0);
  private fade = new Float32Array(0);
  private order = new Uint32Array(0);
  private formations: Formation[] = [];
  private pointerX = 0;
  private pointerY = 0;
  private force = 0;
  private sway = 0;
  private waves: Float32Array = new Float32Array(0);
  private waveCount = 0;
  private pushX = 0;
  private pushY = 0;
  // Las posiciones se devuelven aquí y no en un array: un objeto por carácter y
  // fotograma obliga al navegador a limpiar memoria a mitad de la animación.
  private atX = 0;
  private atY = 0;
  // Lista de caracteres del fotograma: el dibujo la recibe entera, de una vez.
  private batch = new Float32Array(0);
  private opacity = 1;

  constructor({ canvas, fontFamily, seed = 1890, onRestore = () => {}, webgl }: ConvergenceOptions) {
    this.renderer = createGlyphRenderer(canvas, onRestore, webgl);
    this.canvas = canvas;
    this.fontFamily = fontFamily;
    this.seed = seed;
  }

  layout(
    width: number,
    height: number,
    pixelRatio: number,
    painting: Painting,
    logo: HTMLImageElement,
    /** Agranda los caracteres: menos que dibujar en equipos que no llegan. */
    glyphScale = 1,
    /** Arte ASCII de cada escena que sigue al horizonte, en orden. */
    symbols: readonly (readonly string[])[] = [],
    portrait = false,
  ) {
    this.field = painting.field;
    this.focus = painting.focus;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);

    // Menos de 10.5 px satura las pantallas pequeñas: más caracteres que dibujar y menos pintura.
    const fontSize = Math.round(clamp(width / 120, 10.5, 14) * glyphScale * 2) / 2;
    this.atlas = createGlyphAtlas(fontSize, pixelRatio * ATLAS_DETAIL, this.fontFamily);
    const { cellWidth, cellHeight } = this.atlas;

    this.cols = Math.ceil(width / cellWidth);
    this.rows = Math.ceil(height / cellHeight);
    this.gridX = (width - this.cols * cellWidth) / 2;
    this.gridY = (height - this.rows * cellHeight) / 2;

    const { width: iw, height: ih } = this.field;
    const scale = Math.max(width / iw, height / ih);
    this.cover = {
      scale,
      x: (width - iw * scale) * this.focus.x,
      y: (height - ih * scale) * this.focus.y,
    };

    this.populate(this.sampleCells());
    this.buildFormations(logo, symbols, portrait, pixelRatio);
    this.renderer.setup({
      width,
      height,
      pixelRatio,
      atlas: this.atlas,
      paint: this.colorLayer,
      grid: {
        x: this.gridX,
        y: this.gridY,
        width: this.cols * cellWidth,
        height: this.rows * cellHeight,
      },
    });
  }

  /**
   * Fija cómo altera el visitante el próximo dibujo: `force` (0–1) aparta los
   * caracteres del puntero, `sway` (-1 a 1) los arrastra con el scroll y cada
   * onda de `waves` los empuja al pasar su anillo.
   */
  disturb(
    pointerX: number,
    pointerY: number,
    force: number,
    sway: number,
    waves: Float32Array,
    waveCount: number,
  ) {
    this.pointerX = pointerX;
    this.pointerY = pointerY;
    this.force = force;
    this.sway = sway;
    this.waves = waves;
    this.waveCount = waveCount;
  }

  /**
   * Dibuja el viaje entre formaciones. `stage` 1.5 es la mitad del camino entre
   * la formación 1 y la 2, así que el scroll puede moverla en ambos sentidos.
   */
  renderFormation(stage: number, time: number) {
    const { batch, formations, order } = this;
    const from = clamp(Math.floor(stage), 0, formations.length - 2);
    const mix = clamp(stage - from);
    const start = formations[from];
    const end = formations[from + 1];
    let filled = 0;

    const flicker = Math.floor(time * 12);
    const total = Math.max(start.size, end.size);
    const stirred = this.force > 0 || this.sway !== 0 || this.waveCount > 0;

    for (let j = 0; j < total; j++) {
      const n = order[j];
      const inStart = j < start.size;
      const inEnd = j < end.size;
      let x: number;
      let y: number;
      let glyph: number;
      let scale: number;

      if (inStart && inEnd) {
        const local = easeInOutCubic(clamp((mix - this.logoDelay[n]) / LOGO_TRAVEL));
        x = lerp(start.x[j], end.x[j], local);
        y = lerp(start.y[j], end.y[j], local);
        scale = lerp(start.scale, end.scale, local);
        if (local < 0.1) glyph = start.glyph[j];
        else if (local > 0.9) glyph = end.glyph[j];
        else glyph = NOISE_INDEX[(flicker + ((this.noise[n] * 997) | 0)) % NOISE_INDEX.length];
      } else if (inStart) {
        if (mix > this.fade[n]) continue;
        x = start.x[j];
        y = start.y[j];
        glyph = start.glyph[j];
        scale = start.scale;
      } else {
        if (mix < 1 - this.fade[n]) continue;
        x = end.x[j];
        y = end.y[j];
        glyph = end.glyph[j];
        scale = end.scale;
      }

      if (stirred) {
        // Las figuras no tienen pincelada: el scroll las arrastra en vertical.
        const strength = this.pushAt(x, y, n, 0, -1);
        x += this.pushX;
        y += this.pushY;
        if (strength > POINTER_NOISE) glyph = NOISE_INDEX[(flicker + ((this.noise[n] * 997) | 0)) % NOISE_INDEX.length];
      }

      batch[filled++] = x;
      batch[filled++] = y;
      batch[filled++] = glyph;
      batch[filled++] = scale;
    }

    this.renderer.draw(batch, filled / GLYPH_STRIDE, 0, this.opacity);
  }

  /**
   * Draws the scene at `time` seconds. `still` skips motion entirely.
   * `dissolve` (0–1) lleva de la pintura al logo y funciona en ambos sentidos.
   */
  render(time: number, still = false, dissolve = 0) {
    const { batch } = this;
    const { cellWidth } = this.atlas;
    const t = still ? Infinity : time;
    const life = still ? 0 : smoothstep(TIMING.lifeStart, TIMING.lifeStart + TIMING.lifeDuration, t);
    const base = still ? 1 : easeInOutCubic(clamp((t - TIMING.colorStart) / TIMING.colorDuration));
    const color = base * (1 - dissolve);
    let filled = 0;

    const flicker = Math.floor(time * 12);
    const stirred = !still && (this.force > 0 || this.sway !== 0 || this.waveCount > 0);

    for (let i = 0; i < this.count; i++) {
      if (t < this.appear[i]) continue;
      // Los caracteres que no forman el logo desaparecen uno a uno, sin transparencia.
      if (!this.inLogo[i] && dissolve > this.fade[i]) continue;
      const toLogo = this.inLogo[i]
        ? easeInOutCubic(clamp((dissolve - this.logoDelay[i]) / LOGO_TRAVEL))
        : 0;
      const progress = easeInOutCubic(clamp((t - this.departure[i]) / TIMING.travel));
      let x: number;
      let y: number;
      let glyph: number;

      if (toLogo > 0) {
        this.logoPositionAt(i, toLogo);
        x = this.atX;
        y = this.atY;
        glyph =
          toLogo > 0.9
            ? this.logoGlyph[i]
            : NOISE_INDEX[(flicker + ((this.noise[i] * 997) | 0)) % NOISE_INDEX.length];
      } else if (progress >= 1) {
        const wave = life > 0 ? Math.sin(this.phase[i] - time * 1.4) * life : 0;
        const drift = wave * 0.2 * cellWidth;
        x = this.homeX[i] + this.dirX[i] * drift;
        y = this.homeY[i] + this.dirY[i] * drift;
        glyph = glyphFor(this.luminance[i] + wave * 0.09 * this.coherence[i], this.angle[i], this.coherence[i]);
      } else {
        this.positionAt(i, progress);
        x = this.atX;
        y = this.atY;
        glyph =
          progress > 0.9
            ? glyphFor(this.luminance[i], this.angle[i], this.coherence[i])
            : NOISE_INDEX[(flicker + ((this.noise[i] * 997) | 0)) % NOISE_INDEX.length];
      }

      if (stirred) {
        // La pintura se corre a lo largo de su pincelada, como si el scroll moviera el pincel.
        const strength = this.pushAt(x, y, i, this.dirX[i], this.dirY[i]);
        x += this.pushX;
        y += this.pushY;
        if (strength > POINTER_NOISE) glyph = NOISE_INDEX[(flicker + ((this.noise[i] * 997) | 0)) % NOISE_INDEX.length];
      }

      if (glyph === EMPTY) continue;
      batch[filled++] = x;
      batch[filled++] = y;
      batch[filled++] = glyph;
      batch[filled++] = 1;
    }

    this.renderer.draw(batch, filled / GLYPH_STRIDE, color, this.opacity);
  }

  /**
   * Calcula en `pushX`/`pushY` cuánto se mueve el carácter `n`, que está en (x, y):
   * el scroll lo arrastra sobre el eje dado, el puntero lo aparta y las ondas lo
   * empujan. Devuelve la intensidad con la que lo tocan, de 0 a 1.
   */
  private pushAt(x: number, y: number, n: number, axisX: number, axisY: number) {
    const { cellWidth, cellHeight } = this.atlas;
    const drift = this.sway * (0.4 + this.noise[n]) * cellWidth * SWAY_CELLS;
    this.pushX = axisX * drift;
    this.pushY = axisY * drift;
    let strength = 0;

    const radius = cellHeight * POINTER_RADIUS;
    const dx = x - this.pointerX;
    const dy = y - this.pointerY;
    const squared = dx * dx + dy * dy;
    if (this.force > 0 && squared < radius * radius) {
      const distance = Math.sqrt(squared);
      strength = (1 - distance / radius) ** 2 * this.force;
      const reach = (radius * POINTER_PUSH * strength) / Math.max(distance, 1);
      this.pushX += dx * reach;
      this.pushY += dy * reach;
    }

    // Cada onda es un anillo: solo empuja a quien está cerca de su borde.
    const { waves } = this;
    const band = cellHeight * WAVE_WIDTH;
    for (let w = 0; w < this.waveCount * WAVE_STRIDE; w += WAVE_STRIDE) {
      const fromX = x - waves[w];
      const fromY = y - waves[w + 1];
      const distance = Math.sqrt(fromX * fromX + fromY * fromY);
      const offset = Math.abs(distance - waves[w + 2]);
      if (offset >= band) continue;
      const crest = (1 - offset / band) ** 2 * waves[w + 3];
      const reach = (cellHeight * WAVE_PUSH * crest) / Math.max(distance, 1);
      this.pushX += fromX * reach;
      this.pushY += fromY * reach;
      if (crest > strength) strength = crest;
    }

    return strength;
  }

  /** Fija la opacidad del próximo dibujo, para que el texto de encima se lea. */
  dim(alpha: number) {
    this.opacity = alpha;
  }

  /** Averages the covered image over each cell; the browser does the filtering. */
  private sampleCells() {
    const { cols, rows, cover, field } = this;
    const { cellWidth, cellHeight } = this.atlas;
    const layer = this.colorLayer;
    layer.width = cols;
    layer.height = rows;
    const context = layer.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D canvas is not available");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      field.image,
      (this.gridX - cover.x) / cover.scale,
      (this.gridY - cover.y) / cover.scale,
      (cols * cellWidth) / cover.scale,
      (rows * cellHeight) / cover.scale,
      0, 0, cols, rows,
    );

    const pixels = context.getImageData(0, 0, cols, rows);
    const { data } = pixels;
    const luminance = new Float32Array(cols * rows);
    for (let i = 0; i < luminance.length; i++) {
      const p = i * 4;
      luminance[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
      // Lift the palette so coloured glyphs keep their weight on pure black.
      const peak = Math.max(data[p], data[p + 1], data[p + 2], 1);
      const gain = Math.min(4, lerp(peak, 255, 0.9) / peak);
      data[p] = data[p] * gain;
      data[p + 1] = data[p + 1] * gain;
      data[p + 2] = data[p + 2] * gain;
    }
    context.putImageData(pixels, 0, 0);

    return normalize(luminance);
  }

  private populate(cells: Float32Array) {
    const { cols, rows } = this;
    const { cellWidth, cellHeight } = this.atlas;
    const random = createRandom(this.seed);
    const capacity = cols * rows;

    this.batch = new Float32Array(capacity * GLYPH_STRIDE);
    this.path = new Float32Array(capacity * POINTS * 2);
    this.homeX = new Float32Array(capacity);
    this.homeY = new Float32Array(capacity);
    this.dirX = new Float32Array(capacity);
    this.dirY = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);
    this.appear = new Float32Array(capacity);
    this.departure = new Float32Array(capacity);
    this.noise = new Float32Array(capacity);
    this.luminance = new Float32Array(capacity);
    this.angle = new Float32Array(capacity);
    this.coherence = new Float32Array(capacity);

    const step = cellWidth * 1.4;
    const wavelength = cellWidth * 5;
    let n = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const lum = cells[row * cols + col];
        const hx = this.gridX + (col + 0.5) * cellWidth;
        const hy = this.gridY + (row + 0.5) * cellHeight;
        const fieldIndex = this.fieldIndex(hx, hy);
        const angle = this.field.angle[fieldIndex];
        const coherence = this.field.coherence[fieldIndex];
        if (glyphFor(lum, angle, coherence) === EMPTY) continue;

        this.homeX[n] = hx;
        this.homeY[n] = hy;
        this.luminance[n] = lum;
        this.angle[n] = angle;
        this.coherence[n] = coherence;
        this.dirX[n] = Math.cos(angle);
        this.dirY[n] = Math.sin(angle);
        this.phase[n] = (hx * this.dirX[n] + hy * this.dirY[n]) / wavelength;
        // sqrt skews arrivals late, so the noise grows from a few glyphs to a crowd.
        this.appear[n] = TIMING.revealStart + Math.sqrt(random()) * TIMING.reveal;
        // Light leaves first: stars, then sky, then the village and cypress.
        this.departure[n] = Math.max(
          this.appear[n] + 0.2,
          TIMING.departure + ((1 - lum) * 0.7 + random() * 0.3) * TIMING.stagger,
        );
        this.noise[n] = random();
        this.trace(n, hx, hy, step, random);
        n++;
      }
    }

    this.count = n;
  }

  /** Walks the stroke field backwards from home to build the journey. */
  private trace(n: number, hx: number, hy: number, step: number, random: () => number) {
    const base = n * POINTS * 2;
    const path = this.path;
    path[base] = random() * this.width;
    path[base + 1] = random() * this.height;
    path[base + (POINTS - 1) * 2] = hx;
    path[base + (POINTS - 1) * 2 + 1] = hy;

    const sign = random() < 0.5 ? -1 : 1;
    let x = hx;
    let y = hy;
    let previousX = 0;
    let previousY = 0;

    for (let k = POINTS - 2; k >= 1; k--) {
      const angle = this.field.angle[this.fieldIndex(x, y)];
      let ux = Math.cos(angle) * sign;
      let uy = Math.sin(angle) * sign;
      if (ux * previousX + uy * previousY < 0) {
        ux = -ux;
        uy = -uy;
      }
      previousX = ux;
      previousY = uy;
      x -= ux * step;
      y -= uy * step;
      path[base + k * 2] = x;
      path[base + k * 2 + 1] = y;
    }
  }

  /** Prepara las figuras en orden: logo, línea de salida y horizonte. */
  private buildFormations(
    logo: HTMLImageElement,
    symbols: readonly (readonly string[])[],
    portrait: boolean,
    pixelRatio: number,
  ) {
    const { count } = this;
    const random = createRandom(this.seed + 1);

    this.inLogo = new Uint8Array(count);
    this.logoX = new Float32Array(count);
    this.logoY = new Float32Array(count);
    this.logoGlyph = new Uint8Array(count);
    this.logoDelay = new Float32Array(count);
    this.fade = new Float32Array(count);

    for (let n = 0; n < count; n++) {
      this.logoDelay[n] = random() * (1 - LOGO_TRAVEL);
      this.fade[n] = 0.1 + random() * 0.8;
    }

    // El mismo orden en todas: los caracteres compartidos viajan de una figura a otra.
    this.order = Uint32Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    }

    this.formations = [
      this.logoFormation(logo),
      this.lineFormation(EXIT_LINE_TOP),
      this.lineFormation(HORIZON_TOP),
      ...symbols.map((art) => this.artFormation(art, portrait, pixelRatio)),
    ];

    const [logoShape] = this.formations;
    for (let j = 0; j < logoShape.size; j++) {
      const n = this.order[j];
      this.inLogo[n] = 1;
      this.logoX[n] = logoShape.x[j];
      this.logoY[n] = logoShape.y[j];
      this.logoGlyph[n] = logoShape.glyph[j];
    }
  }

  private logoFormation(logo: HTMLImageElement) {
    const { width, height } = this;
    const { cellWidth, cellHeight } = this.atlas;
    const size = Math.min(width * LOGO_WIDTH, height * LOGO_HEIGHT);
    const cols = Math.round(size / cellWidth);
    const rows = Math.round(size / cellHeight);
    // Sin logo cargado o sin espacio, la pintura se disuelve igual y llega la consola.
    if (!logo.naturalWidth || cols < 1 || rows < 1) return emptyFormation();

    return this.maskFormation(cols, rows, 1, LOGO_TOP, (context) => {
      context.drawImage(logo, 0, 0, cols, rows);
    });
  }

  /** Convierte un dibujo de arte ASCII en figura: cada carácter ocupa su celda. */
  private artFormation(art: readonly string[], portrait: boolean, pixelRatio: number): Formation {
    const { width, height, count } = this;
    const box = portrait ? SYMBOL_TALL : SYMBOL_WIDE;
    const rows = art.length;
    const cols = Math.max(0, ...art.map((line) => line.length));
    if (rows < 1 || cols < 1) return emptyFormation();

    // Crece hasta llenar su hueco, pero nunca encoge por debajo de la letra normal.
    const scale = clamp(
      Math.min(
        (width * box.width) / (cols * this.atlas.cellWidth),
        (height * box.height) / (rows * this.atlas.cellHeight),
      ),
      1,
      SYMBOL_MAX_SCALE,
    );
    const cellWidth = this.atlas.cellWidth * scale;
    const cellHeight = this.atlas.cellHeight * scale;
    // En píxeles enteros de pantalla: a medio píxel, dos caracteres vecinos pintan
    // la misma columna y aparece una raya entre ellos.
    const snap = (value: number) => Math.round(value * pixelRatio) / pixelRatio;
    const left = snap(width * box.x - (cols * cellWidth) / 2);
    const top = snap(height * box.y - (rows * cellHeight) / 2);

    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const glyph = new Uint8Array(count);
    let size = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < art[row].length && size < count; col++) {
        const index = GLYPHS.indexOf(art[row][col]);
        if (index < 0) continue;
        x[size] = left + (col + 0.5) * cellWidth;
        y[size] = top + (row + 0.5) * cellHeight;
        glyph[size] = index;
        size++;
      }
    }

    return { x, y, size, glyph, scale };
  }

  private lineFormation(topRatio: number) {
    const { cols, height } = this;
    const { cellWidth } = this.atlas;
    const size = Math.min(cols, this.count);
    const x = new Float32Array(size);
    const y = new Float32Array(size).fill(height * topRatio);
    for (let j = 0; j < size; j++) x[j] = this.gridX + (j + 0.5) * cellWidth;
    return { x, y, size, glyph: new Uint8Array(size).fill(LINE_GLYPH), scale: 1 };
  }

  /** Convierte en celdas lo que `draw` pinta en una capa del tamaño de la figura. */
  private maskFormation(
    cols: number,
    rows: number,
    scale: number,
    topRatio: number,
    draw: (context: CanvasRenderingContext2D) => void,
  ): Formation {
    const { width, height, count } = this;
    const cellWidth = this.atlas.cellWidth * scale;
    const cellHeight = this.atlas.cellHeight * scale;
    const layer = document.createElement("canvas");
    layer.width = cols;
    layer.height = rows;
    const context = layer.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D canvas is not available");
    context.fillStyle = "#fff";
    draw(context);
    const { data } = context.getImageData(0, 0, cols, rows);

    const left = (width - cols * cellWidth) / 2;
    const top = (height - rows * cellHeight) * topRatio;
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const glyph = new Uint8Array(count);
    let size = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols && size < count; col++) {
        if (data[(row * cols + col) * 4 + 3] < 128) continue;
        x[size] = left + (col + 0.5) * cellWidth;
        y[size] = top + (row + 0.5) * cellHeight;
        // Cada trazo del logo se escribe con el carácter que representa.
        const across = (col + 0.5) / cols;
        glyph[size] = LOGO_INDEX[across < LOGO_SLASH_END ? 0 : across < LOGO_BAR_END ? 1 : 2];
        size++;
      }
    }

    return { x, y, size, glyph, scale };
  }

  /** Deja en `atX`/`atY` el punto del viaje de la pintura al logo. */
  private logoPositionAt(n: number, progress: number) {
    const startX = this.homeX[n];
    const startY = this.homeY[n];
    const endX = this.logoX[n];
    const endY = this.logoY[n];
    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const controlX = (startX + endX) / 2 + this.dirX[n] * distance * LOGO_ARC;
    const controlY = (startY + endY) / 2 + this.dirY[n] * distance * LOGO_ARC;
    this.atX = lerp(lerp(startX, controlX, progress), lerp(controlX, endX, progress), progress);
    this.atY = lerp(lerp(startY, controlY, progress), lerp(controlY, endY, progress), progress);
  }

  /** Deja en `atX`/`atY` el punto del viaje del ruido a la pintura. */
  private positionAt(n: number, progress: number) {
    const base = n * POINTS * 2;
    const path = this.path;

    if (progress < SWEEP) {
      const t = easeOutCubic(progress / SWEEP);
      this.atX = lerp(path[base], path[base + 2], t);
      this.atY = lerp(path[base + 1], path[base + 3], t);
      return;
    }

    const along = ((progress - SWEEP) / (1 - SWEEP)) * (POINTS - 2);
    const segment = Math.min(Math.floor(along), POINTS - 3);
    const t = along - segment;
    const a = base + (segment + 1) * 2;
    this.atX = lerp(path[a], path[a + 2], t);
    this.atY = lerp(path[a + 1], path[a + 3], t);
  }

  private fieldIndex(x: number, y: number) {
    const { width, height } = this.field;
    const ix = clamp(Math.floor((x - this.cover.x) / this.cover.scale), 0, width - 1);
    const iy = clamp(Math.floor((y - this.cover.y) / this.cover.scale), 0, height - 1);
    return iy * width + ix;
  }
}

const emptyFormation = (): Formation => ({
  x: new Float32Array(0),
  y: new Float32Array(0),
  size: 0,
  glyph: new Uint8Array(0),
  scale: 1,
});

/**
 * Stretches luminance between its 2nd and 98th percentiles, then lifts the
 * shadows: on pure black, dark blues need denser glyphs to stay visible.
 */
function normalize(values: Float32Array) {
  const sorted = Float32Array.from(values).sort();
  const low = sorted[Math.floor(sorted.length * 0.02)];
  const high = sorted[Math.floor(sorted.length * 0.98)];
  const range = Math.max(high - low, 1e-3);
  return values.map((value) => clamp((value - low) / range) ** 0.7);
}
