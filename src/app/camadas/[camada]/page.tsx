import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getListaJugadoresCompleta,
  getCamadasResumenCompleta,
  getTemporadasInfo,
  getResumenClub,
  getFechasDebutPorCamada,
  type FilaJugadorCompleta,
} from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { BackLink } from "@/components/back-link";
import { CopaIcon } from "@/components/copa-icon";
import { TarjetaIcon } from "@/components/tarjeta-icon";
import { OrdenSelect } from "@/components/orden-select";
import { formatNumero, numeroEnPalabras } from "@/lib/format";

const SORT_DEFS = [
  { key: "titular", label: "Titular", unit: "Partidos como titular" },
  { key: "suplente", label: "Suplente", unit: "Partidos como suplente" },
  { key: "total", label: "Total", unit: "Partidos jugados" },
  { key: "tries", label: "Tries", unit: "Tries convertidos" },
  { key: "puntos", label: "Puntos", unit: "Puntos anotados" },
  { key: "tarjetas", label: "Tarjetas", unit: "Tarjetas totales" },
] as const;
type OrdenKey = (typeof SORT_DEFS)[number]["key"];

function esOrdenKey(v: string | undefined): v is OrdenKey {
  return SORT_DEFS.some((s) => s.key === v);
}

function valorDe(j: FilaJugadorCompleta, orden: OrdenKey): number {
  switch (orden) {
    case "titular":
      return j.titular;
    case "suplente":
      return j.suplente;
    case "tries":
      return j.tries;
    case "puntos":
      return j.puntos;
    case "tarjetas":
      return j.tarjetasAmarillas + j.tarjetasRojas;
    default:
      return j.partidosJugados;
  }
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatFechaDebut(d: Date | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

function joinConY(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function Copas({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="flex flex-none items-center gap-[3px]">
      {Array.from({ length: n }).map((_, k) => (
        <CopaIcon key={k} color="#f89c38" />
      ))}
    </span>
  );
}

// pre-genera una página por cada camada con al menos un jugador.
export async function generateStaticParams() {
  const camadas = await getCamadasResumenCompleta();
  return camadas.map((c) => ({ camada: String(c.camada) }));
}

export async function generateMetadata({ params }: { params: Promise<{ camada: string }> }): Promise<Metadata> {
  const { camada: camadaParam } = await params;
  const camada = Number(camadaParam);
  const camadasResumen = await getCamadasResumenCompleta();
  const resumen = camadasResumen.find((c) => c.camada === camada);
  if (!resumen) return { title: `Camada ${camada} · Club Vicentinos` };
  const title = `Camada ${camada} · Club Vicentinos`;
  const description = `${resumen.jugadoresConCaps} jugadores, ${resumen.presencias} presencias y ${resumen.tries} tries.`;
  return { title, description, openGraph: { title, description } };
}

export default async function DetalleCamadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ camada: string }>;
  searchParams: Promise<{ orden?: string }>;
}) {
  const { camada: camadaParam } = await params;
  const camada = Number(camadaParam);
  const { orden: ordenParam } = await searchParams;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "titular";

  const [jugadoresTodos, camadasResumen, temporadasInfo, club, fechasDebut] = await Promise.all([
    getListaJugadoresCompleta(),
    getCamadasResumenCompleta(),
    getTemporadasInfo(),
    getResumenClub(),
    getFechasDebutPorCamada(camada),
  ]);

  const resumen = camadasResumen.find((c) => c.camada === camada);
  const jugadores = jugadoresTodos
    .filter((j) => j.camada === camada)
    .sort((a, b) => valorDe(b, orden) - valorDe(a, orden));
  if (!resumen || jugadores.length === 0) notFound();

  const sortUnit = (SORT_DEFS.find((s) => s.key === orden) ?? SORT_DEFS[0]).unit;

  const posicion = [...camadasResumen].sort((a, b) => b.presencias - a.presencias).findIndex((c) => c.camada === camada) + 1;

  const activos = jugadores.filter((j) => j.activo).length;
  const primeros = jugadores.map((j) => j.primeraTemporada).filter((y): y is number => y != null);
  const ultimos = jugadores.map((j) => j.ultimaTemporada).filter((y): y is number => y != null);
  const camFrom = Math.min(...primeros);
  const camTo = Math.max(...ultimos);

  const camBlurb = [
    `${numeroEnPalabras(jugadores.length).replace(/^./, (c) => c.toUpperCase())} ${jugadores.length === 1 ? "jugador" : "jugadores"}, ${formatNumero(resumen.presencias)} presencias y ${resumen.tries} tries.`,
    resumen.titulosAnios.length > 0
      ? `${jugadores.length === 1 ? "Campeón" : "Campeones"} en ${joinConY(resumen.titulosAnios.map(String))}.`
      : "",
    `Del primer debut en ${camFrom} ${
      activos > 0
        ? `a hoy: ${activos === 1 ? "uno sigue jugando" : `${numeroEnPalabras(activos)} siguen jugando`}.`
        : `al último año en ${camTo}.`
    }`,
  ]
    .filter(Boolean)
    .join(" ");

  const camStats = [
    { label: "Jugadores", value: formatNumero(jugadores.length) },
    { label: "Presencias", value: formatNumero(resumen.presencias) },
    { label: "Tries", value: formatNumero(resumen.tries) },
    { label: "Puntos", value: formatNumero(resumen.puntos) },
  ];

  function destacado(campo: "partidosJugados" | "tries" | "puntos", kicker: string, unit: string) {
    const top = [...jugadores].sort((a, b) => b[campo] - a[campo])[0];
    if (!top || top[campo] === 0) return null;
    return { kicker, nombre: top.nombre, jugadorId: top.id, value: formatNumero(top[campo]), unit };
  }
  const camMarks = [
    destacado("partidosJugados", "El que más jugó", "Partidos"),
    destacado("tries", "El que más tries hizo", "Tries"),
    destacado("puntos", "El que más puntos anotó", "Puntos"),
  ].filter((m): m is NonNullable<typeof m> => m !== null);

  const camMaxN = Math.max(
    1,
    ...[...temporadasInfo.values()]
      .filter((s) => s.torneo !== null && s.temporada >= camFrom && s.temporada <= camTo)
      .map((s) => jugadores.filter((j) => j.primeraTemporada != null && j.ultimaTemporada != null && s.temporada >= j.primeraTemporada && s.temporada <= j.ultimaTemporada).length)
  );
  const camTrack = [...temporadasInfo.values()]
    .filter((s) => s.torneo !== null && s.temporada >= camFrom && s.temporada <= camTo)
    .sort((a, b) => a.temporada - b.temporada)
    .map((s) => {
      const n = jugadores.filter(
        (j) => j.primeraTemporada != null && j.ultimaTemporada != null && s.temporada >= j.primeraTemporada && s.temporada <= j.ultimaTemporada
      ).length;
      return { year: s.temporada, n, w: (n / camMaxN) * 100, campeon: s.campeon };
    });

  const posLabel = `${posicion}º por presencias entre las camadas`;

  const shareData = {
    kicker: `Camada ${camada}`,
    title: `${posicion}º camada del archivo`,
    sub: `${jugadores.length} ${jugadores.length === 1 ? "jugador" : "jugadores"} · ${
      resumen.titulosAnios.length > 0 ? `campeones en ${joinConY(resumen.titulosAnios.map(String))}` : "sin títulos"
    }`,
    stats: [
      { label: "Presencias", value: formatNumero(resumen.presencias) },
      { label: "Tries", value: resumen.tries },
      { label: "Puntos", value: formatNumero(resumen.puntos) },
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
          <p className="mt-[22px] font-mono text-[10px] font-semibold tracking-[.13em] text-orange uppercase">{posLabel}</p>
          <div className="mt-[11px] flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-[30px] leading-[1.08] font-extrabold tracking-[-.03em] text-white">
              Camada {camada}
            </h1>
            <div className="flex flex-none gap-1.5 pt-1.5">
              <Copas n={resumen.titulos} />
            </div>
          </div>
          <p className="mt-3.5 text-pretty text-[13.5px] leading-[1.55] text-white/78">{camBlurb}</p>

          <div className="mt-[22px] grid grid-cols-2 gap-px overflow-hidden rounded-[10px]" style={{ background: "rgba(255,255,255,.16)" }}>
            {camStats.map((s) => (
              <div key={s.label} className="bg-navy px-[15px] py-3.5">
                <div className="text-xl leading-none font-extrabold text-white tabular-nums">{s.value}</div>
                <div className="mt-1.5 font-mono text-[8.5px] tracking-[.1em] text-white/55 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* mobile: lista de jugadores */}
      <div className="px-5 pt-[30px] lg:hidden">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Los jugadores</h2>
        <div className="mt-3 flex items-center gap-2">
          <OrdenSelect opciones={SORT_DEFS} valor={orden} basePath={`/camadas/${camada}`} valorPorDefecto="titular" />
        </div>
        <p className="mt-3 text-[13px] leading-[1.5] text-ink">Ordenados por {sortUnit.toLowerCase()}.</p>
      </div>
      <div className="flex flex-col px-5 pt-3 lg:hidden">
        {jugadores.map((j) => (
          <Link
            key={j.id}
            href={`/jugadores/${j.id}`}
            className="flex min-h-11 items-center gap-3 border-b border-navy/[.09] py-[13px]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[7px]">
                <span className="min-w-0 truncate text-[14.5px] font-semibold text-navy-dark">{j.nombre}</span>
                <Copas n={j.titulos} />
              </div>
              <div className="mt-1 font-mono text-[10px] tracking-[.04em] text-ink">
                {j.primeraTemporada === j.ultimaTemporada ? j.primeraTemporada : `${j.primeraTemporada}—${j.ultimaTemporada}`}
                {j.activo ? " · activo" : ""}
              </div>
            </div>
            <div className="min-w-[46px] flex-none text-right">
              <div className="text-[17px] font-extrabold tracking-[-.02em] text-navy tabular-nums">{formatNumero(valorDe(j, orden))}</div>
              <div className="mt-0.5 font-mono text-[8.5px] tracking-[.08em] text-ink uppercase">
                {SORT_DEFS.find((s) => s.key === orden)?.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* mobile: su recorrido */}
      <div className="px-5 pt-[26px] lg:hidden">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Su recorrido</h2>
        <p className="mt-[7px] text-[13px] leading-[1.5] text-ink">Cuántos de la camada jugaron cada temporada.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {camTrack.map((t) => (
            <Link key={t.year} href={`/temporadas/${t.year}`} className="flex min-h-[34px] items-center gap-2.5">
              <div className="w-[34px] flex-none font-mono text-xs font-semibold text-navy-dark tabular-nums">{t.year}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-[2px]" style={{ background: "rgba(0,56,104,.08)" }}>
                <div
                  className="h-2.5 rounded-[2px]"
                  style={{ width: `${t.w}%`, background: t.campeon ? "#f89c38" : "#003868" }}
                />
              </div>
              <div className="w-[22px] flex-none text-right font-mono text-[11.5px] font-semibold text-navy-dark tabular-nums">
                {t.n}
              </div>
              <span className="w-2.5 flex-none">{t.campeon && <CopaIcon color="#8a5a12" />}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* mobile: los más destacados */}
      {camMarks.length > 0 && (
        <div className="mt-[30px] bg-navy px-5 py-[30px] lg:hidden">
          <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-white">Los más destacados</h2>
          <div className="mt-4 flex flex-col gap-px overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,.14)" }}>
            {camMarks.map((m) => (
              <Link
                key={m.kicker}
                href={`/jugadores/${m.jugadorId}`}
                className="flex min-h-11 items-center gap-3 bg-navy px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[9px] font-semibold tracking-[.11em] text-orange uppercase">{m.kicker}</div>
                  <div className="mt-1.5 truncate text-[14.5px] font-semibold text-white">{m.nombre}</div>
                </div>
                <div className="flex-none text-right">
                  <div className="text-[17px] font-extrabold text-white tabular-nums">{m.value}</div>
                  <div className="mt-0.5 font-mono text-[8.5px] tracking-[.08em] text-white/50 uppercase">{m.unit}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* mobile: ver todas las camadas */}
      <div className="px-5 pt-[26px] pb-9 lg:hidden">
        <Link
          href="/camadas"
          className="flex min-h-[50px] items-center justify-between gap-3 rounded-xl px-[17px]"
          style={{ border: "1px solid rgba(0,56,104,.2)" }}
        >
          <span className="font-mono text-[10.5px] font-semibold tracking-[.09em] text-orange-dark uppercase">
            Ver todas las camadas
          </span>
          <Chevron className="flex-none text-orange-dark" />
        </Link>
      </div>

      {/* desktop: hero navy */}
      <section className="hidden bg-navy lg:block">
        <div className="mx-auto px-10 py-11" style={{ maxWidth: 1280 }}>
          <BackLink href="/camadas" label="Camadas" />
          <div className="mt-[18px] grid items-end gap-14" style={{ gridTemplateColumns: "1.15fr .85fr" }}>
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange uppercase">{posLabel}</p>
              <h1 className="mt-3.5 text-[64px] leading-none font-extrabold tracking-[-.035em] text-white">Camada {camada}</h1>
              <p className="mt-[18px] max-w-[600px] text-pretty text-[16.5px] leading-[1.55] text-white/78">{camBlurb}</p>
              {resumen.titulosAnios.length > 0 && (
                <div className="mt-[18px] flex flex-wrap gap-2">
                  {resumen.titulosAnios.map((y) => (
                    <div
                      key={y}
                      className="inline-flex min-h-[26px] items-center gap-1.5 rounded-[5px] bg-orange px-[11px] font-mono text-[10.5px] font-semibold tracking-[.08em] text-navy-dark"
                    >
                      <CopaIcon color="#002140" />
                      <span>CAMPEÓN {y}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px]" style={{ background: "rgba(255,255,255,.18)" }}>
              {camStats.map((s) => (
                <div key={s.label} className="bg-navy p-5">
                  <div className="font-mono text-[26px] font-semibold text-white tabular-nums">{s.value}</div>
                  <div className="mt-1.5 font-mono text-[9.5px] tracking-[.11em] text-white/55 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* desktop: dos columnas */}
      <div className="mx-auto hidden gap-11 px-10 pt-11 pb-20 lg:grid" style={{ maxWidth: 1280, gridTemplateColumns: "1.9fr 1fr", alignItems: "start" }}>
        <div>
          <h2 className="text-[26px] font-extrabold tracking-[-.022em] text-navy-dark">Quiénes son parte</h2>
          <div className="mt-5 overflow-hidden rounded-[14px] border border-navy/[.13]">
            <div
              className="grid items-center gap-2.5 px-5 py-3"
              style={{ gridTemplateColumns: "minmax(180px,1fr) 54px 56px 52px 46px 56px 72px 78px", background: "rgba(0,56,104,.05)" }}
            >
              <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Jugador</div>
              <div
                className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
                style={{ color: orden === "titular" ? "#003868" : "#46658a" }}
              >
                Titular
              </div>
              <div
                className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
                style={{ color: orden === "suplente" ? "#003868" : "#46658a" }}
              >
                Suplente
              </div>
              <div
                className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
                style={{ color: orden === "total" ? "#003868" : "#46658a" }}
              >
                Total
              </div>
              <div
                className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
                style={{ color: orden === "tries" ? "#003868" : "#46658a" }}
              >
                Tries
              </div>
              <div
                className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
                style={{ color: orden === "puntos" ? "#003868" : "#46658a" }}
              >
                Puntos
              </div>
              <div
                className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
                style={{ color: orden === "tarjetas" ? "#003868" : "#46658a" }}
              >
                Tarjetas
              </div>
              <div className="text-right font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Debut</div>
            </div>
            {jugadores.map((j) => (
              <Link
                key={j.id}
                href={`/jugadores/${j.id}`}
                className="grid items-center gap-2.5 border-t border-navy/[.09] px-5 py-3.5"
                style={{ gridTemplateColumns: "minmax(180px,1fr) 54px 56px 52px 46px 56px 72px 78px" }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-navy-dark">{j.nombre}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-[7px]">
                    <span className="font-mono text-[10.5px] text-ink">
                      {j.primeraTemporada === j.ultimaTemporada ? j.primeraTemporada : `${j.primeraTemporada}—${j.ultimaTemporada}`}
                    </span>
                    <Copas n={j.titulos} />
                  </div>
                </div>
                <div
                  className="text-right font-mono text-[15px] tabular-nums"
                  style={{ fontWeight: orden === "titular" ? 600 : 400, color: orden === "titular" ? "#003868" : "#46658a" }}
                >
                  {j.titular}
                </div>
                <div
                  className="text-right font-mono text-[15px] tabular-nums"
                  style={{ fontWeight: orden === "suplente" ? 600 : 400, color: orden === "suplente" ? "#003868" : "#46658a" }}
                >
                  {j.suplente}
                </div>
                <div
                  className="text-right font-mono text-[15px] tabular-nums"
                  style={{ fontWeight: orden === "total" ? 600 : 400, color: orden === "total" ? "#003868" : "#46658a" }}
                >
                  {j.partidosJugados}
                </div>
                <div
                  className="text-right font-mono text-[15px] tabular-nums"
                  style={{ fontWeight: orden === "tries" ? 600 : 400, color: orden === "tries" ? "#003868" : "#46658a" }}
                >
                  {j.tries}
                </div>
                <div
                  className="text-right font-mono text-[15px] tabular-nums"
                  style={{ fontWeight: orden === "puntos" ? 600 : 400, color: orden === "puntos" ? "#003868" : "#46658a" }}
                >
                  {formatNumero(j.puntos)}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {j.tarjetasAmarillas === 0 && j.tarjetasRojas === 0 ? (
                    <span className="font-mono text-[13px]" style={{ color: "rgba(0,56,104,.3)" }}>
                      —
                    </span>
                  ) : (
                    <>
                      {j.tarjetasAmarillas > 0 && (
                        <span className="flex items-center gap-1">
                          <TarjetaIcon tipo="AMARILLA" width={8} height={12} />
                          <span
                            className="font-mono text-[13px] tabular-nums"
                            style={{ fontWeight: orden === "tarjetas" ? 600 : 400, color: orden === "tarjetas" ? "#003868" : "#46658a" }}
                          >
                            {j.tarjetasAmarillas}
                          </span>
                        </span>
                      )}
                      {j.tarjetasRojas > 0 && (
                        <span className="flex items-center gap-1">
                          <TarjetaIcon tipo="ROJA" width={8} height={12} />
                          <span
                            className="font-mono text-[13px] tabular-nums"
                            style={{ fontWeight: orden === "tarjetas" ? 600 : 400, color: orden === "tarjetas" ? "#003868" : "#46658a" }}
                          >
                            {j.tarjetasRojas}
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-right font-mono text-xs whitespace-nowrap text-ink tabular-nums">{formatFechaDebut(fechasDebut.get(j.id))}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[26px]" style={{ marginTop: 25 }}>
          <div>
            <p className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Cuántos jugaron cada año</p>
            <div className="mt-3 flex flex-col gap-[7px]">
              {camTrack.map((t) => (
                <Link key={t.year} href={`/temporadas/${t.year}`} className="flex items-center gap-2.5">
                  <span className="w-[34px] flex-none font-mono text-[11px] text-ink tabular-nums">{t.year}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "#eef2f6" }}>
                    <div className="h-full rounded-full" style={{ width: `${t.w}%`, background: t.campeon ? "#f89c38" : "#003868" }} />
                  </div>
                  <span className="w-[18px] flex-none text-right font-mono text-[11px] text-navy tabular-nums">{t.n}</span>
                </Link>
              ))}
            </div>
          </div>

          {camMarks.length > 0 && (
            <div>
              <p className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Los más destacados</p>
              <div className="mt-2.5 flex flex-col">
                {camMarks.map((m) => (
                  <Link
                    key={m.kicker}
                    href={`/jugadores/${m.jugadorId}`}
                    className="flex items-center gap-3.5 border-b border-navy/[.09] py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] tracking-[.09em] text-ink uppercase">{m.kicker}</div>
                      <div className="mt-1 truncate text-[15px] font-semibold text-navy-dark">{m.nombre}</div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-[19px] font-semibold text-navy tabular-nums">{m.value}</div>
                      <div className="mt-0.5 font-mono text-[9px] tracking-[.1em] text-ink uppercase">{m.unit}</div>
                    </div>
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
