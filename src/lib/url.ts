/** Prefixes a site path with the deploy base, e.g. "/proyectos/blog". */
export const href = (path: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

/**
 * Si un enlace de contacto es un perfil público (GitHub, LinkedIn). El correo y
 * WhatsApp son vías de contacto, no perfiles: no van en `sameAs` ni con `rel="me"`.
 */
export const isProfile = (url: string) =>
  url.startsWith("https://") && new URL(url).hostname !== "wa.me";
