import Link from "next/link";
import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import {
  getResumenTemporadas,
  getPartidosDetalleTemporada,
  getTemporadasDisponibles,
  getTemporadaInfo,
  getDebutantesTemporada,
} from "@/lib/queries";
import { PartidoDetalleCard } from "@/components/partido-detalle-card";
import { SectionHeading } from "@/components/section-heading";
import { TemporadaTabs } from "@/components/temporada-tabs";
import { JugadorLink } from "@/components/jugador-link";
import { TarjetaIcon } from "@/components/tarjeta-icon";

export const dynamic = "force-dynamic";

// un "módulo" agrupa varias métricas relacionadas en un único contenedor,
// para que se lean como un grupo sin necesitar un título
function StatGroup({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div className={`grid ${cols} gap-2 rounded-lg border border-navy-light p-3 sm:gap-3`}>{children}</div>
  );
}

// contenedor sin grid propio, para módulos que combinan varias sub-filas
// (ej. jugadores/tries separados de puntos/puntos en contra/diferencia)
function StatBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-navy-light p-3">{children}</div>;
}

function Stat({
  label,
  value,
  valueClassName = "text-navy-dark",
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  size?: "lg" | "md" | "sm" | "xs";
}) {
  const textSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : size === "xs" ? "text-xs" : "text-lg";
  return (
    <div className="text-center">
      <div className={`${textSize} font-semibold ${valueClassName}`}>{value}</div>
      <div className="text-xs text-navy/70">{label}</div>
    </div>
  );
}


