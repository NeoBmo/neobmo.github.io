/**
 * Símbolos de los proyectos, dibujados con los caracteres del lienzo. Cada
 * carácter que no es un espacio ocupa una celda; todos deben existir en `GLYPHS`.
 */
export const SYMBOL_NAMES = ["notebook", "ledger", "tag", "phone", "loop", "skills", "stairs"] as const;

export type SymbolName = (typeof SYMBOL_NAMES)[number];

/** Un tramo de un símbolo que se enciende aparte: fila, columna y ancho. */
export type SymbolPart = readonly [row: number, col: number, width: number];

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
  // Un bucle de seis pasos: el recorrido de cada tarea, que el agente da solo.
  loop: [
    "[ # ]--->[ # ]--->[ # ]",
    "  ^                 |  ",
    "  |                 |  ",
    "  |                 |  ",
    "[ # ]<---[ # ]<---[ # ]",
  ],
  // Tres skills que se conectan al agente: cada una, saber que carga cuando hace falta.
  skills: [
    "[ # ]   [ * ]   [ @ ]",
    "  |       |       |  ",
    "  +-------+-------+  ",
    "          |          ",
    "+-------------------+",
    "|  > _              |",
    "|  -------------    |",
    "|  ---------        |",
    "+-------------------+",
  ],
  // Una escalera: cada proyecto deja algo y el siguiente empieza un peldaño más arriba.
  stairs: [
    "                    +-----",
    "                    |     ",
    "              +-----+     ",
    "              |           ",
    "        +-----+           ",
    "        |                 ",
    "  +-----+                 ",
    "  |                       ",
    "--+                       ",
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

/**
 * Partes de cada símbolo que se encienden por turnos, en el orden del recorrido:
 * así la figura se mueve sola mientras se lee su escena.
 */
export const SYMBOL_PARTS: Partial<Record<SymbolName, readonly SymbolPart[]>> = {
  // Los seis nodos del bucle, en el sentido de las flechas.
  loop: [
    [0, 0, 5],
    [0, 9, 5],
    [0, 18, 5],
    [4, 18, 5],
    [4, 9, 5],
    [4, 0, 5],
  ],
  // Las tres skills, una tras otra.
  skills: [
    [0, 0, 5],
    [0, 8, 5],
    [0, 16, 5],
  ],
  // Los peldaños, de abajo arriba.
  stairs: [
    [8, 0, 3],
    [6, 2, 7],
    [4, 8, 7],
    [2, 14, 7],
    [0, 20, 6],
  ],
};
