/**
 * Aplica data/resultados_correcciones.csv a partidos que YA existen en la
 * base. El importador (migrate.ts) solo aplica esas correcciones al crear un
 * partido nuevo; un partido ya cargado no se vuelve a tocar aunque se le
 * agregue una fila acá. Este script es el complemento: recorre el CSV,
 * busca cada partido por temporada+fecha+rival y, si el resultado guardado
 * no coincide con la corrección, lo actualiza puntualmente (no borra ni
 * reimporta nada más).
 *
 * Uso: agregar la fila a data/resultados_correcciones.csv y correr
 * `npm run corregir:resultados`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const RESULTADOS_CSV = fileURLToPath(new URL("../data/resultados_correcciones.csv", import.meta.url));

function norm(s: string): string {
  return s.replace(/ /g, " ").trim().replace(/\s+/g, " ");
}

async function main() {
  const text = readFileSync(RESULTADOS_CSV, "utf-8");
  const lines = text
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => l.trim());

  let aplicadas = 0;
  let yaEstaban = 0;
  let sinPartido = 0;

  for (const line of lines) {
    const [temporadaStr, fecha, rivalRaw, propioStr, rivalStr] = line.split(",");
    const temporada = Number(temporadaStr);
    const rival = norm(rivalRaw ?? "");
    const resultadoPropio = Number(propioStr);
    const resultadoRival = Number(rivalStr);
    if (!temporada || !fecha || !rival || Number.isNaN(resultadoPropio) || Number.isNaN(resultadoRival)) continue;

    const partido = await prisma.partido.findFirst({
      where: {
        temporada,
        fecha: { gte: new Date(`${fecha}T00:00:00.000Z`), lt: new Date(`${fecha}T23:59:59.999Z`) },
        rival: { nombreCanonico: rival },
      },
    });

    if (!partido) {
      console.log(`  (todavía no existe: ${temporada} ${fecha} vs ${rival} — se va a aplicar solo cuando se importe)`);
      sinPartido++;
      continue;
    }

    if (partido.resultadoPropio === resultadoPropio && partido.resultadoRival === resultadoRival) {
      yaEstaban++;
      continue;
    }

    console.log(
      `  Partido #${partido.id} (${fecha} vs ${rival}): ${partido.resultadoPropio}-${partido.resultadoRival} -> ${resultadoPropio}-${resultadoRival}`
    );
    await prisma.partido.update({ where: { id: partido.id }, data: { resultadoPropio, resultadoRival } });
    aplicadas++;
  }

  console.log(`\n✅ ${aplicadas} corrección(es) aplicada(s). ${yaEstaban} ya estaban bien. ${sinPartido} sin partido todavía.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
