import type { GlyphAtlas } from "./glyph-atlas";
import { GLYPHS } from "./glyphs";

/** Lo que el dibujo necesita saber del lienzo. Cambia solo al recolocar. */
export interface GlyphStage {
  /** Tamaño del lienzo en píxeles CSS. */
  width: number;
  height: number;
  pixelRatio: number;
  atlas: GlyphAtlas;
  /** Un píxel de color por celda de la rejilla. */
  paint: HTMLCanvasElement;
  /** Rectángulo que ocupa la rejilla, en píxeles CSS. */
  grid: { x: number; y: number; width: number; height: number };
}

/** Valores por carácter en la lista que recibe `draw`: x, y, glifo y escala. */
export const GLYPH_STRIDE = 4;

export interface GlyphRenderer {
  setup(stage: GlyphStage): void;
  /**
   * Dibuja `count` caracteres. `color` (0–1) los tiñe con la pintura y
   * `opacity` atenúa el conjunto.
   */
  draw(glyphs: Float32Array, count: number, color: number, opacity: number): void;
}

/**
 * WebGL dibuja todos los caracteres en una sola orden; Canvas 2D necesita una
 * por carácter y con miles no llega a 60 fps. Queda como respaldo sin WebGL.
 *
 * Lanza un error si la tarjeta gráfica rechaza el programa de dibujo. Ese lienzo
 * ya no sirve para Canvas 2D: quien llama debe reintentar con otro y `webgl: false`.
 */
export function createGlyphRenderer(
  canvas: HTMLCanvasElement,
  onRestore: () => void,
  webgl = true,
): GlyphRenderer {
  const gl = webgl ? canvas.getContext("webgl", { antialias: false }) : null;
  if (gl) return webglRenderer(canvas, gl, onRestore);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  return canvasRenderer(canvas, context);
}

// Cada carácter es un punto cuadrado del alto de la celda; el glifo ocupa la
// franja central, porque la celda es más estrecha que alta.
const VERTEX = `
attribute vec4 glyph;
uniform vec2 viewport;
uniform float pointSize;
uniform float glyphCount;
varying float offset;

void main() {
  vec2 clip = glyph.xy / viewport * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = pointSize * glyph.w;
  offset = glyph.z / glyphCount;
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D atlas;
uniform sampler2D paint;
uniform float glyphCount;
uniform float aspect;
uniform float inset;
uniform vec4 grid;
uniform float canvasHeight;
uniform float color;
uniform float opacity;
varying float offset;

void main() {
  float u = (gl_PointCoord.x - 0.5) / aspect + 0.5;
  if (u < 0.0 || u > 1.0) discard;
  // Medio píxel hacia dentro: en el borde exacto de la celda se colaría el
  // carácter vecino del atlas y dejaría una raya.
  u = clamp(u, inset, 1.0 - inset);
  float alpha = texture2D(atlas, vec2(offset + u / glyphCount, gl_PointCoord.y)).a * opacity;
  vec2 pixel = vec2(gl_FragCoord.x, canvasHeight - gl_FragCoord.y);
  vec3 tint = texture2D(paint, (pixel - grid.xy) / grid.zw).rgb;
  gl_FragColor = vec4(mix(vec3(1.0), tint, color) * alpha, alpha);
}`;

