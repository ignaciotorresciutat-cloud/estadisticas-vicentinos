/**
 * Exporta la base a archivos de texto versionables (data/base/).
 *
 * A partir de acá esos archivos son la fuente de verdad: el .db se reconstruye
 * desde ellos con `npm run db:build`. La ventaja es que un cambio en los datos
 * se ve como un diff legible en git, en vez de un binario opaco.
 *
 * El orden de todo es determinístico a propósito: exportar dos veces sin
 * cambios tiene que dar archivos idénticos, así el diff sólo muestra lo que
 * realmente cambió.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const BASE_DIR = fileURLToPath(new URL("../data/base/", import.meta.url));
const TEMPORADAS_DIR = `${BASE_DIR}temporadas/`;

function escribir(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function main() {
  mkdirSync(TEMPORADAS_DIR, { recursive: true });

  // --- catálogos ---
  // los ids se guardan explícitos porque están en las URLs del sitio
  // (/jugadores/[id], /historial/[clubId]): si cambiaran, se romperían
  // los links que ya se compartieron.
  const clubes = await prisma.club.findMany({ orderBy: { id: "asc" } });
  escribir(`${BASE_DIR}clubes.json`, clubes.map((c) => ({ id: c.id, nombre: c.nombreCanonico })));

  const jugadores = await prisma.jugador.findMany({ orderBy: { id: "asc" } });
  escribir(
    `${BASE_DIR}jugadores.json`,
    jugadores.map((j) => ({
      id: j.id,
      nombre: j.nombreCanonico,
      camada: j.camada,
      vicentinoN: j.vicentinoN,
      esJugadorReal: j.esJugadorReal,
    }))
  );

  const clubPorId = new Map(clubes.map((c) => [c.id, c.nombreCanonico]));
  const jugadorPorId = new Map(jugadores.map((j) => [j.id, j.nombreCanonico]));

  // --- temporadas ---
  const infos = await prisma.temporadaInfo.findMany({ orderBy: { temporada: "asc" } });
  const infoPorTemporada = new Map(infos.map((t) => [t.temporada, t]));

  const partidos = await prisma.partido.findMany({
    orderBy: [{ temporada: "asc" }, { fecha: "asc" }, { id: "asc" }],
    include: {
      participaciones: { orderBy: { id: "asc" } },
      puntos: { orderBy: { id: "asc" } },
      tarjetas: { orderBy: { id: "asc" } },
    },
  });

  const porTemporada = new Map<number, typeof partidos>();
  for (const p of partidos) {
    const lista = porTemporada.get(p.temporada) ?? [];
    lista.push(p);
    porTemporada.set(p.temporada, lista);
  }

  const temporadas = [...new Set([...porTemporada.keys(), ...infoPorTemporada.keys()])].sort();

  for (const temporada of temporadas) {
    const info = infoPorTemporada.get(temporada);
    const lista = porTemporada.get(temporada) ?? [];

    const salida = {
      temporada,
      info: info
        ? {
            torneo: info.torneo,
            posicion: info.posicion,
            rankingUrba: info.rankingUrba,
            campeon: info.campeon,
            ascenso: info.ascenso,
            descenso: info.descenso,
            nota: info.nota,
          }
        : null,
      partidos: lista.map((p) => {
        const titulares = p.participaciones
          .filter((x) => x.rol === "TITULAR")
          .sort((a, b) => (a.numeroCamiseta ?? 99) - (b.numeroCamiseta ?? 99) || a.id - b.id);
        const suplentes = p.participaciones.filter((x) => x.rol !== "TITULAR");

        return {
          fecha: p.fecha.toISOString().slice(0, 10),
          fechaNota: p.fechaNota,
          rival: clubPorId.get(p.rivalId)!,
          condicion: p.condicion,
          resultadoPropio: p.resultadoPropio,
          resultadoRival: p.resultadoRival,
          cancha: p.cancha,
          clima: p.clima,
          campoDeJuego: p.campoDeJuego,
          referee: p.referee,
          categoria: p.categoria,
          formacion: titulares.map((t) => ({
            numero: t.numeroCamiseta,
            jugador: jugadorPorId.get(t.jugadorId)!,
            ...(t.capitan ? { capitan: true } : {}),
          })),
          cambios: suplentes.map((s) => ({
            jugador: jugadorPorId.get(s.jugadorId)!,
            ...(s.numeroCamiseta !== null ? { numero: s.numeroCamiseta } : {}),
            ...(s.capitan ? { capitan: true } : {}),
            entraPor: s.ingresoPorId ? jugadorPorId.get(s.ingresoPorId)! : null,
          })),
          puntos: p.puntos.map((pt) => ({
            jugador: jugadorPorId.get(pt.jugadorId)!,
            tipo: pt.tipo,
            cantidad: pt.cantidad,
          })),
          tarjetas: p.tarjetas.map((t) => ({
            jugador: jugadorPorId.get(t.jugadorId)!,
            tipo: t.tipo,
          })),
        };
      }),
    };

    escribir(`${TEMPORADAS_DIR}${temporada}.json`, salida);
  }

  console.log(`✅ Exportado a data/base/`);
  console.log(`   ${clubes.length} clubes, ${jugadores.length} jugadores`);
  console.log(`   ${temporadas.length} temporadas, ${partidos.length} partidos`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
