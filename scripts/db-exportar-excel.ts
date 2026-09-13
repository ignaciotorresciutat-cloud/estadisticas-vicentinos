/**
 * Vuelca la base a un .xlsx de SOLO LECTURA, para mirar/filtrar/compartir.
 *
 * Ojo: esto es un snapshot para entender los datos, no una fuente de verdad.
 * La fuente de verdad sigue siendo data/base/*.json. Este Excel nunca se
 * vuelve a importar — si se necesita corregir algo, se edita el JSON.
 */
import * as XLSX from "xlsx";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const OUT_PATH = fileURLToPath(new URL("../data/exportado.xlsx", import.meta.url));

async function main() {
  const [clubes, jugadores, temporadasInfo, partidos] = await Promise.all([
    prisma.club.findMany({ orderBy: { id: "asc" } }),
    prisma.jugador.findMany({ orderBy: { id: "asc" } }),
    prisma.temporadaInfo.findMany({ orderBy: { temporada: "asc" } }),
    prisma.partido.findMany({
      orderBy: [{ temporada: "asc" }, { fecha: "asc" }],
      include: {
        rival: true,
        participaciones: { include: { jugador: true, ingresoPor: true }, orderBy: { id: "asc" } },
        puntos: { include: { jugador: true }, orderBy: { id: "asc" } },
        tarjetas: { include: { jugador: true }, orderBy: { id: "asc" } },
      },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // --- Resumen ---
  const resumen = [
    { tabla: "Club", filas: clubes.length },
    { tabla: "Jugador", filas: jugadores.length },
    { tabla: "TemporadaInfo", filas: temporadasInfo.length },
    { tabla: "Partido", filas: partidos.length },
    { tabla: "Participacion", filas: partidos.reduce((a, p) => a + p.participaciones.length, 0) },
    { tabla: "Puntuacion", filas: partidos.reduce((a, p) => a + p.puntos.length, 0) },
    { tabla: "Tarjeta", filas: partidos.reduce((a, p) => a + p.tarjetas.length, 0) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

  // --- Club ---
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(clubes.map((c) => ({ id: c.id, nombreCanonico: c.nombreCanonico }))),
    "Club"
  );

  // --- Jugador ---
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      jugadores.map((j) => ({
        id: j.id,
        nombreCanonico: j.nombreCanonico,
        camada: j.camada,
        vicentinoN: j.vicentinoN,
        esJugadorReal: j.esJugadorReal,
      }))
    ),
    "Jugador"
  );

  // --- TemporadaInfo ---
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      temporadasInfo.map((t) => ({
        temporada: t.temporada,
        torneo: t.torneo,
        posicion: t.posicion,
        rankingUrba: t.rankingUrba,
        campeon: t.campeon,
        ascenso: t.ascenso,
        descenso: t.descenso,
        nota: t.nota,
      }))
    ),
    "TemporadaInfo"
  );

  // --- Partido (una fila por partido, con el rival ya resuelto) ---
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      partidos.map((p) => ({
        id: p.id,
        temporada: p.temporada,
        fecha: p.fecha.toISOString().slice(0, 10),
        rival: p.rival.nombreCanonico,
        condicion: p.condicion,
        resultadoPropio: p.resultadoPropio,
        resultadoRival: p.resultadoRival,
        cancha: p.cancha,
        clima: p.clima,
        campoDeJuego: p.campoDeJuego,
        referee: p.referee,
        categoria: p.categoria,
        fechaNota: p.fechaNota,
      }))
    ),
    "Partido"
  );

  // --- Participacion (una fila por jugador-partido, con nombres resueltos) ---
  const filasParticipacion = partidos.flatMap((p) =>
    p.participaciones.map((pa) => ({
      partidoId: p.id,
      temporada: p.temporada,
      fecha: p.fecha.toISOString().slice(0, 10),
      rival: p.rival.nombreCanonico,
      jugador: pa.jugador.nombreCanonico,
      rol: pa.rol,
      numeroCamiseta: pa.numeroCamiseta,
      capitan: pa.capitan,
      entraPor: pa.ingresoPor?.nombreCanonico ?? null,
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasParticipacion), "Participacion");

  // --- Puntuacion ---
  const filasPuntuacion = partidos.flatMap((p) =>
    p.puntos.map((pt) => ({
      partidoId: p.id,
      temporada: p.temporada,
      fecha: p.fecha.toISOString().slice(0, 10),
      rival: p.rival.nombreCanonico,
      jugador: pt.jugador.nombreCanonico,
      tipo: pt.tipo,
      cantidad: pt.cantidad,
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasPuntuacion), "Puntuacion");

  // --- Tarjeta ---
  const filasTarjeta = partidos.flatMap((p) =>
    p.tarjetas.map((t) => ({
      partidoId: p.id,
      temporada: p.temporada,
      fecha: p.fecha.toISOString().slice(0, 10),
      rival: p.rival.nombreCanonico,
      jugador: t.jugador.nombreCanonico,
      tipo: t.tipo,
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasTarjeta), "Tarjeta");

  XLSX.writeFile(wb, OUT_PATH);
  console.log(`✅ Exportado a data/exportado.xlsx`);
  console.log(`   Hojas: Resumen, Club, Jugador, TemporadaInfo, Partido, Participacion, Puntuacion, Tarjeta`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
