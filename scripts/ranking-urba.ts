/**
 * Ranking URBA: lo comparten el migrador desde el Excel original
 * (migrate-ranking-urba.ts), el importador de la planilla (importar-planilla.ts)
 * y el verificador (db-verificar.ts).
 *
 * Formato en data/base/ranking-urba/AAAA.json: la tabla completa de ese año,
 * tal como la publica la URBA al terminar la temporada.
 *   { temporada, posiciones: [{ posicion, club, variacion }] }
 * variacion: puestos que subió (+) o bajó (−) respecto del año anterior;
 * null si la URBA no la publicó (2014, el primer año que se registró).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const RANKING_URBA_DIR = fileURLToPath(new URL("../data/base/ranking-urba/", import.meta.url));
const CLUBES_CANONICOS = fileURLToPath(new URL("../data/equipos_canonicos.csv", import.meta.url));
export const NOMBRE_PROPIO = "VICENTINOS";

export type PosicionRanking = { posicion: number; club: string; variacion: number | null };
export type RankingUrba = { temporada: number; posiciones: PosicionRanking[] };

/** clave para comparar nombres escritos distinto: sin acentos, puntos, comas ni espacios */
export const claveClub = (nombre: string) =>
  nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// abreviaturas del ranking que no salen solas por la clave
const ALIAS: Record<string, string> = {
  ATROSARIO: "ATLETICO DEL ROSARIO",
  ATSANANDRES: "ATLETICO SAN ANDRES",
  REGATASBV: "REGATAS BELLA VISTA",
  RIVADAVIALOBOS: "RIVADAVIA DE LOBOS",
  // Berazategui figura como MUNIC. BERAZATEGUI desde 2018 (nunca aparecen los dos el mismo año)
  MUNICBERAZATEGUI: "BERAZATEGUI",
  PACGRALRODRIGUEZ: "PAC. GRAL. RODRÍGUEZ",
};

/**
 * Nombre con el que se guarda un club del ranking. En orden:
 * 1. un alias conocido;
 * 2. el nombre del club en clubes.json (así el sitio lo linkea a su historial);
 * 3. como ya figura en otro año del ranking (para que sea el mismo club año a año);
 * 4. tal como vino, sin espacios de más.
 */
export function normalizadorDeClubes(clubesDelSitio: string[], rankingsPrevios: RankingUrba[]) {
  const porClave = new Map<string, string>();
  for (const r of rankingsPrevios) for (const p of r.posiciones) porClave.set(claveClub(p.club), p.club);
  const delSitio = new Map(clubesDelSitio.map((c) => [claveClub(c), c]));
  // cómo aparecían escritos los rivales en el Excel original (ITALIANO → CLUB ITALIANO, etc.)
  for (const linea of readFileSync(CLUBES_CANONICOS, "utf-8").split(/\r?\n/).slice(1)) {
    const coma = linea.indexOf(",");
    const canonico = linea.slice(coma + 1).trim();
    if (coma > 0 && clubesDelSitio.includes(canonico)) delSitio.set(claveClub(linea.slice(0, coma)), canonico);
  }
  for (const [clave, nombre] of delSitio) porClave.set(clave, nombre);
  for (const [clave, nombre] of Object.entries(ALIAS)) porClave.set(clave, delSitio.get(claveClub(nombre)) ?? nombre);
  return (crudo: string) => {
    const limpio = crudo.replace(/\s+/g, " ").trim();
    return porClave.get(claveClub(limpio)) ?? limpio;
  };
}

export function leerRankingsUrba(): RankingUrba[] {
  if (!existsSync(RANKING_URBA_DIR)) return [];
  return readdirSync(RANKING_URBA_DIR)
    .filter((f) => /^\d{4}\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(`${RANKING_URBA_DIR}${f}`, "utf-8")) as RankingUrba);
}

/** una fila por club, así el diff de git muestra exactamente qué puesto cambió */
export function serializarRanking(r: RankingUrba): string {
  const filas = r.posiciones.map((p) => `    ${JSON.stringify(p).replace(/,"/g, ', "').replace(/":/g, '": ')}`);
  return `{\n  "temporada": ${r.temporada},\n  "posiciones": [\n${filas.join(",\n")}\n  ]\n}\n`;
}

export function escribirRanking(r: RankingUrba) {
  mkdirSync(RANKING_URBA_DIR, { recursive: true });
  writeFileSync(`${RANKING_URBA_DIR}${r.temporada}.json`, serializarRanking(r), "utf-8");
}

/** problemas de una tabla: puestos repetidos o salteados, clubes repetidos, Vicentinos ausente */
export function problemasRanking(r: RankingUrba): string[] {
  const out: string[] = [];
  const pos = r.posiciones.map((p) => p.posicion);
  const max = Math.max(...pos);
  for (let i = 1; i <= max; i++) if (!pos.includes(i)) out.push(`${r.temporada}: falta el puesto ${i}`);
  const repPos = pos.filter((p, i) => pos.indexOf(p) !== i);
  if (repPos.length) out.push(`${r.temporada}: puestos repetidos: ${[...new Set(repPos)].join(", ")}`);
  const clubes = r.posiciones.map((p) => p.club);
  const repClub = clubes.filter((c, i) => clubes.indexOf(c) !== i);
  if (repClub.length) out.push(`${r.temporada}: clubes repetidos: ${[...new Set(repClub)].join(", ")}`);
  if (!clubes.includes(NOMBRE_PROPIO)) out.push(`${r.temporada}: ${NOMBRE_PROPIO} no figura en la tabla`);
  return out;
}
