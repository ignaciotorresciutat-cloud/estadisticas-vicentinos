const NUMEROS_EN_PALABRAS = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
];

export function numeroEnPalabras(n: number): string {
  if (n >= 0 && n < NUMEROS_EN_PALABRAS.length) return NUMEROS_EN_PALABRAS[n];
  return formatNumero(n);
}

// cantidad + sustantivo en español, con la apócope de "uno" a "un"/"una"
// cuando el número modifica directamente al sustantivo (ej. "un empate",
// no "uno empate"; "una victoria", no "uno victoria")
export function cantidadConSustantivo(
  n: number,
  singular: string,
  plural: string,
  genero: "m" | "f" = "m"
): string {
  if (n === 1) return `${genero === "f" ? "una" : "un"} ${singular}`;
  return `${numeroEnPalabras(n)} ${plural}`;
}

export function formatNumero(n: number): string {
  return n.toLocaleString("es-AR");
}

// diferencia con signo, usando el signo menos tipográfico (−, U+2212) para
// los negativos en vez del guion ASCII, como hace el resto del sitio
export function formatDif(n: number): string {
  if (n > 0) return `+${formatNumero(n)}`;
  if (n < 0) return `−${formatNumero(Math.abs(n))}`;
  return formatNumero(n);
}