function webglRenderer(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  onRestore: () => void,
): GlyphRenderer {
  let program: WebGLProgram;
  let atlasTexture: WebGLTexture;
  let paintTexture: WebGLTexture;
  let colorUniform: WebGLUniformLocation | null;
  let opacityUniform: WebGLUniformLocation | null;
  let stage: GlyphStage | undefined;
  const uniform = (name: string) => gl.getUniformLocation(program, name);

  const shader = (type: number, source: string) => {
    const compiled = gl.createShader(type)!;
    gl.shaderSource(compiled, source);
    gl.compileShader(compiled);
    return compiled;
  };

  const texture = (unit: number) => {
    const created = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, created);
    // Las texturas no son potencias de dos: WebGL 1 exige este ajuste.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return created;
  };

  /** Crea lo que vive en la tarjeta gráfica. Se repite si el navegador la reinicia. */
  const build = () => {
    program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error("WebGL rejected the glyph program");
    }
    gl.useProgram(program);
    colorUniform = uniform("color");
    opacityUniform = uniform("opacity");

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    const glyph = gl.getAttribLocation(program, "glyph");
    gl.enableVertexAttribArray(glyph);
    gl.vertexAttribPointer(glyph, GLYPH_STRIDE, gl.FLOAT, false, 0, 0);

    atlasTexture = texture(0);
    paintTexture = texture(1);
    gl.uniform1i(uniform("atlas"), 0);
    gl.uniform1i(uniform("paint"), 1);
    gl.uniform1f(uniform("glyphCount"), GLYPHS.length);

    // Los colores salen ya multiplicados por su transparencia.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  };

  const setup = (next: GlyphStage) => {
    stage = next;
    const { width, height, pixelRatio, atlas, paint, grid } = next;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, paintTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paint);

    gl.uniform2f(uniform("viewport"), width, height);
    gl.uniform1f(uniform("pointSize"), atlas.cellHeight * pixelRatio);
    gl.uniform1f(uniform("aspect"), atlas.cellWidth / atlas.cellHeight);
    gl.uniform1f(uniform("inset"), 0.5 / atlas.sourceWidth);
    gl.uniform1f(uniform("canvasHeight"), canvas.height);
    gl.uniform4f(
      uniform("grid"),
      grid.x * pixelRatio,
      grid.y * pixelRatio,
      grid.width * pixelRatio,
      grid.height * pixelRatio,
    );
  };

  // El navegador puede quitarle la tarjeta gráfica a la página (pestaña en segundo
  // plano, poca memoria). Al devolverla hay que crear todo otra vez y redibujar.
  canvas.addEventListener("webglcontextlost", (event) => event.preventDefault());
  canvas.addEventListener("webglcontextrestored", () => {
    build();
    if (stage) setup(stage);
    onRestore();
  });

  build();

  return {
    setup,
    draw(glyphs, count, color, opacity) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (count < 1) return;
      gl.uniform1f(colorUniform, color);
      gl.uniform1f(opacityUniform, opacity);
      gl.bufferData(gl.ARRAY_BUFFER, glyphs.subarray(0, count * GLYPH_STRIDE), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.POINTS, 0, count);
    },
  };
}

function canvasRenderer(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): GlyphRenderer {
  let stage: GlyphStage | undefined;

  return {
    setup(next) {
      stage = next;
    },
    draw(glyphs, count, color, opacity) {
      if (!stage) return;
      const { width, height, pixelRatio, atlas, paint, grid } = stage;
      const { cellWidth, cellHeight, sourceWidth, sourceHeight } = atlas;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      context.clearRect(0, 0, width, height);

      for (let i = 0; i < count * GLYPH_STRIDE; i += GLYPH_STRIDE) {
        const drawWidth = cellWidth * glyphs[i + 3];
        const drawHeight = cellHeight * glyphs[i + 3];
        context.drawImage(
          atlas.canvas,
          glyphs[i + 2] * sourceWidth, 0, sourceWidth, sourceHeight,
          glyphs[i] - drawWidth / 2, glyphs[i + 1] - drawHeight / 2, drawWidth, drawHeight,
        );
      }

      if (color > 0) {
        // Tiñe solo lo ya dibujado: los caracteres toman el color de la pintura.
        context.globalCompositeOperation = "source-atop";
        context.globalAlpha = color;
        context.imageSmoothingEnabled = true;
        context.drawImage(paint, grid.x, grid.y, grid.width, grid.height);
      }

      if (opacity < 1) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = "destination-in";
        context.globalAlpha = opacity;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
  };
}
