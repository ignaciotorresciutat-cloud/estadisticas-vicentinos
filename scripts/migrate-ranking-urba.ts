/**
 * Migración única: trae a data/base/ranking-urba/ el ranking URBA de cada año
 * desde la hoja RANKING URBA del Excel original del recolector.
 *
 *   npm run archivo:migrate-ranking-urba -- <excel.xlsx>
 *
 * En esa hoja cada año ocupa un bloque de columnas (posición, club,
 * variación) desde la fila 6. 2020 no tiene tabla (sin actividad por la
 * pandemia) y 2014 no trae variación.
 */
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { escribirRanking, normalizadorDeClubes, problemasRanking, type RankingUrba } from "./ranking-urba";

// primera columna (posición) de cada año en la hoja
const BLOQUES: Record<number, string> = {
  2014: "B", 2015: "F", 2016: "J", 2017: "N", 2018: "R", 2019: "V",
  2021: "AD", 2022: "AH", 2023: "AL", 2024: "AP", 2025: "BH", 2026: "BL",
};
// celdas vacías en el original, completadas a partir de la tabla del año anterior
const COMPLETAR: Record<string, string> = {
  // puesto 35 de 2026 sin nombre: es SAN MARTÍN (31° en 2025, variación −4; confirmado por el club)
  "2026|35": "SAN MARTÍN",
};

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: npm run archivo:migrate-ranking-urba -- <excel.xlsx>");
  process.exit(1);
}
const hoja = XLSX.readFile(archivo).Sheets["RANKING URBA"];
if (!hoja) throw new Error("El Excel no tiene la hoja RANKING URBA");

const clubes = (JSON.parse(readFileSync(fileURLToPath(new URL("../data/base/clubes.json", import.meta.url)), "utf-8")) as { nombre: string }[])
  .map((c) => c.nombre);
const col = (letra: string, desplazamiento: number) => XLSX.utils.encode_col(XLSX.utils.decode_col(letra) + desplazamiento);

// primero se leen todos los años crudos, para que el nombre elegido para un
// club que no es rival sea el mismo en todos los años (la versión con acentos)
const crudos: RankingUrba[] = Object.entries(BLOQUES).map(([anio, c]) => {
  const posiciones = [];
  for (let fila = 6; fila <= 101; fila++) {
    const pos = hoja[`${c}${fila}`]?.v;
    if (typeof pos !== "number") continue;
    const club = hoja[`${col(c, 1)}${fila}`]?.v ?? COMPLETAR[`${anio}|${pos}`];
    if (typeof club !== "string" || !club.trim()) continue;
    const v = hoja[`${col(c, 2)}${fila}`]?.v;
    posiciones.push({ posicion: pos, club, variacion: Number(anio) === 2014 || typeof v !== "number" ? null : v });
  }
  return { temporada: Number(anio), posiciones };
});

const conAcento = (s: string) => /[^\x00-\x7F]/.test(s);
const preferidos: RankingUrba[] = [{
  temporada: 0,
  posiciones: crudos.flatMap((r) => r.posiciones).filter((p) => conAcento(p.club)).map((p) => ({ ...p, club: p.club.replace(/\s+/g, " ").trim() })),
}];
const normalizar = normalizadorDeClubes(clubes, preferidos);

for (const r of crudos) {
  const ranking = { temporada: r.temporada, posiciones: r.posiciones.map((p) => ({ ...p, club: normalizar(p.club) })) };
  const problemas = problemasRanking(ranking);
  escribirRanking(ranking);
  const propia = ranking.posiciones.find((p) => p.club === "VICENTINOS");
  console.log(`${r.temporada}: ${ranking.posiciones.length} clubes, Vicentinos ${propia?.posicion}°${problemas.length ? `  ⚠️ ${problemas.join("; ")}` : ""}`);
}