export default async function TemporadaPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const temporada = Number(year);

  const [resumenes, partidos, temporadasDisponibles, info, debutantes] = await Promise.all([
    getResumenTemporadas(),
    getPartidosDetalleTemporada(temporada),
    getTemporadasDisponibles(),
    getTemporadaInfo(temporada),
    getDebutantesTemporada(temporada),
  ]);
  const resumen = resumenes.find((r) => r.temporada === temporada);
  if (!resumen) notFound();

  const logros: string[] = [];
  if (info?.campeon) logros.push("🏆 Campeón");
  if (info?.ascenso) logros.push("Ascenso");
  if (info?.descenso) logros.push("Descenso");

  const tieneFoto = existsSync(path.join(process.cwd(), "public", "temporadas", `${temporada}.jpg`));

  // temporadasDisponibles viene ordenado descendente
  const idx = temporadasDisponibles.indexOf(temporada);
  const anterior = idx >= 0 ? temporadasDisponibles[idx + 1] : undefined;
  const siguiente = idx > 0 ? temporadasDisponibles[idx - 1] : undefined;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-navy/70 hover:text-orange">
        ← Inicio
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-dark">Temporada {temporada}</h1>
        <div className="flex items-center gap-3 text-sm">
          {anterior ? (
            <Link href={`/temporadas/${anterior}`} className="text-navy hover:text-orange">
              ← {anterior}
            </Link>
          ) : (
            <span className="text-navy/30">←</span>
          )}
          {siguiente ? (
            <Link href={`/temporadas/${siguiente}`} className="text-navy hover:text-orange">
              {siguiente} →
            </Link>
          ) : (
            <span className="text-navy/30">→</span>
          )}
        </div>
      </div>
      {logros.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/70">
          {logros.map((l) => (
            <span key={l} className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
              {l}
            </span>
          ))}
        </p>
      )}
      {info && (info.torneo || info.nota) && (
        <p className="mt-1 text-sm text-navy/70">
          {info.torneo ?? "Sin torneo"}
          {info.posicion ? ` · Posición ${info.posicion}` : ""}
          {info.rankingUrba ? ` · Ranking URBA ${info.rankingUrba}` : ""}
          {info.nota ? ` · ${info.nota}` : ""}
        </p>
      )}

      <div className="mt-4">
        <TemporadaTabs
          basePath="/temporadas"
          temporadas={temporadasDisponibles}
          temporadaActiva={temporada}
          mode="path"
          hideHistorico
        />
      </div>

      {tieneFoto && (
        <div className="relative mt-6 aspect-[1125/714] w-full overflow-hidden rounded-lg border border-navy-light bg-navy-light">
          <Image
            src={`/temporadas/${temporada}.jpg`}
            alt={`Foto del equipo - temporada ${temporada}`}
            fill
            className="object-cover object-[center_87%]"
          />
        </div>
      )}

      {(() => {
        const dif = resumen.puntosFavor - resumen.puntosContra;
        return (
          <>
            {/* 1. partidos: lo más importante */}
            <div className="mt-6">
              <StatGroup cols="grid-cols-4">
                <Stat label="PJ" value={resumen.partidosJugados} size="lg" />
                <Stat label="Ganados" value={resumen.ganados} size="lg" valueClassName="text-green-600" />
                <Stat label="Empatados" value={resumen.empatados} size="lg" valueClassName="text-orange" />
                <Stat label="Perdidos" value={resumen.perdidos} size="lg" valueClassName="text-red-600" />
              </StatGroup>
            </div>

            {/* 2. jugadores/tries por un lado, puntos a favor/en contra/diferencia agrupados aparte */}
            <div className="mt-3">
              <StatBox>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Jugadores" value={resumen.jugadores} />
                  <Stat label="Tries" value={resumen.tries} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-navy-light pt-3">
                  <Stat label="Puntos" value={resumen.puntosFavor} />
                  <Stat label="Puntos en contra" value={resumen.puntosContra} />
                  <Stat
                    label="Diferencia"
                    value={dif > 0 ? `+${dif}` : dif}
                    valueClassName={dif > 0 ? "text-green-600" : dif < 0 ? "text-red-600" : "text-navy-dark"}
                  />
                </div>
              </StatBox>
            </div>

            {/* 3. tarjetas: de fondo, ya no compiten en jerarquía con lo anterior */}
            <div className="mt-3">
              <StatGroup cols="grid-cols-2">
                <div className="flex items-center justify-center gap-1.5">
                  <TarjetaIcon tipo="AMARILLA" />
                  <span className="text-base font-semibold text-navy-dark">{resumen.tarjetasAmarillas}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <TarjetaIcon tipo="ROJA" />
                  <span className="text-base font-semibold text-navy-dark">{resumen.tarjetasRojas}</span>
                </div>
              </StatGroup>
            </div>

            {/* 4. distinciones individuales de la temporada */}
            <div className="mt-3">
              <StatGroup cols="grid-cols-2">
                <Stat
                  label="Tryman"
                  size="xs"
                  value={
                    resumen.maxTryScorer ? (
                      <JugadorLink id={resumen.maxTryScorer.jugadorId}>
                        {resumen.maxTryScorer.nombre} ({resumen.maxTryScorer.tries})
                      </JugadorLink>
                    ) : (
                      "-"
                    )
                  }
                />
                <Stat
                  label="Goleador"
                  size="xs"
                  value={
                    resumen.maxPuntosScorer ? (
                      <JugadorLink id={resumen.maxPuntosScorer.jugadorId}>
                        {resumen.maxPuntosScorer.nombre} ({resumen.maxPuntosScorer.puntos})
                      </JugadorLink>
                    ) : (
                      "-"
                    )
                  }
                />
              </StatGroup>
            </div>

            <p className="mt-3 text-center text-sm">
              <Link
                href={`/rankings/puntos?temporada=${temporada}`}
                className="text-navy hover:text-orange"
              >
                Ver rankings de temporada →
              </Link>
            </p>
          </>
        );
      })()}

      {debutantes.length > 0 && (
        <>
          <div className="mt-8">
            <SectionHeading>{debutantes.length} Debutantes</SectionHeading>
          </div>
          <p className="mt-1 text-sm text-navy/70">Jugaron su primer partido como titular esta temporada.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {debutantes.map((d) => (
              <JugadorLink
                key={d.jugadorId}
                id={d.jugadorId}
                className="rounded-full border border-navy-light px-2.5 py-1 text-xs font-medium text-navy hover:border-orange hover:bg-orange-light"
              >
                {d.nombre}
                {d.camada && <span className="text-navy/50"> · {d.camada}</span>}
              </JugadorLink>
            ))}
          </div>
        </>
      )}

      <div className="mt-8">
        <SectionHeading>Partidos</SectionHeading>
      </div>
      <p className="mt-1 text-sm text-navy/70">Tocá un partido para ver el detalle completo.</p>
      <div className="mt-3 divide-y divide-navy-light border-y border-navy-light">
        {partidos.map((p, i) => (
          <PartidoDetalleCard key={p.id} partido={p} numero={i + 1} />
        ))}
        {partidos.length === 0 && <p className="py-6 text-center text-navy/50">Sin partidos registrados.</p>}
      </div>
    </main>
  );
}
