import Link from "next/link";
import type { Metadata } from "next";
import { getResumenTemporadas, getTemporadasInfo, getResumenClub } from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { CopaIcon } from "@/components/copa-icon";
import { formatNumero, formatDif, numeroEnPalabras } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const [club, temporadasInfo] = await Promise.all([getResumenClub(), getTemporadasInfo()]);
  const title = "Todas las temporadas · Club Vicentinos";
  const description = `Las ${temporadasInfo.size} campañas del club lado a lado: ${club.partidos} partidos, ${club.tries} tries.`;
  return { title, description, openGraph: { title, description } };
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoAscenso({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" fill="none" style={{ display: "block" }}>
      <path d="M4.5 9V1.4M1.3 4.4L4.5 1l3.2 3.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoDescenso({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" fill="none" style={{ display: "block" }}>
      <path d="M4.5 1v7.6M1.3 5.6L4.5 9l3.2-3.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type FilaAño = {
  año: number;
  jugada: boolean;
  torneo: string | null;
  posicion: number | null;
  nota: string | null;
  campeon: boolean;
  ascenso: boolean;
  descenso: boolean;
  actual: boolean;
  pj: number;
  g: number;
  e: number;
  p: number;
  pf: number;
  pc: number;
  dif: number;
  tries: number;
  jugadores: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  tryman: { jugadorId: number; nombre: string; tries: number } | null;
  goleador: { jugadorId: number; nombre: string; puntos: number } | null;
};

// una sola etiqueta por año (mismo criterio que el resto del sitio):
// campeón > descenso > ascenso > en curso
function etiquetaDe(f: FilaAño): "campeon" | "descenso" | "ascenso" | "actual" | null {
  if (f.campeon) return "campeon";
  if (f.descenso) return "descenso";
  if (f.ascenso) return "ascenso";
  if (f.actual) return "actual";
  return null;
}

const ORDEN_OPCIONES = [
  { key: "year", label: "Año" },
  { key: "pct", label: "% ganados" },
  { key: "g", label: "Ganados" },
  { key: "tries", label: "Tries" },
  { key: "dif", label: "Diferencia" },
  { key: "players", label: "Jugadores" },
] as const;
type OrdenKey = (typeof ORDEN_OPCIONES)[number]["key"];

function esOrdenKey(v: string | undefined): v is OrdenKey {
  return ORDEN_OPCIONES.some((o) => o.key === v);
}

export default async function TemporadasPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string }>;
}) {
  const { orden: ordenParam } = await searchParams;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "year";

  const [resumen, temporadasInfo, club] = await Promise.all([
    getResumenTemporadas(),
    getTemporadasInfo(),
    getResumenClub(),
  ]);
  const resumenPorAño = new Map(resumen.map((r) => [r.temporada, r]));
  const años = [...temporadasInfo.keys()].sort((a, b) => b - a);
  const añoActual = Math.max(...años);

  const filas: FilaAño[] = años.map((año) => {
    const info = temporadasInfo.get(año)!;
    const r = resumenPorAño.get(año);
    return {
      año,
      jugada: !!r,
      torneo: info.torneo,
      posicion: info.posicion,
      nota: info.nota,
      campeon: info.campeon,
      ascenso: info.ascenso,
      descenso: info.descenso,
      actual: año === añoActual,
      pj: r?.partidosJugados ?? 0,
      g: r?.ganados ?? 0,
      e: r?.empatados ?? 0,
      p: r?.perdidos ?? 0,
      pf: r?.puntosFavor ?? 0,
      pc: r?.puntosContra ?? 0,
      dif: (r?.puntosFavor ?? 0) - (r?.puntosContra ?? 0),
      tries: r?.tries ?? 0,
      jugadores: r?.jugadores ?? 0,
      tarjetasAmarillas: r?.tarjetasAmarillas ?? 0,
      tarjetasRojas: r?.tarjetasRojas ?? 0,
      tryman: r?.maxTryScorer ?? null,
      goleador: r?.maxPuntosScorer ?? null,
    };
  });

  const jugadas = filas.filter((f) => f.jugada);
  const totales = {
    pj: jugadas.reduce((a, f) => a + f.pj, 0),
    g: jugadas.reduce((a, f) => a + f.g, 0),
    e: jugadas.reduce((a, f) => a + f.e, 0),
    p: jugadas.reduce((a, f) => a + f.p, 0),
    pf: jugadas.reduce((a, f) => a + f.pf, 0),
    pc: jugadas.reduce((a, f) => a + f.pc, 0),
    tries: jugadas.reduce((a, f) => a + f.tries, 0),
  };
  const totalDif = totales.pf - totales.pc;

  function pct(f: FilaAño): number {
    return f.pj ? f.g / f.pj : -1;
  }
  const filasOrdenadas = [...filas].sort((a, b) => {
    if (orden === "year") return b.año - a.año;
    if (orden === "pct") return pct(b) - pct(a);
    if (orden === "g") return b.g - a.g;
    if (orden === "tries") return b.tries - a.tries;
    if (orden === "dif") return b.dif - a.dif;
    return b.jugadores - a.jugadores;
  });

  function hrefOrden(key: OrdenKey) {
    return key === "year" ? "/temporadas" : `/temporadas?orden=${key}`;
  }

  return (
    <main>
      {/* hero */}
      {/* mobile: hero navy con header propio de la pantalla */}
      <section className="bg-navy lg:hidden">
        <div className="mx-auto max-w-[1280px] px-5 pt-6 pb-7">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
          />
          <p className="mt-6 font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">
            El archivo · 2014—2026
          </p>
          <h1 className="mt-3 text-[29px] leading-[1.08] font-extrabold tracking-[-.03em] text-white">Temporadas</h1>
          <p className="mt-2.5 max-w-[640px] text-[13.5px] leading-[1.5] text-white/75">
            {numeroEnPalabras(club.temporadas).replace(/^./, (c) => c.toUpperCase())} campañas jugadas,{" "}
            {formatNumero(club.partidos)} partidos, {formatNumero(club.tries)} tries. Tocá una para abrir su
            detalle.
          </p>
        </div>
      </section>

      {/* desktop: encabezado sobre fondo blanco, sin hero */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-12 lg:block">
        <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange-dark uppercase">
          El archivo · 2014—2026
        </p>
        <h1 className="mt-3 text-[44px] font-extrabold tracking-[-.03em] text-navy-dark">Todas las temporadas</h1>
        <p className="mt-3 max-w-[640px] text-[15.5px] leading-[1.55] text-ink">
          Las {numeroEnPalabras(temporadasInfo.size)} campañas con sus números lado a lado. Ordenalas por lo que
          quieras comparar y abrí una para ver fecha por fecha.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {ORDEN_OPCIONES.map((o) => (
            <Link
              key={o.key}
              href={hrefOrden(o.key)}
              className={`flex min-h-[42px] items-center rounded-full border px-[15px] font-mono text-xs font-semibold tracking-[.04em] ${
                orden === o.key ? "border-navy bg-navy text-white" : "border-navy/[.16] bg-white text-navy-dark"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {/* mobile: listado de tarjetas, siempre por año (no tiene pills de orden) */}
      <div className="flex flex-col gap-3 px-5 py-5 lg:hidden">
        {filas.map((f) => (f.jugada ? <TarjetaTemporada key={f.año} f={f} /> : <TarjetaSinJugar key={f.año} f={f} />))}
      </div>

      {/* desktop: tabla */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-6 pb-20 lg:block">
        <div className="overflow-hidden rounded-[14px] border border-navy/[.13]">
          <div
            className="grid items-center gap-2.5 px-5 py-3"
            style={{
              gridTemplateColumns: "48px 74px minmax(150px,1fr) 54px 92px 108px 66px 74px 74px 84px 66px",
              background: "rgba(0,56,104,.05)",
            }}
          >
            <div />
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Año</div>
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Torneo</div>
            <div className="text-right font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">PJ</div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "g" ? "#003868" : "#46658a" }}
            >
              G—E—P
            </div>
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Balance</div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "pct" ? "#003868" : "#46658a" }}
            >
              % G
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "tries" ? "#003868" : "#46658a" }}
            >
              Tries
            </div>
            <div className="text-right font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">PF / PC</div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "dif" ? "#003868" : "#46658a" }}
            >
              Dif.
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "players" ? "#003868" : "#46658a" }}
            >
              Jug.
            </div>
          </div>

          {filasOrdenadas.map((f) => {
            const etiqueta = etiquetaDe(f);
            const activo = (k: OrdenKey) => (orden === k ? "600" : "400");
            const inkActivo = (k: OrdenKey) => (orden === k ? "#003868" : "#46658a");
            return (
              <Link
                key={f.año}
                href={`/temporadas/${f.año}`}
                className="grid items-center gap-2.5 border-t border-navy/[.09] px-5 py-3.5"
                style={{
                  gridTemplateColumns: "48px 74px minmax(150px,1fr) 54px 92px 108px 66px 74px 74px 84px 66px",
                  background: f.campeon ? "rgba(248,156,56,.07)" : "transparent",
                }}
              >
                <div>
                  {etiqueta && (
                    <span
                      className="block h-2 w-2 rounded-full"
                      style={{
                        background:
                          etiqueta === "campeon"
                            ? "#f89c38"
                            : etiqueta === "descenso"
                              ? "#9c2b1f"
                              : etiqueta === "ascenso"
                                ? "#003868"
                                : "#e6edf3",
                      }}
                    />
                  )}
                </div>
                <div className="font-mono text-[15px] font-semibold text-navy-dark tabular-nums">{f.año}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy-dark">{f.torneo ?? "No se jugó"}</div>
                  {etiqueta && (
                    <span
                      className="mt-1 inline-flex min-h-[18px] items-center gap-1 rounded-[4px] px-1.5 font-mono text-[8.5px] font-semibold tracking-[.08em] uppercase"
                      style={{
                        background:
                          etiqueta === "campeon"
                            ? "#f89c38"
                            : etiqueta === "descenso"
                              ? "#9c2b1f"
                              : etiqueta === "ascenso"
                                ? "#003868"
                                : "#e6edf3",
                        color: etiqueta === "campeon" ? "#002140" : etiqueta === "actual" ? "#46658a" : "#fff",
                      }}
                    >
                      {etiqueta === "campeon" && <CopaIcon color="#002140" />}
                      {etiqueta === "ascenso" && <IconoAscenso />}
                      {etiqueta === "descenso" && <IconoDescenso />}
                      {{ campeon: "Campeón", descenso: "Descenso", ascenso: "Ascenso", actual: "En curso" }[etiqueta]}
                    </span>
                  )}
                </div>
                <div className="text-right font-mono text-[13.5px] text-ink tabular-nums">{f.jugada ? f.pj : "—"}</div>
                <div
                  className="text-right font-mono text-[13.5px] tabular-nums"
                  style={{ fontWeight: activo("g"), color: inkActivo("g") }}
                >
                  {f.jugada ? `${f.g}—${f.e}—${f.p}` : "—"}
                </div>
                <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "#e6edf3" }}>
                  {f.jugada && (
                    <>
                      <div style={{ width: `${(f.g / f.pj) * 100}%`, background: "#003868" }} />
                      <div style={{ width: `${(f.e / f.pj) * 100}%`, background: "#c3d0dd" }} />
                      <div style={{ width: `${(f.p / f.pj) * 100}%`, background: "#9c2b1f" }} />
                    </>
                  )}
                </div>
                <div
                  className="text-right font-mono text-[13.5px] tabular-nums"
                  style={{ fontWeight: activo("pct"), color: inkActivo("pct") }}
                >
                  {f.jugada ? `${Math.round((f.g / f.pj) * 100)}%` : "—"}
                </div>
                <div
                  className="text-right font-mono text-[13.5px] tabular-nums"
                  style={{ fontWeight: activo("tries"), color: inkActivo("tries") }}
                >
                  {f.jugada ? f.tries : "—"}
                </div>
                <div className="text-right font-mono text-[11.5px] whitespace-nowrap text-ink tabular-nums">
                  {f.jugada ? `${formatNumero(f.pf)} / ${formatNumero(f.pc)}` : "—"}
                </div>
                <div
                  className="text-right font-mono text-[13.5px] tabular-nums"
                  style={{ fontWeight: activo("dif"), color: !f.jugada ? "#46658a" : f.dif >= 0 ? "#003868" : "#9c2b1f" }}
                >
                  {f.jugada ? formatDif(f.dif) : "—"}
                </div>
                <div
                  className="text-right font-mono text-[13.5px] tabular-nums"
                  style={{ fontWeight: activo("players"), color: inkActivo("players") }}
                >
                  {f.jugada ? f.jugadores : "—"}
                </div>
              </Link>
            );
          })}

          <div
            className="grid items-center gap-2.5 px-5 py-3.5"
            style={{
              gridTemplateColumns: "48px 74px minmax(150px,1fr) 54px 92px 108px 66px 74px 74px 84px 66px",
              borderTop: "2px solid rgba(0,56,104,.18)",
              background: "rgba(0,56,104,.04)",
            }}
          >
            <div />
            <div className="font-mono text-[9px] tracking-[.1em] text-ink uppercase">Total</div>
            <div className="font-mono text-[11px] text-ink">{jugadas.length} campañas</div>
            <div className="text-right font-mono text-[13.5px] font-semibold text-navy-dark tabular-nums">
              {formatNumero(totales.pj)}
            </div>
            <div className="text-right font-mono text-[13.5px] font-semibold text-navy-dark tabular-nums">
              {totales.g}—{totales.e}—{totales.p}
            </div>
            <div />
            <div className="text-right font-mono text-[13.5px] font-semibold text-navy-dark tabular-nums">
              {Math.round((totales.g / totales.pj) * 100)}%
            </div>
            <div className="text-right font-mono text-[13.5px] font-semibold text-navy-dark tabular-nums">
              {formatNumero(totales.tries)}
            </div>
            <div className="text-right font-mono text-[11.5px] whitespace-nowrap text-ink tabular-nums">
              {formatNumero(totales.pf)} / {formatNumero(totales.pc)}
            </div>
            <div className="text-right font-mono text-[13.5px] font-semibold text-navy-dark tabular-nums">
              {formatDif(totalDif)}
            </div>
            <div />
          </div>
        </div>
        <p className="mt-4 font-mono text-[10.5px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
          Los totales excluyen 2020, sin torneo por la pandemia. Cada fila abre la temporada fecha por fecha.
        </p>
      </div>
    </main>
  );
}

function TarjetaTemporada({ f }: { f: FilaAño }) {
  const etiqueta = etiquetaDe(f);
  return (
    <Link href={`/temporadas/${f.año}`} className="block overflow-hidden rounded-[14px] border border-navy/[.15]">
      <div className="flex items-start justify-between gap-3 px-[17px] pt-4 pb-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[32px] leading-none font-extrabold tracking-[-.035em] text-navy-dark tabular-nums">
              {f.año}
            </div>
            {etiqueta && (
              <span
                className="inline-flex min-h-[22px] items-center gap-1.5 rounded-[5px] px-2.5 font-mono text-[9px] font-semibold tracking-[.09em] uppercase"
                style={{
                  background:
                    etiqueta === "campeon"
                      ? "#003868"
                      : etiqueta === "descenso"
                        ? "#9c2b1f"
                        : etiqueta === "ascenso"
                          ? "#003868"
                          : "transparent",
                  color: etiqueta === "actual" ? "#003868" : "#fff",
                  border: etiqueta === "actual" ? "1px solid rgba(0,56,104,.3)" : undefined,
                }}
              >
                {etiqueta === "campeon" && <CopaIcon color="#fff" />}
                {etiqueta === "ascenso" && <IconoAscenso />}
                {etiqueta === "descenso" && <IconoDescenso />}
                {{ campeon: "Campeón", descenso: "Descenso", ascenso: "Ascenso", actual: "En curso" }[etiqueta]}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm font-semibold text-ink">
            {f.torneo}
            {f.posicion ? ` · ${f.posicion}º` : ""}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2.5 pt-1.5">
          <div className="text-right">
            <div className="font-mono text-[13px] font-semibold text-navy-dark tabular-nums">
              {f.g}—{f.e}—{f.p}
            </div>
            <div className="mt-1 font-mono text-[8.5px] tracking-[.09em] text-ink uppercase">G · E · P</div>
          </div>
          <Chevron className="text-navy-dark" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5 px-[17px] pt-3.5">
        <MiniStat label="PJ" value={f.pj} />
        <MiniStat label="Dif." value={formatDif(f.dif)} />
        <MiniStat label="Tries" value={f.tries} />
        <MiniStat label="Jugadores" value={f.jugadores} />
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5 px-[17px] py-[13px]" style={{ background: "#e6edf3" }}>
        <DetalleRow label="Tryman" value={f.tryman ? `${f.tryman.nombre} · ${f.tryman.tries}` : "—"} />
        <DetalleRow label="Goleador" value={f.goleador ? `${f.goleador.nombre} · ${f.goleador.puntos}` : "—"} />
        <DetalleRow label="Tarjetas" value={`${f.tarjetasAmarillas}A / ${f.tarjetasRojas}R`} mono />
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-navy-dark tabular-nums">{value}</div>
      <div className="mt-[3px] font-mono text-[8.5px] tracking-[.08em] text-ink uppercase">{label}</div>
    </div>
  );
}

function DetalleRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <div className="w-16 flex-none font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">{label}</div>
      <div className={`min-w-0 flex-1 truncate text-[13px] font-semibold text-navy-dark ${mono ? "font-mono !text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function TarjetaSinJugar({ f }: { f: FilaAño }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[14px] border border-dashed border-navy/[.22] px-[17px] py-4">
      <div className="text-[26px] leading-none font-bold tracking-[-.03em] tabular-nums" style={{ color: "rgba(0,56,104,.35)" }}>
        {f.año}
      </div>
      <div className="text-[13px] leading-[1.45] text-ink">
        No se jugó
        <br />
        <span style={{ color: "rgba(0,56,104,.5)" }}>{f.nota}</span>
      </div>
    </div>
  );
}
