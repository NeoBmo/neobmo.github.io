/**
 * Símbolos de los proyectos, dibujados con los caracteres del lienzo. Cada
 * carácter que no es un espacio ocupa una celda; todos deben existir en `GLYPHS`.
 */
export const SYMBOL_NAMES = ["notebook", "ledger", "tag", "phone", "loop"] as const;

export type SymbolName = (typeof SYMBOL_NAMES)[number];

export const SYMBOLS: Record<SymbolName, readonly string[]> = {
  // Un cuaderno con líneas escritas: el blog.
  notebook: [
    "+--------------------+",
    "| #  --------------  |",
    "|                    |",
    "|  ----------------  |",
    "|  -----------       |",
    "|  --------------    |",
    "|  ---------         |",
    "|                    |",
    "|  > _               |",
    "+--------------------+",
  ],
  // Un libro de cuentas: filas, columnas y cifras.
  ledger: [
    "+------+------+------+",
    "| ==== | ---- |  01  |",
    "+------+------+------+",
    "| ==== | ---- |  10  |",
    "+------+------+------+",
    "| ==== | ---- |  11  |",
    "+------+------+------+",
  ],
  // Una etiqueta de cierre: HTML, CSS y JavaScript sin nada más.
  tag: [
    String.raw`            /       `,
    String.raw`   /       /    \   `,
    String.raw`  /       /      \  `,
    String.raw` <       /        > `,
    String.raw`  \     /        /  `,
    String.raw`   \   /        /   `,
    String.raw`      /             `,
  ],
  // Un bucle de seis pasos: el recorrido de cada tarea.
  loop: [
    "[ # ]--->[ # ]--->[ # ]",
    "  ^                 |  ",
    "  |                 |  ",
    "  |                 |  ",
    "[ # ]<---[ # ]<---[ # ]",
  ],
  // Un teléfono: la primera aplicación móvil.
  phone: [
    "+------------+",
    "|    ----    |",
    "|            |",
    "|  ########  |",
    "|  ########  |",
    "|  ####      |",
    "|            |",
    "|  [  01  ]  |",
    "|            |",
    "|     __     |",
    "+------------+",
  ],
};
