/**
 * Aplica data/participacion_correcciones.csv a partidos que YA existen en la
 * base (mismo patrón que aplicar-correcciones-resultado.ts). Cubre dos
 * casos:
 *  - reasignar: había una participación cargada a nombre del jugador
 *    equivocado (ej. un cambio con las dos puntas invertidas) -> se
 *    reasigna esa misma fila al jugador correcto.
 *  - agregar: al jugador correcto directamente le faltaba la participación
 *    (no había ninguna fila equivocada que reasignar) -> se crea.
 *
 * No borra ni reimporta nada más. Uso: agregar la fila al CSV y correr
 * `npm run corregir:participaciones`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const CSV_PATH = fileURLToPath(new URL("../data/participacion_correcciones.csv", import.meta.url));

function norm(s: string): string {
  return s.replace(/ /g, " ").trim().replace(/\s+/g, " ");
}

async function getJugadorId(nombreCanonico: string): Promise<number | null> {
  const j = await prisma.jugador.findUnique({ where: { nombreCanonico } });
  return j?.id ?? null;
}

async function main() {
  const lines = readFileSync(CSV_PATH, "utf-8")
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => l.trim());

  let aplicadas = 0;
  let yaEstaban = 0;
  let sinPartido = 0;
  let sinJugador = 0;

  for (const line of lines) {
    const [temporadaStr, fecha, rivalRaw, rolRaw, numeroCamisetaStr, jugadorCorrectoRaw, ingresoPorCorrectoRaw, jugadorIncorrectoRaw] =
      line.split(",");
    const temporada = Number(temporadaStr);
    const rival = norm(rivalRaw ?? "");
    const rol = norm(rolRaw ?? "") as "TITULAR" | "SUPLENTE";
    const numeroCamiseta = numeroCamisetaStr && numeroCamisetaStr.trim() ? Number(numeroCamisetaStr) : null;
    const jugadorCorrecto = norm(jugadorCorrectoRaw ?? "");
    const ingresoPorCorrecto = norm(ingresoPorCorrectoRaw ?? "") || null;
    const jugadorIncorrecto = norm(jugadorIncorrectoRaw ?? "") || null;
    if (!temporada || !fecha || !rival || !jugadorCorrecto || (rol !== "TITULAR" && rol !== "SUPLENTE")) continue;

    const partido = await prisma.partido.findFirst({
      where: {
        temporada,
        fecha: { gte: new Date(`${fecha}T00:00:00.000Z`), lt: new Date(`${fecha}T23:59:59.999Z`) },
        rival: { nombreCanonico: rival },
      },
    });
    if (!partido) {
      console.log(`  (sin partido todavía: ${temporada} ${fecha} vs ${rival})`);
      sinPartido++;
      continue;
    }

    const jugadorCorrectoId = await getJugadorId(jugadorCorrecto);
    if (!jugadorCorrectoId) {
      console.log(`  (jugador no encontrado en la base: "${jugadorCorrecto}")`);
      sinJugador++;
      continue;
    }
    const ingresoPorId = ingresoPorCorrecto ? await getJugadorId(ingresoPorCorrecto) : null;

    const yaCorrecta = await prisma.participacion.findFirst({
      where: { partidoId: partido.id, jugadorId: jugadorCorrectoId, rol },
    });
    if (yaCorrecta && (yaCorrecta.ingresoPorId ?? null) === ingresoPorId) {
      yaEstaban++;
      continue;
    }

    const incorrectoId = jugadorIncorrecto ? await getJugadorId(jugadorIncorrecto) : null;
    const filaIncorrecta = incorrectoId
      ? await prisma.participacion.findFirst({ where: { partidoId: partido.id, jugadorId: incorrectoId } })
      : null;

    if (filaIncorrecta) {
      console.log(
        `  Partido #${partido.id} (${fecha} vs ${rival}): reasigno participación de "${jugadorIncorrecto}" a "${jugadorCorrecto}"`
      );
      await prisma.participacion.update({
        where: { id: filaIncorrecta.id },
        data: { jugadorId: jugadorCorrectoId, rol, numeroCamiseta, ingresoPorId },
      });
    } else {
      console.log(`  Partido #${partido.id} (${fecha} vs ${rival}): agrego participación de "${jugadorCorrecto}"`);
      await prisma.participacion.create({
        data: { partidoId: partido.id, jugadorId: jugadorCorrectoId, rol, numeroCamiseta, capitan: false, ingresoPorId },
      });
    }
    aplicadas++;
  }

  console.log(
    `\n✅ ${aplicadas} corrección(es) aplicada(s). ${yaEstaban} ya estaban bien. ${sinPartido} sin partido todavía. ${sinJugador} con jugador no encontrado.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
