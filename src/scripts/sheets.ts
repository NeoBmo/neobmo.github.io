/**
 * Ventanas de lectura: un enlace con `data-sheet` abre su texto encima de la
 * página en vez de navegar. El enlace sigue apuntando a la página de detalle,
 * que es lo que se abre sin JavaScript o en otra pestaña.
 */
export function mountSheets() {
  for (const opener of document.querySelectorAll<HTMLAnchorElement>("a[data-sheet]")) {
    const sheet = document.getElementById(opener.dataset.sheet ?? "");
    if (!(sheet instanceof HTMLDialogElement)) continue;

    opener.addEventListener("click", (event) => {
      // Con una tecla modificadora se quiere la página en otra pestaña o ventana.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      sheet.showModal();
      sheet.querySelector("[data-sheet-body]")?.scrollTo(0, 0);
      // Una entrada en el historial: el botón «atrás» cierra la ventana.
      history.pushState({ sheet: sheet.id }, "");
    });

    // Fuera del texto solo queda el fondo: un clic ahí cierra.
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) sheet.close();
    });

    // Cerrada con Esc o con el botón, su entrada del historial sobra.
    sheet.addEventListener("close", () => {
      if (history.state?.sheet === sheet.id) history.back();
    });
  }

  addEventListener("popstate", () => {
    document.querySelector<HTMLDialogElement>("dialog[open]")?.close();
  });
}
