// helpers compartidos entre el server component de la ficha de jugador y sus
// sub-componentes cliente (career-accordion, rivales-cruces): mismo criterio
// de colores de resultado y de "feat" (cuántos tries en un partido) en todos.

export function resultadoDe(propio: number, rival: number): "w" | "d" | "l" {
  return propio > rival ? "w" : propio === rival ? "d" : "l";
}

export function colorResultado(res: "w" | "d" | "l"): string {
  return res === "w" ? "#003868" : res === "d" ? "#c3d0dd" : "#9c2b1f";
}

export function featShort(tries: number): string {
  if (tries >= 4) return "Póker";
  if (tries === 3) return "Hat-trick";
  if (tries === 2) return "Doblete";
  if (tries === 1) return "Try";
  return "";
}

export function formatFechaCorta(d: Date): string {
  const dia = new Date(d)
    .toLocaleDateString("es-AR", { timeZone: "UTC", weekday: "short" })
    .replace(/\.$/, "");
  const resto = new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
  return `${dia} ${resto}`;
}
