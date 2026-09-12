import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

// lee data/temporadas_info.csv y upsertea cada fila por "temporada" (clave
// única): nunca borra, solo crea o actualiza el año que corresponda. Se usa
// desde migrate.ts en cada corrida, así que agregar o corregir una temporada
// es simplemente editar el CSV y volver a migrar.
export async function seedTemporadasInfo(csvPath: string): Promise<number> {
  const text = readFileSync(csvPath, "utf-8");
  const lines = text
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => l.trim());

  let count = 0;

  for (const line of lines) {
    const [temporadaStr, torneo, posicionStr, rankingUrbaStr, campeonStr, ascensoStr, descensoStr, nota] =
      line.split(",");
    const temporada = Number(temporadaStr);
    if (!temporada) continue;

    const data = {
      torneo: torneo || null,
      posicion: posicionStr ? Number(posicionStr) : null,
      rankingUrba: rankingUrbaStr ? Number(rankingUrbaStr) : null,
      campeon: campeonStr === "1",
      ascenso: ascensoStr === "1",
      descenso: descensoStr === "1",
      nota: nota || null,
    };

    await prisma.temporadaInfo.upsert({
      where: { temporada },
      create: { temporada, ...data },
      update: data,
    });
    count++;
  }

  return count;
}
