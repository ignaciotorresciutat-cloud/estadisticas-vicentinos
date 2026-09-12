// para que "volver" pueda usar el historial real del navegador (te devuelve
// exactamente a la página anterior) en vez de un destino fijo, y para que
// el TEXTO del botón nunca prometa algo que no es: si la página anterior
// real no es la sección que el botón nombra, el texto pasa a ser genérico.
// Todo esto vive en sessionStorage porque persiste a través de refrescos de
// página pero es propio de cada pestaña, igual que el historial real.
const NAV_DEPTH_KEY = "vicentinos:navDepth";
const CURR_PATH_KEY = "vicentinos:currPath";
const PREV_PATH_KEY = "vicentinos:prevPath";

// se llama una sola vez, con la ruta con la que arrancó la pestaña (no
// cuenta como navegación, pero deja la base para que la próxima sí pueda
// calcular bien cuál fue "la anterior").
export function registrarRutaInicial(pathname: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CURR_PATH_KEY, pathname);
}

// se llama en cada cambio de ruta real (no en el mount inicial de la
// pestaña). Guarda la ruta anterior antes de pisarla con la nueva.
export function registrarNavegacion(pathname: string) {
  if (typeof window === "undefined") return;
  const actual = sessionStorage.getItem(CURR_PATH_KEY);
  if (actual !== null) sessionStorage.setItem(PREV_PATH_KEY, actual);
  sessionStorage.setItem(CURR_PATH_KEY, pathname);
  const depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? 0);
  sessionStorage.setItem(NAV_DEPTH_KEY, String(depth + 1));
}

export function hayHistorialInterno(): boolean {
  if (typeof window === "undefined") return false;
  return Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? 0) > 0;
}

// ¿la página de la que realmente vengo cae dentro de la sección "prefix"
// (ej. "/jugadores")? Si no hay historial interno, el destino de respaldo
// ES el destino real, así que "coincide" por definición.
export function volverCoincideCon(prefix: string): boolean {
  if (!hayHistorialInterno()) return true;
  const prev = typeof window !== "undefined" ? sessionStorage.getItem(PREV_PATH_KEY) : null;
  if (prev === null) return true;
  if (prefix === "/") return prev === "/";
  return prev === prefix || prev.startsWith(`${prefix}/`);
}
