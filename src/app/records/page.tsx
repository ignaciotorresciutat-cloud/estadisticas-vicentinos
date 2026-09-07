import Link from "next/link";
import { getRecords, type PuntoCalendario } from "@/lib/queries";
import { ClubLink } from "@/components/club-link";
import { JugadorLink } from "@/components/jugador-link";

export const dynamic = "force-dynamic";

function formatFecha(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function RecordCard({
  emoji,
  titulo,
  valor,
  detalle,
}: {
  emoji: string;
  titulo: string;
  valor: React.ReactNode;
  detalle: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-navy-light p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-navy/70">
        <span className="text-xl">{emoji}</span>
        {titulo}
      </div>
      <div className="mt-2 text-xl font-bold text-navy-dark">{valor}</div>
      <div className="mt-1 text-sm text-navy/70">{detalle}</div>
    </div>
  );
}

function RangoFechas({ desde, hasta }: { desde: PuntoCalendario; hasta: PuntoCalendario }) {
  const mismoPartido = desde.fecha.getTime() === hasta.fecha.getTime();
  if (mismoPartido) {
    return (
      <>
        vs <ClubLink id={desde.rivalId}>{desde.rival}</ClubLink> · {formatFecha(desde.fecha)} · Temporada{" "}
        <Link href={`/temporadas/${desde.temporada}`} className="text-navy hover:text-orange">
          {desde.temporada}
        </Link>
      </>
    );
  }
  return (
    <>
      Desde vs <ClubLink id={desde.rivalId}>{desde.rival}</ClubLink> ({formatFecha(desde.fecha)}) hasta vs{" "}
      <ClubLink id={hasta.rivalId}>{hasta.rival}</ClubLink> ({formatFecha(hasta.fecha)})
    </>
  );
}

export default async function RecordsPage() {
  const records = await getRecords();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Récords</h1>
      <p className="mt-1 text-sm text-navy/70">Las mejores marcas históricas del club.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {records.mayorVictoria && (
          <RecordCard
            emoji="🔥"
            titulo="Victoria más abultada"
            valor={`${records.mayorVictoria.resultadoPropio} - ${records.mayorVictoria.resultadoRival}`}
            detalle={<RangoFechas desde={records.mayorVictoria} hasta={records.mayorVictoria} />}
          />
        )}

        {records.mayorPuntuacion && (
          <RecordCard
            emoji="💯"
            titulo="Más puntos anotados en un partido"
            valor={`${records.mayorPuntuacion.resultadoPropio} puntos`}
            detalle={
              <>
                <RangoFechas desde={records.mayorPuntuacion} hasta={records.mayorPuntuacion} /> · Resultado:{" "}
                {records.mayorPuntuacion.resultadoPropio} - {records.mayorPuntuacion.resultadoRival}
              </>
            }
          />
        )}

        {records.partidoMasTries && (
          <RecordCard
            emoji="🏉"
            titulo="Partido con más tries"
            valor={`${records.partidoMasTries.tries} tries`}
            detalle={
              <>
                <RangoFechas desde={records.partidoMasTries} hasta={records.partidoMasTries} /> · Resultado:{" "}
                {records.partidoMasTries.resultadoPropio} - {records.partidoMasTries.resultadoRival}
              </>
            }
          />
        )}

        {records.jugadorMasTriesPartido && (
          <RecordCard
            emoji="🎩"
            titulo="Más tries de un jugador en un partido"
            valor={
              <JugadorLink id={records.jugadorMasTriesPartido.jugadorId}>
                {records.jugadorMasTriesPartido.nombre}
              </JugadorLink>
            }
            detalle={
              <>
                {records.jugadorMasTriesPartido.cantidad} tries ·{" "}
                <RangoFechas desde={records.jugadorMasTriesPartido} hasta={records.jugadorMasTriesPartido} />
              </>
            }
          />
        )}

        {records.temporadaMasTries && (
          <RecordCard
            emoji="📅"
            titulo="Temporada con más tries"
            valor={`${records.temporadaMasTries.cantidad} tries`}
            detalle={
              <>
                Temporada{" "}
                <Link
                  href={`/temporadas/${records.temporadaMasTries.temporada}`}
                  className="text-navy hover:text-orange"
                >
                  {records.temporadaMasTries.temporada}
                </Link>
              </>
            }
          />
        )}

        {records.rachaVictorias && (
          <RecordCard
            emoji="📈"
            titulo="Racha de victorias más larga"
            valor={`${records.rachaVictorias.cantidad} victorias seguidas`}
            detalle={<RangoFechas desde={records.rachaVictorias.desde} hasta={records.rachaVictorias.hasta} />}
          />
        )}

        {records.jugadorMasPartidosConsecutivos && (
          <RecordCard
            emoji="🛡️"
            titulo="Más partidos consecutivos sin faltar"
            valor={
              <JugadorLink id={records.jugadorMasPartidosConsecutivos.jugadorId}>
                {records.jugadorMasPartidosConsecutivos.nombre}
              </JugadorLink>
            }
            detalle={
              <>
                {records.jugadorMasPartidosConsecutivos.cantidad} partidos seguidos ·{" "}
                <RangoFechas
                  desde={records.jugadorMasPartidosConsecutivos.desde}
                  hasta={records.jugadorMasPartidosConsecutivos.hasta}
                />
              </>
            }
          />
        )}

        {records.jugadorRachaTries && (
          <RecordCard
            emoji="⚡"
            titulo="Racha de tries más larga de un jugador"
            valor={
              <JugadorLink id={records.jugadorRachaTries.jugadorId}>{records.jugadorRachaTries.nombre}</JugadorLink>
            }
            detalle={
              <>
                Convirtió try en {records.jugadorRachaTries.cantidad} partidos seguidos ·{" "}
                <RangoFechas desde={records.jugadorRachaTries.desde} hasta={records.jugadorRachaTries.hasta} />
              </>
            }
          />
        )}
      </div>
    </main>
  );
}
