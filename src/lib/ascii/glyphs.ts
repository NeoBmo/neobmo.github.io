/**
 * Character vocabulary. Dense glyphs carry light; the slash family carries
 * direction, so mid tones read as brush strokes instead of flat shading.
 */
export const DENSITY = [".", ":", "+", "*", "#", "@"] as const;
export const STROKES = ["-", "\\", "|", "/"] as const;
export const NOISE = "!#$%&*+-/:;<=>?@[]^_{|}~01".split("");
/** El logo se escribe con sus propios caracteres. */
export const LOGO = ["\\", "|", "°"] as const;

export const GLYPHS = [...new Set([...DENSITY, ...STROKES, ...NOISE, ...LOGO])];

const index = (glyph: string) => GLYPHS.indexOf(glyph);
const DENSITY_INDEX = DENSITY.map(index);
const STROKE_INDEX = STROKES.map(index);
export const NOISE_INDEX = NOISE.map(index);
export const LOGO_INDEX = LOGO.map(index);

export const EMPTY = -1;

/** Picks the glyph for a normalized luminance and stroke orientation. */
export function glyphFor(luminance: number, angle: number, coherence: number): number {
  if (luminance < 0.1) return EMPTY;
  if (luminance < 0.2) return DENSITY_INDEX[0];
  if (luminance < 0.3) return DENSITY_INDEX[1];

  if (luminance < 0.72 && coherence > 0.25) {
    // Fold the undirected angle into [0, π) and bucket it into four strokes.
    const folded = ((angle % Math.PI) + Math.PI) % Math.PI;
    return STROKE_INDEX[Math.round(folded / (Math.PI / 4)) % 4];
  }

  if (luminance < 0.6) return DENSITY_INDEX[2];
  if (luminance < 0.78) return DENSITY_INDEX[3];
  if (luminance < 0.9) return DENSITY_INDEX[4];
  return DENSITY_INDEX[5];
}
