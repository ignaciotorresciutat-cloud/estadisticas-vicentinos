import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getJugadorPerfil,
  getListaJugadoresCompleta,
  getResumenClub,
  getTemporadasInfo,
  type FilaPartidoJugador,
} from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { BackLink } from "@/components/back-link";
import { CopaIcon } from "@/components/copa-icon";
import { CareerAccordion, type CareerRow } from "./career-accordion";
import { RivalesCruces, type RivalCruce } from "./rivales-cruces";
import { resultadoDe } from "./perfil-shared";
import { cantidadConSustantivo } from "@/lib/format";

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatFecha(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

function ordinal(rank: number | undefined): string | null {
  if (!rank || rank > 10) return null;
  return `${rank}º`;
}

function triesTexto(n: number): string {
  return `${n} ${n === 1 ? "try" : "tries"}`;
}

function joinConY(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

// pre-genera una página por cada jugador que tiene al menos una presencia,
// así el sitio no depende de que alguien la visite una vez para que quede
// estática (ver README: la base sólo cambia con un deploy nuevo).
export async function generateStaticParams() {
  const jugadores = await getListaJugadoresCompleta();
  return jugadores.map((j) => ({ id: String(j.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const perfil = await getJugadorPerfil(Number(id));
  if (!perfil) return { title: "Jugador no encontrado · Club Vicentinos" };
  const title = `${perfil.nombre} · Club Vicentinos`;
  const description = `${perfil.capsTotal} presencias y ${perfil.tries} tries en primera. Estadísticas históricas del Club Vicentinos.`;
  return { title, description, openGraph: { title, description } };
}

export default async function PerfilJugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jugadorId = Number(id);

  const [perfil, club, temporadasInfo] = await Promise.all([
    getJugadorPerfil(jugadorId),
    getResumenClub(),
    getTemporadasInfo(),
  ]);
  if (!perfil) notFound();

  const torneoDe = (year: number) => temporadasInfo.get(year)?.torneo ?? "Torneo sin dato";
  const campeonEn = (year: number) => temporadasInfo.get(year)?.campeon ?? false;

  // una sola pill por año: si fue campeón y ascendió a la vez, priorizamos "Campeón"
  const temporadasConCampeon = new Set(perfil.logros.filter((l) => l.tipo === "CAMPEON").map((l) => l.temporada));
  const logrosMostrados = perfil.logros.filter((l) => l.tipo !== "ASCENSO" || !temporadasConCampeon.has(l.temporada));
  const titulosAnios = [...temporadasConCampeon].sort((a, b) => a - b);
  const ascensosAnios = logrosMostrados.filter((l) => l.tipo === "ASCENSO").map((l) => l.temporada);

  const temporadasAsc = [...perfil.triesPorTemporada].sort((a, b) => a.temporada - b.temporada);
  const temporadasDesc = perfil.triesPorTemporada; // ya viene ordenado desc

  // texto de presentación, armado por cláusulas a partir de datos reales
  const s1full = `${joinConY(
    [
      cantidadConSustantivo(temporadasAsc.length, "temporada", "temporadas", "f"),
      titulosAnios.length > 0 ? cantidadConSustantivo(titulosAnios.length, "título", "títulos") : null,
      ascensosAnios.length > 0 ? cantidadConSustantivo(ascensosAnios.length, "ascenso", "ascensos") : null,
    ].filter((x): x is string => x !== null)
  )}.`;

  const s2 = perfil.tries
    ? perfil.triesRank === 1
      ? `${triesTexto(perfil.tries)}: el máximo anotador del archivo.`
      : perfil.triesRank && perfil.triesRank <= 10
        ? `${triesTexto(perfil.tries)}: ${ordinal(perfil.triesRank)} en la tabla histórica.`
        : `${triesTexto(perfil.tries)} en total.`
    : "";

  let debutMatch: FilaPartidoJugador | null = null;
  for (const s of temporadasAsc) {
    const m = s.detalle.find((d) => d.rol === "TITULAR");
    if (m) {
      debutMatch = m;
      break;
    }
  }
  const s3 = debutMatch
    ? `Debutó contra ${debutMatch.rival}${campeonEn(debutMatch.temporada) ? `, el año del título en ${torneoDe(debutMatch.temporada)}` : ` en ${torneoDe(debutMatch.temporada)}`}.`
    : "";

  const blurbRaw = [s1full, s2, s3].filter(Boolean).join(" ");
  const playerBlurb = blurbRaw.charAt(0).toUpperCase() + blurbRaw.slice(1);

  const playerStats = [
    { value: String(perfil.capsTotal), label: "Partidos" },
    { value: String(perfil.tries), label: "Tries" },
    { value: String(perfil.puntos), label: "Puntos" },
  ];

  // "fue parte de": campeonatos jugados, con el detalle de esa temporada
  const achievements = titulosAnios
    .slice()
    .sort((a, b) => b - a)
    .map((year) => {
      const t = perfil.triesPorTemporada.find((x) => x.temporada === year);
      if (!t) return null;
      const perfecta = t.badges.presencias.some((b) => b.texto === "Presencia perfecta");
      return {
        year,
        title: `Campeón de ${torneoDe(year)}`,
        detail: perfecta
          ? `Presencia perfecta: ${t.presencias} de ${t.presencias} · ${triesTexto(t.tries)}`
          : `Jugó ${t.presencias} partido${t.presencias === 1 ? "" : "s"} · ${triesTexto(t.tries)}`,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // filas de "temporada por temporada", con las chips ya combinadas por fila
  const careerRows: CareerRow[] = temporadasDesc.map((t) => ({
    temporada: t.temporada,
    torneo: torneoDe(t.temporada),
    presencias: t.presencias,
    tries: t.tries,
    puntos: t.puntos,
    campeon: campeonEn(t.temporada),
    badges: [...t.badges.presencias, ...t.badges.tries, ...t.badges.puntos],
    detalle: t.detalle,
  }));

  // "contra quiénes más jugó": el resumen ya viene de historialVsRivales;
  // los cruces partido a partido se arman agrupando el detalle por rival
  const partidosPorRival = new Map<number, FilaPartidoJugador[]>();
  for (const t of perfil.triesPorTemporada) {
    for (const d of t.detalle) {
      const lista = partidosPorRival.get(d.rivalId) ?? [];
      lista.push(d);
      partidosPorRival.set(d.rivalId, lista);
    }
  }
  const rivales: RivalCruce[] = perfil.historialVsRivales.map((r) => ({
    clubId: r.clubId,
    club: r.club,
    partidosJugados: r.partidosJugados,
    ganados: r.ganados,
    empatados: r.empatados,
    perdidos: r.perdidos,
    tries: r.tries,
    partidos: (partidosPorRival.get(r.clubId) ?? [])
      .slice()
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .map((d) => ({
        year: d.temporada,
        fecha: d.fecha,
        where: d.condicion === "LOCAL" ? "Vicentinos" : d.rival,
        score: `${d.resultadoPropio}—${d.resultadoRival}`,
        res: resultadoDe(d.resultadoPropio, d.resultadoRival),
        feat: d.tries,
        etapa: d.etapa,
      })),
  }));

  // "titular o suplente": totales ya vienen en el perfil, por temporada se
  // arma a partir de triesPorTemporada
  const maxPjTemporada = Math.max(1, ...temporadasAsc.map((t) => t.presencias));
  const roleBySeason = temporadasAsc.map((t) => ({
    year: t.temporada,
    pj: t.presencias,
    wS: (t.titular / maxPjTemporada) * 100,
    wB: (t.suplente / maxPjTemporada) * 100,
  }));

  // posiciones jugadas
  const maxPosicion = Math.max(1, ...perfil.posiciones.map((p) => p.partidos));
  const posiciones = perfil.posiciones.map((p) => ({ ...p, w: (p.partidos / maxPosicion) * 100 }));

  // "top momentos": se derivan de datos reales agrupados por año, con un
  // orden de prioridad fijo (no cronológico): 1) hitos de cantidad de
  // carrera (partidos como titular / tries / puntos), 2) individuales de
  // temporada (tryman / presencia perfecta), 3) logros de equipo (campeón /
  // ascenso), 4) hitos de una sola vez al inicio de la carrera (debut /
  // primer try). Si un año tiene más de un hito se funden en una sola
  // entrada en vez de ocupar varios lugares del top 5.
  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const partidosAsc = temporadasAsc.flatMap((t) => t.detalle);
  const partidosTitularAsc = partidosAsc.filter((p) => p.rol === "TITULAR");

  function primerCruce(
    partidos: FilaPartidoJugador[],
    umbral: number,
    valor: (p: FilaPartidoJugador) => number
  ): FilaPartidoJugador | null {
    let acc = 0;
    for (const p of partidos) {
      acc += valor(p);
      if (acc >= umbral) return p;
    }
    return null;
  }

  type HitoTier1 = { tipo: "partidos" | "tries" | "puntos"; year: number; umbral: number; fecha: Date; rival: string };
  type HitoTier2 = { tipo: "tryman" | "perfecta"; year: number; tries: number; presencias: number; torneo: string };
  type HitoTier3 = { tipo: "campeon" | "ascenso"; year: number; torneo: string };
  type HitoTier4 = { tipo: "debut" | "primerTry"; year: number; fecha: Date; rival: string; torneo: string };
  type Hito = HitoTier1 | HitoTier2 | HitoTier3 | HitoTier4;
  const TIER: Record<Hito["tipo"], 1 | 2 | 3 | 4> = {
    partidos: 1,
    tries: 1,
    puntos: 1,
    tryman: 2,
    perfecta: 2,
    campeon: 3,
    ascenso: 3,
    debut: 4,
    primerTry: 4,
  };

  const hitos: Hito[] = [];

  const UMBRAL_PARTIDOS = [250, 200, 150, 100, 50];
  const umbralPartidos = UMBRAL_PARTIDOS.find((n) => perfil.capsTitular >= n);
  if (umbralPartidos) {
    const m = partidosTitularAsc[umbralPartidos - 1];
    if (m) hitos.push({ tipo: "partidos", year: m.temporada, umbral: umbralPartidos, fecha: m.fecha, rival: m.rival });
  }
  const UMBRAL_TRIES = [200, 150, 100, 50];
  const umbralTries = UMBRAL_TRIES.find((n) => perfil.tries >= n);
  if (umbralTries) {
    const m = primerCruce(partidosAsc, umbralTries, (p) => p.tries);
    if (m) hitos.push({ tipo: "tries", year: m.temporada, umbral: umbralTries, fecha: m.fecha, rival: m.rival });
  }
  const UMBRAL_PUNTOS = [2000, 1500, 1000, 500];
  const umbralPuntos = UMBRAL_PUNTOS.find((n) => perfil.puntos >= n);
  if (umbralPuntos) {
    const m = primerCruce(partidosAsc, umbralPuntos, (p) => p.puntos);
    if (m) hitos.push({ tipo: "puntos", year: m.temporada, umbral: umbralPuntos, fecha: m.fecha, rival: m.rival });
  }

  for (const t of temporadasAsc) {
    if (t.badges.tries.some((b) => b.texto === "Tryman")) {
      hitos.push({ tipo: "tryman", year: t.temporada, tries: t.tries, presencias: t.presencias, torneo: torneoDe(t.temporada) });
    }
    if (t.badges.presencias.some((b) => b.texto === "Presencia perfecta")) {
      hitos.push({ tipo: "perfecta", year: t.temporada, tries: t.tries, presencias: t.presencias, torneo: torneoDe(t.temporada) });
    }
    if (campeonEn(t.temporada)) {
      hitos.push({ tipo: "campeon", year: t.temporada, torneo: torneoDe(t.temporada) });
    }
    if (temporadasInfo.get(t.temporada)?.ascenso) {
      hitos.push({ tipo: "ascenso", year: t.temporada, torneo: torneoDe(t.temporada + 1) });
    }
  }

  if (debutMatch) {
    hitos.push({
      tipo: "debut",
      year: debutMatch.temporada,
      fecha: debutMatch.fecha,
      rival: debutMatch.rival,
      torneo: torneoDe(debutMatch.temporada),
    });
  }
  const primerTryMatch = partidosAsc.find((p) => p.tries > 0) ?? null;
  if (primerTryMatch) {
    hitos.push({
      tipo: "primerTry",
      year: primerTryMatch.temporada,
      fecha: primerTryMatch.fecha,
      rival: primerTryMatch.rival,
      torneo: torneoDe(primerTryMatch.temporada),
    });
  }

  const porAnio = new Map<number, Hito[]>();
  for (const h of hitos) {
    const lista = porAnio.get(h.year) ?? [];
    lista.push(h);
    porAnio.set(h.year, lista);
  }

  function claveTier1(h: HitoTier1): string {
    if (h.tipo === "partidos") return `${h.umbral} partidos como titular`;
    if (h.tipo === "tries") return triesTexto(h.umbral);
    return `${h.umbral} puntos`;
  }
  function claveTier2(hs: HitoTier2[]): string {
    const tryman = hs.find((h) => h.tipo === "tryman");
    const perfecta = hs.find((h) => h.tipo === "perfecta");
    if (tryman && perfecta) return "tryman con presencia perfecta";
    if (tryman) return "tryman de la temporada";
    return "presencia perfecta";
  }
  function claveEquipo(t3: HitoTier3[]): string | null {
    const campeon = t3.find((h) => h.tipo === "campeon");
    const ascenso = t3.find((h) => h.tipo === "ascenso");
    if (!campeon && !ascenso) return null;
    return [campeon ? `campeón de ${campeon.torneo}` : null, ascenso ? `con ascenso a ${ascenso.torneo}` : null]
      .filter((x): x is string => x !== null)
      .join(", ");
  }

  type Momento = { year: number; tier: 1 | 2 | 3 | 4; title: string; detail: string };
  const momentosFusionados: Momento[] = [];

  for (const [year, hs] of porAnio) {
    const t1 = hs.filter((h): h is HitoTier1 => TIER[h.tipo] === 1);
    const t2 = hs.filter((h): h is HitoTier2 => TIER[h.tipo] === 2);
    const t3 = hs.filter((h): h is HitoTier3 => TIER[h.tipo] === 3);
    const t4 = hs.filter((h): h is HitoTier4 => TIER[h.tipo] === 4);
    const equipoClave = claveEquipo(t3);

    // tier 1 (hitos de cantidad de carrera) nunca se funde con otros hitos
    // del año: siempre queda como entrada propia, aunque coincida con un
    // tryman, un campeón, etc. Sí se combinan entre sí varios hitos de
    // cantidad del mismo año (ej. llegar a 100 partidos y a 50 tries juntos).
    if (t1.length > 0) {
      const principal = t1[0];
      const detailParts = [`Lo hizo el ${formatFecha(principal.fecha)}, contra ${principal.rival}.`];
      if (t1.length === 1 && principal.tipo === "partidos") {
        detailParts.push(`Hoy acumula ${perfil.capsTotal} presencias en total.`);
      }
      momentosFusionados.push({
        year,
        tier: 1,
        title: `Llegó a ${joinConY(t1.map(claveTier1))}`,
        detail: detailParts.join(" "),
      });
    }

    if (t2.length > 0) {
      let title = capitalizar(claveTier2(t2));
      if (equipoClave) title += ` en el equipo ${equipoClave}`;
      const tryman = t2.find((h) => h.tipo === "tryman");
      const detail = tryman
        ? `${triesTexto(tryman.tries)} en ${tryman.presencias} partidos de ${tryman.torneo}.`
        : `Jugó los ${t2.find((h) => h.tipo === "perfecta")!.presencias} partidos de ${t2.find((h) => h.tipo === "perfecta")!.torneo}.`;
      momentosFusionados.push({ year, tier: 2, title, detail });
    } else if (t4.length > 0) {
      const debut = t4.find((h) => h.tipo === "debut");
      const primerTry = t4.find((h) => h.tipo === "primerTry");
      let title: string;
      let detail: string;
      if (debut && primerTry) {
        if (debut.fecha.getTime() === primerTry.fecha.getTime()) {
          title = "Debutó convirtiendo su primer try en Primera";
          detail = `Contra ${debut.rival}, en ${debut.torneo}.`;
        } else {
          title = "Debutó";
          detail = `Contra ${debut.rival}, en ${debut.torneo}. Su primer try en Primera llegó esa misma temporada, contra ${primerTry.rival}.`;
        }
      } else if (debut) {
        title = "Debutó en Primera";
        detail = `Contra ${debut.rival}, en ${debut.torneo}.`;
      } else {
        title = "Convirtió su primer try en Primera";
        detail = `Contra ${primerTry!.rival}, en ${primerTry!.torneo}.`;
      }
      if (equipoClave) title += ` en el equipo ${equipoClave}`;
      momentosFusionados.push({ year, tier: 4, title, detail });
    } else if (t3.length > 0) {
      const campeon = t3.find((h) => h.tipo === "campeon");
      const ascenso = t3.find((h) => h.tipo === "ascenso");
      const title =
        campeon && ascenso
          ? `Campeón de ${campeon.torneo}, con ascenso a ${ascenso.torneo}`
          : campeon
            ? `Campeón de ${campeon.torneo}`
            : `Ascenso a ${ascenso!.torneo}`;
      momentosFusionados.push({ year, tier: 3, title, detail: `Temporada ${year}.` });
    }
  }

  momentosFusionados.sort((a, b) => a.tier - b.tier || b.year - a.year);
  const playerMilestones = momentosFusionados.slice(0, 5);

  const eyebrow = [
    debutMatch ? `Debut ${formatFecha(debutMatch.fecha)}` : null,
    perfil.camada ? `Camada ${perfil.camada}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const shareData = {
    kicker: "Ficha de jugador",
    title: perfil.nombre,
    sub: `${cantidadConSustantivo(temporadasAsc.length, "temporada", "temporadas", "f")} en primera${perfil.camada ? ` · camada ${perfil.camada}` : ""}`,
    stats: [
      { label: "Presencias", value: perfil.capsTotal },
      { label: "Tries", value: perfil.tries },
      { label: "Títulos", value: titulosAnios.length },
    ],
  };

  return (
    <main>
      {/* mobile: hero navy */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-[30px]">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
            share={shareData}
          />
          {eyebrow && (
            <p className="mt-[22px] font-mono text-[10px] font-semibold tracking-[.13em] text-orange uppercase">{eyebrow}</p>
          )}
          <div className="mt-[11px] flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-balance text-[30px] leading-[1.08] font-extrabold tracking-[-.03em] text-white">
              {perfil.nombre}
            </h1>
            {titulosAnios.length > 0 && (
              <div className="flex flex-none gap-[5px] pt-1.5">
                {titulosAnios.map((y) => (
                  <CopaIcon key={y} color="#f89c38" />
                ))}
              </div>
            )}
          </div>
          <p className="mt-3.5 text-pretty text-[13.5px] leading-[1.55] text-white/78">{playerBlurb}</p>

          {achievements.length > 0 && (
            <div className="mt-6 border-t border-white/[.18] pt-5">
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">Fue parte de</div>
              <div className="mt-3.5 flex flex-col gap-[11px]">
                {achievements.map((a) => (
                  <Link key={a.year} href={`/temporadas/${a.year}`} className="flex items-center gap-[11px]">
                    <CopaIcon color="#f89c38" />
                    <div className="w-[34px] flex-none font-mono text-[12px] font-semibold text-orange tabular-nums">{a.year}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-white">{a.title}</div>
                      <div className="mt-[3px] font-mono text-[10px] tracking-[.04em] text-white/60">{a.detail}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* mobile: la ficha */}
      <div className="px-5 pt-[26px] lg:hidden">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">La ficha</h2>
      </div>
      <div className="flex flex-col gap-[10px] px-5 pt-3.5 lg:hidden">
        <div className="rounded-xl" style={{ border: "1px solid rgba(0,56,104,.15)", padding: "14px 16px" }}>
          <div className="flex items-baseline justify-between gap-2.5">
            <div className="font-mono text-[9px] tracking-[.1em] text-orange-dark uppercase">Presencias</div>
            {ordinal(perfil.capsTotalRank) && (
              <div className="font-mono text-[9px] tracking-[.08em] text-ink uppercase">{ordinal(perfil.capsTotalRank)} histórico</div>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-[26px] leading-none font-extrabold text-navy tabular-nums">{perfil.capsTotal}</div>
            <div className="font-mono text-[11px] text-ink">
              {perfil.capsTitular} de titular · {perfil.capsSuplente} desde el banco
            </div>
          </div>
          {perfil.capsTotal > 0 && (
            <div className="mt-[11px] flex gap-[2px]" style={{ height: 6 }}>
              <div className="rounded-sm bg-navy" style={{ width: `${(perfil.capsTitular / perfil.capsTotal) * 100}%` }} />
              <div className="rounded-sm" style={{ width: `${(perfil.capsSuplente / perfil.capsTotal) * 100}%`, background: "#c3d0dd" }} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-[10px]">
          <div style={{ border: "1px solid rgba(0,56,104,.15)", borderRadius: 12, padding: "14px 16px" }}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-mono text-[9px] tracking-[.1em] text-orange-dark uppercase">Tries</div>
              {ordinal(perfil.triesRank) && <div className="font-mono text-[9px] tracking-[.08em] text-orange-dark uppercase">{ordinal(perfil.triesRank)}</div>}
            </div>
            <div className="mt-2 text-[26px] leading-none font-extrabold text-navy tabular-nums">{perfil.tries}</div>
            <div className="mt-[5px] font-mono text-[10px] text-ink">
              {perfil.capsTotal > 0 ? (perfil.tries / perfil.capsTotal).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"} por partido
            </div>
          </div>
          <div style={{ border: "1px solid rgba(0,56,104,.15)", borderRadius: 12, padding: "14px 16px" }}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-mono text-[9px] tracking-[.1em] text-orange-dark uppercase">Puntos</div>
              {ordinal(perfil.puntosRank) && <div className="font-mono text-[9px] tracking-[.08em] text-ink uppercase">{ordinal(perfil.puntosRank)}</div>}
            </div>
            <div className="mt-2 text-[26px] leading-none font-extrabold text-navy tabular-nums">{perfil.puntos}</div>
            <div className="mt-[5px] font-mono text-[10px] text-ink">
              {perfil.puntos - perfil.tries * 5 <= 0 ? "Todos por try" : `+${perfil.puntos - perfil.tries * 5} de pie`}
            </div>
          </div>
        </div>

        {posiciones.length > 0 && (
          <div style={{ border: "1px solid rgba(0,56,104,.15)", borderRadius: 12, padding: "14px 16px" }}>
            <div className="font-mono text-[9px] tracking-[.1em] text-orange-dark uppercase">Dónde jugó</div>
            <div className="mt-[11px] flex flex-col gap-2">
              {posiciones.map((p) => (
                <div key={p.posicion} className="flex items-center gap-2.5">
                  <div className="w-[74px] flex-none text-[12.5px] font-semibold">{p.posicion}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-sm" style={{ background: "rgba(0,56,104,.08)" }}>
                    <div className="h-2 rounded-sm bg-navy" style={{ width: `${p.w}%` }} />
                  </div>
                  <div className="w-[52px] flex-none text-right font-mono text-[11px] text-ink tabular-nums">{p.partidos} PJ</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(perfil.tarjetasAmarillas > 0 || perfil.tarjetasRojas > 0) && (
          <div className="flex items-center gap-4" style={{ border: "1px solid rgba(0,56,104,.15)", borderRadius: 12, padding: "14px 16px" }}>
            <div className="flex-1">
              <div className="font-mono text-[9px] tracking-[.1em] text-orange-dark uppercase">Tarjetas</div>
              <div className="mt-2.5 flex items-center gap-4">
                <div className="flex items-center gap-[7px]">
                  <div className="h-[15px] w-[11px] flex-none rounded-sm border border-black/15 bg-amarilla" />
                  <span className="text-[17px] font-extrabold text-navy tabular-nums">{perfil.tarjetasAmarillas}</span>
                </div>
                <div className="flex items-center gap-[7px]">
                  <div className="h-[15px] w-[11px] flex-none rounded-sm bg-derrota" />
                  <span className="text-[17px] font-extrabold text-navy tabular-nums">{perfil.tarjetasRojas}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 font-mono text-[10px] leading-[1.55] text-ink">
              {perfil.tarjetasAmarillas > 0
                ? `Una amarilla cada ${Math.round(perfil.capsTotal / perfil.tarjetasAmarillas)} partidos. `
                : "Sin tarjetas amarillas. "}
              {perfil.tarjetasRojas === 0 ? "Nunca expulsado." : `${perfil.tarjetasRojas} expulsión${perfil.tarjetasRojas === 1 ? "" : "es"}.`}
            </div>
          </div>
        )}
      </div>

      {/* mobile: temporada por temporada */}
      <div className="px-5 pt-[34px] lg:hidden">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">La carrera, año por año</h2>
        <p className="mt-[7px] text-[13px] leading-[1.5] text-ink">Tocá un año para ver sus partidos.</p>
      </div>
      <div className="px-5 pt-3.5 lg:hidden">
        <CareerAccordion
          rows={careerRows}
          variant="mobile"
          totales={{ pj: perfil.capsTotal, tries: perfil.tries, puntos: perfil.puntos }}
        />
      </div>

      {/* mobile: top momentos */}
      {playerMilestones.length > 0 && (
        <>
          <div className="px-5 pt-[34px] lg:hidden">
            <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Top momentos</h2>
          </div>
          <div className="flex flex-col px-5 pt-3.5 lg:hidden">
            {playerMilestones.map((m, i) => (
              <div key={i} className="flex gap-[13px] border-b border-navy/[.09] py-[13px]">
                <div className="w-[34px] flex-none font-mono text-[11px] font-semibold text-orange-dark tabular-nums">{m.year}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-pretty text-[13.5px] font-semibold">{m.title}</div>
                  <div className="mt-1 text-pretty text-[12.5px] leading-[1.45] text-ink">{m.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* mobile: contra quiénes más jugó */}
      {rivales.length > 0 && (
        <>
          <div className="px-5 pt-[34px] lg:hidden">
            <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Contra quiénes jugó más</h2>
            <p className="mt-[7px] text-[13px] leading-[1.5] text-ink">Tocá un club para ver todos los cruces.</p>
          </div>
          <div className="px-5 pt-3.5 lg:hidden">
            <RivalesCruces filas={rivales} variant="mobile" />
          </div>
        </>
      )}

      {/* mobile: su generación */}
      {perfil.camada && (
        <div className="mt-[34px] bg-navy px-5 pt-7 pb-11 lg:hidden">
          <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">Su generación</div>
          <div className="mt-2.5 text-[19px] font-extrabold tracking-[-.02em] text-white">Camada {perfil.camada}</div>
          <p className="mt-2 mb-[18px] text-[13.5px] leading-[1.5] text-white/72">
            Los que llegaron al club con él, y qué dejó esa generación.
          </p>
          <Link
            href={`/camadas/${perfil.camada}`}
            className="flex min-h-12 items-center justify-center rounded-[10px] bg-orange text-[14.5px] font-bold text-navy-dark"
          >
            Ver la camada {perfil.camada}
          </Link>
        </div>
      )}

      {/* desktop: hero navy */}
      <section className="hidden bg-navy lg:block">
        <div className="mx-auto px-10 pt-11 pb-12" style={{ maxWidth: 1280 }}>
          <BackLink href="/jugadores" label="Jugadores" />
          <div className="mt-[18px] grid items-end gap-14" style={{ gridTemplateColumns: "1.15fr .85fr" }}>
            <div>
              <h1 className="text-[64px] leading-none font-extrabold tracking-[-.035em] text-white">{perfil.nombre}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3.5">
                {perfil.camada && (
                  <Link
                    href={`/camadas/${perfil.camada}`}
                    className="inline-flex min-h-7 items-center rounded-[6px] px-3 font-mono text-[11px] tracking-[.06em] text-white uppercase"
                    style={{ border: "1px solid rgba(255,255,255,.35)" }}
                  >
                    Camada {perfil.camada}
                  </Link>
                )}
                {titulosAnios.map((y) => (
                  <div
                    key={y}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-[6px] bg-orange px-3 font-mono text-[11px] font-semibold tracking-[.06em] text-navy-dark"
                  >
                    <CopaIcon color="#002140" />
                    <span>CAMPEÓN {y}</span>
                  </div>
                ))}
              </div>
              <p className="mt-[18px] max-w-[600px] text-pretty text-[16.5px] leading-[1.55] text-white/78">{playerBlurb}</p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px]" style={{ background: "rgba(255,255,255,.18)" }}>
              {playerStats.map((s) => (
                <div key={s.label} className="bg-navy p-5">
                  <div className="font-mono text-[28px] font-semibold text-white tabular-nums">{s.value}</div>
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
          <h2 className="text-[26px] font-extrabold tracking-[-.022em] text-navy-dark">Temporada por temporada</h2>
          <p className="mt-2 text-[14.5px] leading-[1.5] text-ink">Abrí un año para ver sus partidos.</p>
          <div className="mt-5">
            <CareerAccordion
              rows={careerRows}
              variant="desktop"
              totales={{ pj: perfil.capsTotal, tries: perfil.tries, puntos: perfil.puntos }}
            />
          </div>

          {rivales.length > 0 && (
            <>
              <h2 className="mt-11 text-[26px] font-extrabold tracking-[-.022em] text-navy-dark">Contra quiénes jugó más</h2>
              <p className="mt-2 text-[14.5px] leading-[1.5] text-ink">Abrí un club para ver todos los cruces.</p>
              <div className="mt-4">
                <RivalesCruces filas={rivales} variant="desktop" />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-[26px]" style={{ marginTop: 25 }}>
          {perfil.capsTotal > 0 && (
            <div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Titular o suplente</div>
              <div className="mt-[11px] flex gap-[18px]">
                <div className="flex items-center gap-[7px]">
                  <div className="h-[11px] w-[11px] rounded-[3px] bg-navy" />
                  <span className="font-mono text-[10.5px] text-ink">{perfil.capsTitular} de titular</span>
                </div>
                <div className="flex items-center gap-[7px]">
                  <div className="h-[11px] w-[11px] rounded-[3px]" style={{ background: "#f89c38" }} />
                  <span className="font-mono text-[10.5px] text-ink">{perfil.capsSuplente} de suplente</span>
                </div>
              </div>
              <div className="mt-[14px] flex flex-col gap-2">
                {roleBySeason.map((r) => (
                  <Link key={r.year} href={`/temporadas/${r.year}`} className="flex items-center gap-[11px]">
                    <span className="w-[34px] flex-none font-mono text-[11px] text-ink tabular-nums">{r.year}</span>
                    <div className="flex h-[11px] flex-1 overflow-hidden rounded-full" style={{ background: "#eef2f6" }}>
                      <div style={{ width: `${r.wS}%`, background: "#003868" }} />
                      <div style={{ width: `${r.wB}%`, background: "#f89c38" }} />
                    </div>
                    <span className="w-5 flex-none text-right font-mono text-[11px] text-navy tabular-nums">{r.pj}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {posiciones.length > 0 && (
            <div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Posiciones</div>
              <div className="mt-3 flex flex-col gap-[9px]">
                {posiciones.map((p) => (
                  <div key={p.posicion} className="flex items-center gap-[11px]">
                    <span className="w-16 flex-none text-[13px] font-semibold">{p.posicion}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "#eef2f6" }}>
                      <div className="h-full rounded-full bg-navy" style={{ width: `${p.w}%` }} />
                    </div>
                    <span className="w-6 flex-none text-right font-mono text-[11px] text-ink tabular-nums">{p.partidos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {playerMilestones.length > 0 && (
            <div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Top momentos</div>
              <div className="mt-2.5 flex flex-col">
                {playerMilestones.map((m, i) => (
                  <Link key={i} href={`/temporadas/${m.year}`} className="flex gap-3.5 border-b border-navy/[.09] py-3.5">
                    <span className="w-[38px] flex-none font-mono text-xs font-semibold text-orange-dark tabular-nums">{m.year}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-pretty text-sm font-semibold">{m.title}</div>
                      <div className="mt-1 text-pretty text-[12.5px] leading-[1.5] text-ink">{m.detail}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* desktop: su generación */}
      {perfil.camada && (
        <section className="hidden bg-navy lg:block">
          <div
            className="mx-auto grid items-center gap-14 px-10 py-12"
            style={{ maxWidth: 1280, gridTemplateColumns: "1.2fr .8fr" }}
          >
            <div>
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">Su generación</div>
              <div className="mt-3 text-[30px] font-extrabold tracking-[-.025em] text-white">Camada {perfil.camada}</div>
              <p className="mt-2.5 max-w-[520px] text-pretty text-[15.5px] leading-[1.55] text-white/72">
                Los que llegaron al club con él, y qué dejó esa generación.
              </p>
            </div>
            <Link
              href={`/camadas/${perfil.camada}`}
              className="inline-flex min-h-[52px] items-center justify-self-end gap-3 rounded-[10px] bg-orange px-6"
            >
              <span className="text-[15px] font-bold text-navy-dark">Ver la camada completa</span>
              <Chevron className="text-navy-dark" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
