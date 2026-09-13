import Link from "next/link";
import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getResumenTemporadas,
  getPartidosDetalleTemporada,
  getTemporadasDisponibles,
  getTemporadaInfo,
  getDebutantesTemporada,
  getResumenClub,
  type PartidoDetalle,
} from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { SeasonYearPicker } from "@/components/season-year-picker";
import { TarjetaIcon } from "@/components/tarjeta-icon";
import { formatNumero, formatDif } from "@/lib/format";

const NOMBRE_TIPO_PUNTO: Record<string, string> = {
  TRY: "Tries",
  CONVERSION: "Conversiones",
  PENAL: "Penales",
  DROP: "Drops",
};

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatFechaCorta(d: Date): string {
  const dia = new Date(d)
    .toLocaleDateString("es-AR", { timeZone: "UTC", weekday: "short" })
    .replace(/\.$/, "");
  const resto = new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
  return `${dia} ${resto}`;
}

// pre-genera una página por cada temporada jugada, así el sitio no depende
// de que alguien la visite una vez para que quede estática.
export async function generateStaticParams() {
  const temporadas = await getTemporadasDisponibles();
  return temporadas.map((y) => ({ year: String(y) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  const temporada = Number(year);
  const [resumenes, info] = await Promise.all([getResumenTemporadas(), getTemporadaInfo(temporada)]);
  const resumen = resumenes.find((r) => r.temporada === temporada);
  if (!resumen) return { title: `Temporada ${temporada} · Club Vicentinos` };
  const title = info?.campeon
    ? `Campeón de ${info.torneo} ${temporada} · Club Vicentinos`
    : `Temporada ${temporada} · Club Vicentinos`;
  const description = `${resumen.ganados}G ${resumen.empatados}E ${resumen.perdidos}P · ${resumen.tries} tries · ${resumen.jugadores} jugadores.`;
  return { title, description, openGraph: { title, description } };
}

export default async function TemporadaPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const temporada = Number(year);

  const [resumenes, partidos, temporadasDisponibles, info, debutantes, club] = await Promise.all([
    getResumenTemporadas(),
    getPartidosDetalleTemporada(temporada),
    getTemporadasDisponibles(),
    getTemporadaInfo(temporada),
    getDebutantesTemporada(temporada),
    getResumenClub(),
  ]);
  const resumen = resumenes.find((r) => r.temporada === temporada);
  if (!resumen) notFound();

  const dif = resumen.puntosFavor - resumen.puntosContra;
  const division = info?.torneo ? `${info.torneo}${info.posicion ? ` · ${info.posicion}º` : ""}` : "Sin torneo";
  const seasonMeta = `${division} · ${resumen.jugadores} jugadores · ${resumen.partidosJugados} partidos`;
  const empatadosLabel = resumen.empatados === 1 ? "Empatado" : "Empatados";
  const debutantesLabel = `${debutantes.length} ${debutantes.length === 1 ? "debutante" : "debutantes"}`;

  const tieneFoto = existsSync(path.join(process.cwd(), "public", "temporadas", `${temporada}.jpg`));
  const añosNav = [...temporadasDisponibles].reverse();

  const shareData = {
    kicker: `Temporada ${temporada}`,
    title: info?.campeon ? `Campeón de ${info.torneo}` : (info?.torneo ?? `Temporada ${temporada}`),
    sub: `${resumen.ganados} ganados · ${resumen.empatados} ${empatadosLabel.toLowerCase()} · ${resumen.perdidos} perdidos`,
    stats: [
      { label: "Puntos a favor", value: resumen.puntosFavor },
      { label: "Tries", value: resumen.tries },
      { label: "Jugadores", value: resumen.jugadores },
    ],
  };

  return (
    <main>
      {/* mobile: hero navy con header propio de la pantalla */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-[26px]">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
            share={shareData}
          />
          <div className="mt-5 flex items-center gap-2">
            <SeasonYearPicker temporadas={temporadasDisponibles} actual={temporada} />
          </div>
          {(info?.campeon || info?.ascenso) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {info?.campeon && (
                <div className="inline-flex min-h-6 items-center rounded-[5px] bg-orange px-2.5 font-mono text-[9.5px] font-semibold tracking-[.09em] text-navy-dark uppercase">
                  Campeón
                </div>
              )}
              {info?.ascenso && (
                <div
                  className="inline-flex min-h-6 items-center rounded-[5px] px-2.5 font-mono text-[9.5px] font-semibold tracking-[.09em] text-white uppercase"
                  style={{ border: "1px solid rgba(255,255,255,.4)" }}
                >
                  Ascenso
                </div>
              )}
            </div>
          )}
          <p className="mt-3.5 text-[13.5px] leading-[1.5] text-white/78">{seasonMeta}</p>
        </div>
      </section>

      {/* desktop: barra sticky para saltar de año, debajo del header fijo */}
      <div className="sticky top-[72px] z-[15] hidden border-b border-navy/[.12] bg-white lg:block">
        <div className="mx-auto flex max-w-[1280px] gap-2 overflow-x-auto px-10 py-3.5">
          {añosNav.map((y) => (
            <Link
              key={y}
              href={`/temporadas/${y}`}
              className="flex min-h-9 flex-none items-center rounded-full px-[15px] font-mono text-[12.5px] font-semibold tabular-nums"
              style={{
                border: `1px solid ${y === temporada ? "#003868" : "rgba(0,56,104,.16)"}`,
                background: y === temporada ? "#003868" : "#fff",
                color: y === temporada ? "#f89c38" : "#003868",
              }}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      {/* desktop: hero navy sin header propio (el header general ya está fijo arriba) */}
      <section className="hidden bg-navy lg:block">
        <div className="mx-auto grid max-w-[1280px] items-end gap-14 px-10 py-[52px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange uppercase">Temporada</div>
            <div className="mt-3 flex flex-wrap items-baseline gap-5">
              <div className="font-mono text-[76px] leading-none font-semibold tracking-[-.04em] text-white tabular-nums">
                {temporada}
              </div>
              {info?.campeon && (
                <div className="inline-flex min-h-[30px] items-center rounded-md bg-orange px-3.5 font-mono text-[11px] font-semibold tracking-[.12em] text-navy-dark uppercase">
                  Campeón
                </div>
              )}
              {info?.ascenso && (
                <div
                  className="inline-flex min-h-[30px] items-center rounded-md px-3.5 font-mono text-[11px] font-semibold tracking-[.12em] text-white uppercase"
                  style={{ border: "1px solid rgba(255,255,255,.4)" }}
                >
                  Ascenso
                </div>
              )}
            </div>
            <div className="mt-3.5 text-[16.5px] text-white/75">{seasonMeta}</div>
          </div>
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-[14px]" style={{ background: "rgba(255,255,255,.18)" }}>
            <HeroRecordCell value={resumen.ganados} label="Ganados" />
            <HeroRecordCell value={resumen.empatados} label={empatadosLabel} />
            <HeroRecordCell value={resumen.perdidos} label="Perdidos" />
            <HeroRecordCell value={formatDif(dif)} label="Diferencia" />
          </div>
        </div>
      </section>

      {tieneFoto && (
        <div className="px-5 pt-6 lg:mx-auto lg:max-w-[1280px] lg:px-10 lg:pt-8">
          <div className="relative aspect-[1125/714] w-full overflow-hidden rounded-[14px] border border-navy/[.13] bg-navy-light">
            <Image
              src={`/temporadas/${temporada}.jpg`}
              alt={`Foto del equipo - temporada ${temporada}`}
              fill
              className="object-cover object-[center_87%]"
            />
          </div>
        </div>
      )}

      {/* mobile: todo apilado en el orden del diseño */}
      <div className="lg:hidden">
        <div className="px-5 pt-[26px]">
          <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">La campaña</h2>
          <div className="mt-3 flex items-baseline gap-2.5">
            <div className="text-[44px] leading-none font-extrabold tracking-[-.04em] text-navy tabular-nums">
              {resumen.partidosJugados}
            </div>
            <div className="font-mono text-[9.5px] tracking-[.1em] text-ink uppercase">Partidos jugados</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[11px] bg-navy p-3.5">
              <div className="text-[26px] leading-none font-extrabold text-white tabular-nums">{resumen.ganados}</div>
              <div className="mt-1.5 font-mono text-[9px] tracking-[.1em] text-white/78 uppercase">Ganados</div>
            </div>
            <div className="rounded-[11px] bg-navy-light p-3.5">
              <div className="text-[26px] leading-none font-extrabold text-navy tabular-nums">{resumen.empatados}</div>
              <div className="mt-1.5 font-mono text-[9px] tracking-[.1em] text-ink uppercase">{empatadosLabel}</div>
            </div>
            <div className="rounded-[11px] bg-derrota p-3.5">
              <div className="text-[26px] leading-none font-extrabold text-white tabular-nums">{resumen.perdidos}</div>
              <div className="mt-1.5 font-mono text-[9px] tracking-[.1em] text-white/78 uppercase">Perdidos</div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-[22px]">
          <div className="overflow-hidden rounded-[14px] border border-navy/[.15]">
            <div className="grid grid-cols-2">
              <StatCell label="Jugadores" value={resumen.jugadores} />
              <StatCell label="Tries" value={resumen.tries} />
              <StatCell label="Puntos" value={resumen.puntosFavor} />
              <StatCell label="En contra" value={resumen.puntosContra} />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-[15px]">
              <div>
                <div className="font-mono text-[9px] tracking-[.1em] text-ink uppercase">Diferencia</div>
                <div className="mt-1.5 text-2xl font-extrabold tracking-[-.025em] text-navy tabular-nums">{formatDif(dif)}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] tracking-[.1em] text-ink uppercase">Tarjetas</div>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <TarjetaIcon tipo="AMARILLA" width={11} height={15} />
                    <span className="font-mono text-sm font-semibold tabular-nums">{resumen.tarjetasAmarillas}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TarjetaIcon tipo="ROJA" width={11} height={15} />
                    <span className="font-mono text-sm font-semibold tabular-nums">{resumen.tarjetasRojas}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pt-3">
          <SeasonLeaderCard
            label="Tryman"
            nombre={resumen.maxTryScorer?.nombre ?? "—"}
            jugadorId={resumen.maxTryScorer?.jugadorId ?? null}
            value={resumen.maxTryScorer?.tries ?? "—"}
            unidad="tries"
          />
          <SeasonLeaderCard
            label="Goleador"
            nombre={resumen.maxPuntosScorer?.nombre ?? "—"}
            jugadorId={resumen.maxPuntosScorer?.jugadorId ?? null}
            value={resumen.maxPuntosScorer?.puntos ?? "—"}
            unidad="puntos"
          />
        </div>

        {debutantes.length > 0 && (
          <div className="px-5 pt-[30px]">
            <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">{debutantesLabel}</h2>
            <p className="mt-[7px] text-[13px] leading-[1.5] text-ink">Jugaron su primer partido como titular esta temporada.</p>
            <div className="mt-3.5 flex flex-col gap-2">
              {debutantes.map((d) => (
                <Link
                  key={d.jugadorId}
                  href={`/jugadores/${d.jugadorId}`}
                  className="flex min-h-[46px] items-center justify-between gap-2.5 rounded-[10px] border border-navy/[.14] px-3.5"
                >
                  <span className="truncate text-[13.5px] font-semibold text-navy-dark">{d.nombre}</span>
                  {d.camada && <span className="flex-none font-mono text-[10.5px] text-ink">Camada {d.camada}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pt-8">
          <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Partidos</h2>
          <div className="mt-[11px] flex items-center gap-3.5">
            <LegendDot color="#003868" label="Ganó" />
            <LegendDot color="#c3d0dd" label="Empató" />
            <LegendDot color="#9c2b1f" label="Perdió" />
          </div>
        </div>
        <div className="flex flex-col gap-2 px-5 pt-3.5">
          {partidos.map((p, i) => (
            <MobileMatchCard key={p.id} partido={p} numero={i + 1} />
          ))}
          {partidos.length === 0 && <p className="py-6 text-center text-sm text-ink">Sin partidos registrados.</p>}
        </div>

        <div className="px-5 pt-[22px] pb-10">
          <Link
            href={`/rankings/puntos?temporada=${temporada}`}
            className="flex min-h-[50px] items-center justify-between gap-3 rounded-xl bg-navy px-[17px]"
          >
            <span className="font-mono text-[10.5px] font-semibold tracking-[.09em] text-orange uppercase">
              Rankings de la temporada
            </span>
            <Chevron className="flex-none text-orange" />
          </Link>
        </div>
      </div>

      {/* desktop: dos columnas, partidos a la izquierda y resto en la barra lateral */}
      <div
        className="mx-auto hidden max-w-[1280px] gap-11 px-10 pt-11 pb-20 lg:grid"
        style={{ gridTemplateColumns: "2.2fr 1fr", alignItems: "start" }}
      >
        <div>
          <div className="flex items-baseline justify-between gap-5">
            <h2 className="text-[26px] font-extrabold tracking-[-.022em] text-navy-dark">Fecha por fecha</h2>
            <span className="font-mono text-[11px] tracking-[.1em] text-ink uppercase">{resumen.partidosJugados} partidos</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-[14px] border border-navy/[.13]">
            <div
              className="grid gap-3 py-3 pr-[18px]"
              style={{ gridTemplateColumns: "6px 46px 86px minmax(170px,1fr) 176px", background: "rgba(0,56,104,.05)" }}
            >
              <div />
              <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Fecha</div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Día</div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Rival</div>
              <div className="text-right font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Resultado</div>
            </div>
            {partidos.map((p, i) => (
              <DesktopMatchRow key={p.id} partido={p} numero={i + 1} />
            ))}
          </div>
          {partidos.length === 0 && <p className="mt-5 text-sm text-ink">Sin partidos registrados.</p>}
        </div>

        <div className="flex flex-col gap-6">
          <Link
            href={`/rankings/puntos?temporada=${temporada}`}
            className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl bg-navy px-[18px]"
          >
            <span className="font-mono text-[11px] font-semibold tracking-[.09em] text-orange uppercase">
              Rankings de la temporada
            </span>
            <Chevron className="flex-none text-orange" />
          </Link>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px]" style={{ background: "rgba(0,56,104,.12)" }}>
            <SidebarStat label="Jugadores" value={resumen.jugadores} />
            <SidebarStat label="Tries" value={resumen.tries} />
            <SidebarStat label="Puntos" value={resumen.puntosFavor} />
            <SidebarStat label="En contra" value={resumen.puntosContra} />
          </div>

          <div className="rounded-[14px] border border-navy/[.13] p-[22px]">
            <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Tryman</div>
            <div className="mt-2.5 text-[19px] font-bold text-navy-dark">{resumen.maxTryScorer?.nombre ?? "—"}</div>
            <div className="mt-[5px] font-mono text-xs text-ink">{resumen.maxTryScorer?.tries ?? 0} tries</div>
            <div className="my-5 h-px bg-navy/[.12]" />
            <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Goleador</div>
            <div className="mt-2.5 text-[19px] font-bold text-navy-dark">{resumen.maxPuntosScorer?.nombre ?? "—"}</div>
            <div className="mt-[5px] font-mono text-xs text-ink">{resumen.maxPuntosScorer?.puntos ?? 0} puntos</div>
            <div className="my-5 h-px bg-navy/[.12]" />
            <div className="flex gap-[22px]">
              <div>
                <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Amarillas</div>
                <div className="mt-[7px] font-mono text-[19px] font-semibold text-navy tabular-nums">{resumen.tarjetasAmarillas}</div>
              </div>
              <div>
                <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Rojas</div>
                <div className="mt-[7px] font-mono text-[19px] font-semibold text-navy tabular-nums">{resumen.tarjetasRojas}</div>
              </div>
            </div>
          </div>

          {debutantes.length > 0 && (
            <div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">{debutantesLabel}</div>
              <div className="mt-2.5 flex flex-col">
                {debutantes.map((d) => (
                  <Link
                    key={d.jugadorId}
                    href={`/jugadores/${d.jugadorId}`}
                    className="flex items-center justify-between gap-3 border-b border-navy/[.09] py-3"
                  >
                    <span className="truncate text-sm font-semibold text-navy-dark">{d.nombre}</span>
                    {d.camada && <span className="flex-none font-mono text-[11px] text-ink">Camada {d.camada}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function HeroRecordCell({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-navy p-5">
      <div className="text-[28px] font-semibold text-white tabular-nums">{value}</div>
      <div className="mt-1.5 font-mono text-[9.5px] tracking-[.11em] text-white/55 uppercase">{label}</div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-4">
      <div className="text-2xl font-semibold text-navy tabular-nums">{formatNumero(value)}</div>
      <div className="mt-1.5 font-mono text-[9.5px] tracking-[.11em] text-ink uppercase">{label}</div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3.5" style={{ borderBottom: "1px solid rgba(0,56,104,.09)", borderRight: "1px solid rgba(0,56,104,.09)" }}>
      <div className="text-xl leading-none font-extrabold tracking-[-.02em] text-navy-dark tabular-nums">{formatNumero(value)}</div>
      <div className="mt-1.5 font-mono text-[9px] tracking-[.1em] text-ink uppercase">{label}</div>
    </div>
  );
}

function SeasonLeaderCard({
  label,
  nombre,
  jugadorId,
  value,
  unidad,
}: {
  label: string;
  nombre: string;
  jugadorId: number | null;
  value: number | string;
  unidad: string;
}) {
  const contenido = (
    <>
      <div className="font-mono text-[9px] tracking-[.1em] text-orange uppercase">{label}</div>
      <div className="mt-2 line-clamp-2 text-sm leading-[1.25] font-bold text-white">{nombre}</div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="text-[22px] leading-none font-extrabold text-orange tabular-nums">{value}</span>
        <span className="font-mono text-[8.5px] tracking-[.1em] text-white/55 uppercase">{unidad}</span>
      </div>
    </>
  );
  if (jugadorId == null) return <div className="rounded-xl bg-navy p-[15px]">{contenido}</div>;
  return (
    <Link href={`/jugadores/${jugadorId}`} className="block rounded-xl bg-navy p-[15px]">
      {contenido}
    </Link>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 rounded-[3px]" style={{ background: color }} />
      <span className="font-mono text-[9px] tracking-[.1em] text-ink uppercase">{label}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="font-mono text-[8.5px] font-semibold tracking-[.13em] text-orange-dark uppercase lg:text-[9.5px]">{label}</div>
      <div className="mt-1 text-[12.5px] font-semibold text-navy-dark lg:text-[13.5px]">{value ?? "—"}</div>
    </div>
  );
}

function LineupRow({ jugador }: { jugador: PartidoDetalle["titulares"][number] }) {
  return (
    <div className="flex items-baseline gap-2 lg:gap-2.5">
      <span className="w-3.5 flex-none text-right font-mono text-[10px] text-navy/45 tabular-nums lg:w-4 lg:text-[11px]">
        {jugador.numeroCamiseta ?? "—"}
      </span>
      <Link
        href={`/jugadores/${jugador.jugadorId}`}
        className="min-w-0 truncate text-[11.5px] font-medium text-navy-dark hover:text-orange lg:text-[13px]"
      >
        {jugador.nombre}
        {jugador.capitan ? " (C)" : ""}
      </Link>
    </div>
  );
}

function MatchDetail({ partido }: { partido: PartidoDetalle }) {
  const puntosPorTipo = new Map<string, { jugadorId: number; nombre: string; cantidad: number }[]>();
  for (const p of partido.puntos) {
    const lista = puntosPorTipo.get(p.tipo) ?? [];
    lista.push({ jugadorId: p.jugadorId, nombre: p.nombre, cantidad: p.cantidad });
    puntosPorTipo.set(p.tipo, lista);
  }
  const delanteros = partido.titulares.filter((t) => (t.numeroCamiseta ?? 99) <= 8);
  const backs = partido.titulares.filter((t) => (t.numeroCamiseta ?? 99) > 8);
  const tieneFormacion = partido.titulares.length > 0;

  return (
    <div className="border-t border-navy/[.09] px-3.5 pb-4 pl-5 lg:bg-[rgba(0,56,104,.03)] lg:px-[18px] lg:pt-[22px] lg:pb-[26px] lg:pl-6">
      <div className="grid grid-cols-2 gap-3 pt-3.5 lg:grid-cols-4 lg:gap-4 lg:pt-0">
        {partido.etapa && <DetailField label="Instancia" value={partido.etapa} />}
        <DetailField label="Cancha" value={partido.cancha} />
        <DetailField label="Árbitro" value={partido.referee} />
        <DetailField label="Clima" value={partido.clima} />
        <DetailField label="Campo de juego" value={partido.campoDeJuego} />
      </div>

      {tieneFormacion ? (
        <>
          <div className="mt-[18px] border-t border-navy/[.1] pt-4 lg:mt-6 lg:pt-5">
            <div className="font-mono text-[9px] font-semibold tracking-[.13em] text-orange-dark uppercase lg:text-[9.5px]">
              Formación
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-8 gap-y-0.5 lg:mt-3">
              <div className="flex flex-col gap-0.5">
                {delanteros.map((t) => (
                  <LineupRow key={t.jugadorId} jugador={t} />
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                {backs.map((t) => (
                  <LineupRow key={t.jugadorId} jugador={t} />
                ))}
              </div>
            </div>
          </div>

          {partido.suplentes.length > 0 && (
            <div className="mt-4 lg:mt-5">
              <div className="font-mono text-[9px] font-semibold tracking-[.13em] text-orange-dark uppercase lg:text-[9.5px]">
                Cambios
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {partido.suplentes.map((s) => (
                  <div key={s.jugadorId} className="text-[11.5px] leading-[1.45] text-ink lg:text-[13px]">
                    <Link href={`/jugadores/${s.jugadorId}`} className="font-medium text-navy-dark hover:text-orange">
                      {s.nombre}
                    </Link>
                    {s.ingresoPor && (
                      <>
                        {" "}
                        entró por{" "}
                        {s.ingresoPorId ? (
                          <Link href={`/jugadores/${s.ingresoPorId}`} className="font-medium text-navy-dark hover:text-orange">
                            {s.ingresoPor}
                          </Link>
                        ) : (
                          s.ingresoPor
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 lg:mt-5">
            <div className="font-mono text-[9px] font-semibold tracking-[.13em] text-orange-dark uppercase lg:text-[9.5px]">
              Puntos
            </div>
            {puntosPorTipo.size === 0 ? (
              <p className="mt-2.5 text-[11.5px] text-ink lg:text-[13px]">Sin puntos registrados.</p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {[...puntosPorTipo.entries()].map(([tipo, lista]) => (
                  <div key={tipo} className="text-[11.5px] leading-[1.45] text-ink text-pretty lg:text-[13px]">
                    {NOMBRE_TIPO_PUNTO[tipo] ?? tipo}:{" "}
                    {lista.map((l, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        <Link href={`/jugadores/${l.jugadorId}`} className="font-medium text-navy-dark hover:text-orange">
                          {l.nombre}
                        </Link>
                        {l.cantidad > 1 ? ` (x${l.cantidad})` : ""}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {partido.tarjetas.length > 0 && (
            <div className="mt-4 lg:mt-5">
              <div className="font-mono text-[9px] font-semibold tracking-[.13em] text-orange-dark uppercase lg:text-[9.5px]">
                Tarjetas
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {partido.tarjetas.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <TarjetaIcon tipo={t.tipo === "AMARILLA" ? "AMARILLA" : "ROJA"} width={9} height={13} />
                    <Link href={`/jugadores/${t.jugadorId}`} className="text-[11.5px] text-ink hover:text-orange lg:text-[13px]">
                      {t.nombre}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 font-mono text-[10.5px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
          Formación no cargada para este partido.
        </div>
      )}
    </div>
  );
}

function MobileMatchCard({ partido, numero }: { partido: PartidoDetalle; numero: number }) {
  const resultado = partido.resultadoPropio - partido.resultadoRival;
  const bar = resultado > 0 ? "#003868" : resultado === 0 ? "#c3d0dd" : "#9c2b1f";
  return (
    <details className="group overflow-hidden rounded-xl border border-navy/[.13]">
      <summary className="flex cursor-pointer list-none items-stretch gap-3 marker:content-none">
        <div className="w-1.5 flex-none" style={{ background: bar }} />
        <div className="flex flex-1 items-center gap-3 py-[13px] pr-3.5">
          <div className="w-5 flex-none">
            {partido.etapa ? (
              <span
                className="flex h-5 w-5 items-center justify-center rounded bg-orange font-mono text-[8px] font-bold text-navy-dark"
                title={partido.etapa}
              >
                {partido.etapa === "Semifinal" ? "SF" : "F"}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-navy/45 tabular-nums">{numero}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-navy-dark">{partido.rival}</div>
            <div className="mt-1 font-mono text-[10px] tracking-[.05em] text-ink">
              {formatFechaCorta(partido.fecha)} · {partido.condicion === "LOCAL" ? "Local" : "Visitante"}
            </div>
          </div>
          <div className="flex-none font-mono text-sm font-semibold text-navy-dark tabular-nums">
            {partido.resultadoPropio} — {partido.resultadoRival}
          </div>
          <ChevronDown className="flex-none text-navy-dark transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <MatchDetail partido={partido} />
    </details>
  );
}

function DesktopMatchRow({ partido, numero }: { partido: PartidoDetalle; numero: number }) {
  const resultado = partido.resultadoPropio - partido.resultadoRival;
  const bar = resultado > 0 ? "#003868" : resultado === 0 ? "#c3d0dd" : "#9c2b1f";
  return (
    <details className="group border-t border-navy/[.09]">
      <summary
        className="grid cursor-pointer list-none items-stretch gap-3 py-3.5 pr-[18px] marker:content-none"
        style={{ gridTemplateColumns: "6px 46px 86px minmax(170px,1fr) 176px" }}
      >
        <div style={{ background: bar }} />
        <div className="self-center">
          {partido.etapa ? (
            <span
              className="inline-flex h-5 items-center rounded bg-orange px-1.5 font-mono text-[9px] font-bold tracking-[.04em] text-navy-dark uppercase"
              title={partido.etapa}
            >
              {partido.etapa === "Semifinal" ? "Semi" : "Final"}
            </span>
          ) : (
            <span className="font-mono text-[12.5px] text-ink tabular-nums">{numero}</span>
          )}
        </div>
        <div className="self-center font-mono text-xs text-ink">{formatFechaCorta(partido.fecha)}</div>
        <div className="min-w-0 self-center truncate text-[15px] font-semibold text-navy-dark">{partido.rival}</div>
        <div className="flex items-center justify-end gap-2.5 self-center">
          <span
            className="flex min-h-[21px] flex-none items-center rounded font-mono text-[9.5px] font-semibold tracking-[.08em] text-ink uppercase"
            style={{ background: "rgba(0,56,104,.07)", padding: "0 8px" }}
          >
            {partido.condicion === "LOCAL" ? "Local" : "Visitante"}
          </span>
          <span className="font-mono text-sm font-semibold text-navy-dark tabular-nums">
            {partido.resultadoPropio} — {partido.resultadoRival}
          </span>
          <ChevronDown className="text-navy-dark transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <MatchDetail partido={partido} />
    </details>
  );
}
