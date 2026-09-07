/**
 * Carga data/temporadas_info.csv (torneo/posición/ascensos-descensos por
 * temporada, confirmado a mano por el usuario) a la tabla TemporadaInfo.
 * Reset + reinsert, mismo patrón que el resto de la migración.
 */
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

type FilaTemporadaInfo = {
  temporada: number;
  torneo: string | null;
  posicion: number | null;
  rankingUrba: number | null;
  campeon: boolean;
  ascenso: boolean;
  descenso: boolean;
  nota: string | null;
};

function parseCsv(path: string): FilaTemporadaInfo[] {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1); // skip header
  const filas: FilaTemporadaInfo[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const [temporada, torneo, posicion, rankingUrba, campeon, ascenso, descenso, nota] = line.split(",");
    filas.push({
      temporada: Number(temporada),
      torneo: torneo.trim() || null,
      posicion: posicion.trim() ? Number(posicion) : null,
      rankingUrba: rankingUrba.trim() ? Number(rankingUrba) : null,
      campeon: campeon.trim().toLowerCase() === "true",
      ascenso: ascenso.trim().toLowerCase() === "true",
      descenso: descenso.trim().toLowerCase() === "true",
      nota: nota?.trim() || null,
    });
  }
  return filas;
}

export async function seedTemporadasInfo(csvPath: string): Promise<number> {
  const filas = parseCsv(csvPath);
  await prisma.temporadaInfo.deleteMany();
  for (const fila of filas) {
    await prisma.temporadaInfo.create({ data: fila });
  }
  return filas.length;
}
