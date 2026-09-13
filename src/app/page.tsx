import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getResumenClub,
  getTemporadasInfo,
  getRankingPuntos,
  getRankingPresencias,
  getResumenTemporadas,
} from "@/lib/queries";
import { EscaleraTemporadas } from "@/components/escalera-temporadas";
import { LineaDeTiempoLista } from "@/components/linea-tiempo-lista";
import { MobileMenu } from "@/components/mobile-menu";
import { formatNumero, numeroEnPalabras } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const [club, temporadasInfo] = await Promise.all([getResumenClub(), getTemporadasInfo()]);
  let títulos = 0;
  for (const info of temporadasInfo.values()) if (info.campeon) títulos++;
  const title = "Club Vicentinos · El archivo";
  const description = `${club.temporadas} campañas, ${club.partidos} partidos, ${club.tries} tries y ${títulos} títulos.`;
  return { title, description, openGraph: { title, description } };
}

function joinConY(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4">
      <div className="font-mono text-[22px] font-semibold text-white lg:text-[28px]">{formatNumero(value)}</div>
      <div className="mt-1 font-mono text-[9.5px] tracking-[.11em] text-white/55 uppercase">{label}</div>
    </div>
  );
}

function AccesoCard({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[56px] flex-col justify-center gap-1 rounded-[10px] px-[13px] py-2.5 transition-colors hover:border-orange"
      style={{ border: "1px solid rgba(255,255,255,.26)" }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[14.5px] font-bold text-white">{title}</span>
        <Chevron className="text-orange" />
      </span>
      <span className="font-mono text-[9.5px] tracking-[.07em] text-white/55 uppercase">{meta}</span>
    </Link>
  );
}

type PodioFila = { jugadorId: number; nombre: string; detalle: string; valor: number };

function Podio({
  eyebrow,
  unidad,
  filas,
  verTodoHref,
}: {
  eyebrow: string;
  unidad: string;
  filas: PodioFila[];
  verTodoHref: string;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px]" style={{ background: "rgba(255,255,255,.04)" }}>
      <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <div className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange uppercase">{eyebrow}</div>
        <div className="font-mono text-[10px] text-white/55 uppercase">{unidad}</div>
      </div>
      <div>
        {filas.map((f, i) => (
          <Link
            key={f.jugadorId}
            href={`/jugadores/${f.jugadorId}`}
            className="flex items-center justify-between gap-3 border-t px-5 py-2.5"
            style={{ borderColor: "rgba(255,255,255,.16)" }}
          >
            <span className="flex min-w-0 items-baseline gap-2.5">
              <span className="font-mono text-xs text-white/50">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">{f.nombre}</span>
                <span className="block truncate font-mono text-[10.5px] text-white/50">{f.detalle}</span>
              </span>
            </span>
            <span className="flex flex-none items-center gap-2">
              <span className="font-mono text-[19px] font-semibold text-orange">{formatNumero(f.valor)}</span>
              <Chevron className="text-white/45" />
            </span>
          </Link>
        ))}
      </div>
      <Link
        href={verTodoHref}
        className="mt-auto flex h-12 items-center justify-between bg-navy-dark px-5 font-mono text-xs font-semibold text-orange"
      >
        Ver ranking completo
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export default async function Home() {
  const [club, temporadasInfo, puntos, presencias, resumenTemporadas] = await Promise.all([
    getResumenClub(),
    getTemporadasInfo(),
    getRankingPuntos(),
    getRankingPresencias(),
    getResumenTemporadas(),
  ]);

  const años = [...temporadasInfo.keys()];
  const rango = años.length > 0 ? `${Math.min(...años)}—${Math.max(...años)}` : "";

  let títulos = 0;
  let ascensos = 0;
  for (const info of temporadasInfo.values()) {
    if (info.campeon) títulos++;
    if (info.ascenso) ascensos++;
  }

  const gepPorAño = new Map(
    resumenTemporadas.map((r) => [r.temporada, { ganados: r.ganados, empatados: r.empatados, perdidos: r.perdidos }])
  );

  // años en los que cada jugador fue el máximo try-scorer de la temporada (tryman)
  const trymanPorJugador = new Map<number, number[]>();
  for (const r of resumenTemporadas) {
    if (!r.maxTryScorer) continue;
    const lista = trymanPorJugador.get(r.maxTryScorer.jugadorId) ?? [];
    lista.push(r.temporada);
    trymanPorJugador.set(r.maxTryScorer.jugadorId, lista);
  }
  const presenciasPorJugador = new Map(presencias.map((f) => [f.jugadorId, f]));

  const topPresencias: PodioFila[] = presencias.slice(0, 3).map((f) => ({
    jugadorId: f.jugadorId,
    nombre: f.nombre,
    detalle: `${f.titular} titular · ${f.suplente} suplente`,
    valor: f.total,
  }));
  const topTries: PodioFila[] = [...puntos]
    .sort((a, b) => b.tries - a.tries)
    .slice(0, 3)
    .map((f) => {
      const años = (trymanPorJugador.get(f.jugadorId) ?? []).sort((a, b) => a - b);
      return {
        jugadorId: f.jugadorId,
        nombre: f.nombre,
        detalle: años.length > 0 ? `Tryman en ${joinConY(años.map(String))}` : "",
        valor: f.tries,
      };
    });
  const topPuntos: PodioFila[] = puntos.slice(0, 3).map((f) => ({
    jugadorId: f.jugadorId,
    nombre: f.nombre,
    detalle: `${presenciasPorJugador.get(f.jugadorId)?.total ?? 0} presencias`,
    valor: f.puntos,
  }));

  return (
    <main>
      {/* hero */}
      <section className="bg-navy">
        <div className="mx-auto max-w-[1280px] px-5 pt-6 pb-[30px] lg:grid lg:grid-cols-2 lg:items-end lg:gap-14 lg:px-10 lg:py-[52px]">
          {/* mobile: encabezado propio de esta pantalla (escudo + wordmark + menú) */}
          <div className="flex min-h-11 items-center justify-between gap-3 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-white">
                <Image src="/escudo-vicentinos.jpg" alt="Escudo Club Vicentinos" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
              </span>
              <span className="text-[15px] font-bold text-white">Club Vicentinos</span>
            </Link>
            <MobileMenu
              temporadasCount={club.temporadas}
              jugadoresCount={club.jugadores}
              clubesCount={club.clubesRivales}
              camadasCount={club.camadas}
            />
          </div>
          <div>
            <p className="mt-6 font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase lg:mt-0 lg:text-[11px] lg:tracking-[.16em]">
              El archivo · {rango}
            </p>
            <h1 className="mt-3 text-[32px] leading-[1.05] font-extrabold tracking-[-.032em] text-white text-balance lg:mt-5 lg:text-[68px] lg:leading-[1.02] lg:tracking-[-.035em]">
              Del Grupo IV<br className="lg:hidden" /> a la Primera B.
              <br />
              <span className="text-orange">Está todo acá.</span>
            </h1>
            <p className="mt-4 max-w-[46ch] text-[13px] leading-[1.5] text-white/72 lg:mt-5 lg:text-[17px] lg:leading-[1.55]">
              {numeroEnPalabras(club.temporadas).replace(/^./, (c) => c.toUpperCase())} campañas jugadas,{" "}
              {formatNumero(club.partidos)} partidos, {formatNumero(club.tries)} tries. El archivo completo, año por
              año.
            </p>

            {/* mobile: buscador + accesos, dentro del hero */}
            <form action="/buscar" className="mt-6 lg:hidden">
              <div className="flex min-h-[50px] items-center gap-[11px] rounded-[12px] bg-white px-[15px]">
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden className="flex-none" style={{ color: "#46658a" }}>
                  <circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M11.2 11.2L15.4 15.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  name="q"
                  placeholder="Jugador, rival o año"
                  className="w-full bg-transparent text-[16px] outline-none"
                  style={{ color: "#46658a" }}
                />
              </div>
            </form>
            <div className="mt-3 grid grid-cols-2 gap-2.5 lg:hidden">
              <AccesoCard href="/jugadores" title="Jugadores" meta={`${club.jugadores} fichas`} />
              <AccesoCard href="/historial" title="Rivales" meta={`${club.clubesRivales} clubes`} />
              <AccesoCard href="/camadas" title="Camadas" meta="Por generación" />
              <AccesoCard href="/records" title="Récords" meta="Las marcas más altas" />
            </div>
          </div>
          <div className="mt-8 hidden grid-cols-2 gap-px overflow-hidden rounded-[14px] lg:grid" style={{ background: "rgba(255,255,255,.18)" }}>
            <div className="bg-navy">
              <HeroStat label="Partidos" value={club.partidos} />
            </div>
            <div className="bg-navy">
              <HeroStat label="Tries" value={club.tries} />
            </div>
            <div className="bg-navy">
              <HeroStat label="Títulos" value={títulos} />
            </div>
            <div className="bg-navy">
              <HeroStat label="Ascensos" value={ascensos} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-5 lg:px-10">
        {/* la línea de tiempo */}
        <section className="mt-11 lg:mt-16">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[26px] font-extrabold tracking-[-.02em] text-navy-dark lg:text-[32px] lg:tracking-[-.022em]">
              La línea de tiempo
            </h2>
            <span className="font-mono text-xs text-ink">{club.temporadas} temporadas</span>
          </div>
          <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-[1.5] text-ink lg:text-[15.5px] lg:leading-[1.55]">
            {numeroEnPalabras(títulos).replace(/^./, (c) => c.toUpperCase())} títulos y {numeroEnPalabras(ascensos)}{" "}
            ascensos.{" "}
            <span className="lg:hidden">Tocá un año para ver cómo se dio.</span>
            <span className="hidden lg:inline">
              Hacé clic en un año para abrir su detalle. La altura de cada barra es la categoría en la que jugó el
              club ese año.
            </span>
          </p>

          {/* desktop: gráfico de barras */}
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <div className="min-w-[560px]">
              <EscaleraTemporadas temporadasInfo={temporadasInfo} />
            </div>
          </div>

          {/* mobile: listado cronológico */}
          <div className="mt-2 lg:hidden">
            <LineaDeTiempoLista temporadasInfo={temporadasInfo} datosPorAño={gepPorAño} />
            <Link
              href="/temporadas"
              className="mt-[14px] flex min-h-12 items-center justify-center gap-2 rounded-[12px] font-mono text-[10.5px] font-semibold tracking-[.09em] text-navy-dark uppercase"
              style={{ border: "1px solid rgba(0,56,104,.15)" }}
            >
              Ver tabla de temporadas
              <Chevron />
            </Link>
          </div>
        </section>
      </div>

      {/* récords históricos */}
      <section className="mt-11 bg-navy lg:mt-16">
        <div className="mx-auto max-w-[1280px] px-5 py-10 lg:px-10 lg:py-14">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[26px] font-extrabold tracking-[-.02em] text-white lg:text-[32px] lg:tracking-[-.022em]">
              Récords históricos
            </h2>
            <span className="hidden font-mono text-xs text-white/55 lg:inline">El podio de cada marca</span>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Podio eyebrow="Más partidos" unidad="Presencias" filas={topPresencias} verTodoHref="/jugadores?orden=presencias" />
            <Podio eyebrow="Máximo tryman" unidad="Tries" filas={topTries} verTodoHref="/jugadores?orden=tries" />
            <Podio eyebrow="Máximo goleador" unidad="Puntos" filas={topPuntos} verTodoHref="/jugadores?orden=puntos" />
          </div>
          <Link
            href="/camadas"
            className="mt-[22px] flex items-center justify-between gap-3.5 rounded-[12px] px-[17px] py-[17px] lg:hidden"
            style={{ border: "1px solid rgba(255,255,255,.28)" }}
          >
            <span className="min-w-0">
              <span className="block text-base font-bold text-white">Ranking de camadas</span>
              <span className="mt-[5px] block text-[12.5px] leading-[1.45] text-white/65">
                Qué generación dejó más partidos y más tries.
              </span>
            </span>
            <Chevron className="text-white" />
          </Link>
        </div>
      </section>
      <div className="h-11 lg:h-16" />
    </main>
  );
}
