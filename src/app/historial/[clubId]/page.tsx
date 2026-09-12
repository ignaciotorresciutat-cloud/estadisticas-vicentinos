import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getClub,
  getPartidosDetalleRival,
  getTemporadasInfo,
  getResumenClub,
  type PartidoDetalle,
} from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { BackLink } from "@/components/back-link";
import { TarjetaIcon } from "@/components/tarjeta-icon";
import { formatDif, numeroEnPalabras, cantidadConSustantivo } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ clubId: string }> }): Promise<Metadata> {
  const { clubId: clubIdParam } = await params;
  const clubId = Number(clubIdParam);
  const [club, partidos] = await Promise.all([getClub(clubId), getPartidosDetalleRival(clubId)]);
  if (!club || partidos.length === 0) return { title: "Rival no encontrado · Club Vicentinos" };
  const nPj = partidos.length;
  const title = `${club.nombre} · Club Vicentinos`;
  const description = `Historial completo: ${nPj} ${nPj === 1 ? "cruce" : "cruces"} contra ${club.nombre}.`;
  return { title, description, openGraph: { title, description } };
}

const NOMBRE_TIPO_PUNTO: Record<string, string> = {
  TRY: "Tries",
  CONVERSION: "Conversiones",
  PENAL: "Penales",
  DROP: "Drops",
};

const TABS = [
  { key: "tries", label: "Más tries" },
  { key: "pj", label: "Más presencias" },
  { key: "wins", label: "Más victorias" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

type Resultado = "w" | "d" | "l";

function resultadoDe(p: PartidoDetalle): Resultado {
  if (p.resultadoPropio > p.resultadoRival) return "w";
  if (p.resultadoPropio < p.resultadoRival) return "l";
  return "d";
}

export default async function RivalPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { clubId: clubIdParam } = await params;
  const clubId = Number(clubIdParam);
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "tries";

  const [club, partidos, temporadasInfo, resumenClub] = await Promise.all([
    getClub(clubId),
    getPartidosDetalleRival(clubId),
    getTemporadasInfo(),
    getResumenClub(),
  ]);
  if (!club || partidos.length === 0) notFound();

  const porFechaDesc = [...partidos].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const nPj = partidos.length;
  const nW = partidos.filter((p) => resultadoDe(p) === "w").length;
  const nD = partidos.filter((p) => resultadoDe(p) === "d").length;
  const nL = partidos.filter((p) => resultadoDe(p) === "l").length;
  const sumPf = partidos.reduce((a, p) => a + p.resultadoPropio, 0);
  const sumPc = partidos.reduce((a, p) => a + p.resultadoRival, 0);
  const dif = sumPf - sumPc;
  const años = partidos.map((p) => p.temporada);
  const rivalSpan = `Historial · ${Math.min(...años)}—${Math.max(...años)}`;
  const rivalRecord = `${nW}—${nD}—${nL}`;
  const rivalCruces = `${nPj} ${nPj === 1 ? "cruce" : "cruces"}`;

  const widest = [...partidos].sort(
    (a, b) => b.resultadoPropio - b.resultadoRival - (a.resultadoPropio - a.resultadoRival)
  )[0];
  const widestDif = widest.resultadoPropio - widest.resultadoRival;
  const widestScore = `${widest.resultadoPropio}—${widest.resultadoRival}`;
  const widestTorneo = temporadasInfo.get(widest.temporada)?.torneo ?? "Sin torneo";

  const h2hSegs = [
    { n: nW, label: nW === 1 ? "1 ganado" : `${nW} ganados`, bg: "#003868" },
    { n: nD, label: nD === 1 ? "1 empatado" : `${nD} empatados`, bg: "#c3d0dd" },
    { n: nL, label: nL === 1 ? "1 perdido" : `${nL} perdidos`, bg: "#9c2b1f" },
  ].filter((s) => s.n > 0);

  const pct = nPj ? nW / nPj : 0;

  let h2hBlurb: string;
  if (nPj < 3) {
    // muestra chica: nada de calificativos, solo el dato desnudo
    h2hBlurb = `Pocos cruces todavía: ${nW} de ${nPj} ${nPj === 1 ? "ganado" : "ganados"}${nD > 0 ? `, con ${nD} ${nD === 1 ? "empate" : "empates"}` : ""}.`;
  } else {
    const lead =
      pct >= 0.75
        ? "Un historial ampliamente favorable"
        : pct > 0.6
          ? "Un cruce que Vicentinos suele ganar"
          : pct > 0.4
            ? "Un historial parejo"
            : pct > 0.25
              ? "Una cuenta pendiente"
              : "Un cruce que se le hace cuesta arriba";
    const rec =
      nW === nPj
        ? `invicto en ${numeroEnPalabras(nPj)} cruces`
        : `${cantidadConSustantivo(nW, "victoria", "victorias", "f")} en ${numeroEnPalabras(nPj)} cruces`;
    h2hBlurb = `${lead}: ${rec}${nD > 0 ? `, con ${cantidadConSustantivo(nD, "empate", "empates")}` : ""}.`;

    const lastRes = resultadoDe(porFechaDesc[0]);
    let streak = 0;
    for (const m of porFechaDesc) {
      if (resultadoDe(m) === lastRes) streak++;
      else break;
    }
    if (streak >= 3 && lastRes === "w") {
      const ultimaDerrota = porFechaDesc.find((m) => resultadoDe(m) === "l");
      h2hBlurb += ` Ganamos los últimos ${numeroEnPalabras(streak)} seguidos${ultimaDerrota ? `, sin perder desde ${ultimaDerrota.temporada}` : ""}.`;
    } else if (streak >= 2 && lastRes === "l") {
      const ultimaVictoria = porFechaDesc.find((m) => resultadoDe(m) === "w");
      h2hBlurb += ` Perdimos los últimos ${numeroEnPalabras(streak)}${ultimaVictoria ? `: la última alegría fue en ${ultimaVictoria.temporada}` : ""}.`;
    } else if (streak >= 2 && lastRes === "d") {
      h2hBlurb += ` Empatamos los últimos ${numeroEnPalabras(streak)}.`;
    } else if (widestDif > 0) {
      h2hBlurb += ` La victoria más amplia, ${widestScore} en ${widest.temporada}.`;
    }
  }

  const shareData = {
    kicker: "Historial de rivales",
    title: club.nombre,
    sub: `${rivalCruces} · récord ${rivalRecord}.`,
    stats: [
      { label: "Puntos a favor", value: sumPf },
      { label: "En contra", value: sumPc },
      { label: "Diferencia", value: formatDif(dif) },
    ],
  };

  const widestLabel = widestDif > 0 ? "Mayor goleada" : widestDif === 0 ? "Resultado más parejo" : "Derrota más ajustada";
  const h2hStats = [
    { value: String(sumPf), label: "Puntos a favor" },
    { value: String(sumPc), label: "En contra" },
    { value: formatDif(dif), label: "Diferencia" },
    { value: widestScore, label: widestLabel },
  ];

  const factLabel =
    widestDif > 0 ? "la victoria más amplia del cruce" : widestDif === 0 ? "el empate del cruce" : "la derrota más ajustada del cruce";
  const h2hFactTitle = `${widestScore}, ${factLabel}`;
  const cierreFact = widestDif > 0 ? "el margen más grande" : widestDif < 0 ? "el resultado más parejo" : null;
  const h2hFactText = `${widestTorneo} de ${widest.temporada}, en ${widest.cancha ?? "—"}: ${formatDif(widestDif)} puntos de diferencia${nPj > 1 && cierreFact ? `, ${cierreFact} de los ${rivalCruces}` : ""}.`;

  type Agg = {
    jugadorId: number;
    nombre: string;
    tries: number;
    presencias: number;
    victorias: number;
    primeraTemporada: number;
    ultimaTemporada: number;
  };
  const porJugador = new Map<number, Agg>();
  for (const m of partidos) {
    const gano = resultadoDe(m) === "w";
    for (const j of [...m.titulares, ...m.suplentes]) {
      const a = porJugador.get(j.jugadorId) ?? {
        jugadorId: j.jugadorId,
        nombre: j.nombre,
        tries: 0,
        presencias: 0,
        victorias: 0,
        primeraTemporada: m.temporada,
        ultimaTemporada: m.temporada,
      };
      a.presencias++;
      if (gano) a.victorias++;
      a.primeraTemporada = Math.min(a.primeraTemporada, m.temporada);
      a.ultimaTemporada = Math.max(a.ultimaTemporada, m.temporada);
      porJugador.set(j.jugadorId, a);
    }
    for (const pt of m.puntos) {
      if (pt.tipo !== "TRY") continue;
      const a = porJugador.get(pt.jugadorId);
      if (a) a.tries += pt.cantidad;
    }
  }
  const jugadores = [...porJugador.values()];
  const h2hData: Record<TabKey, Agg[]> = {
    tries: jugadores.filter((a) => a.tries > 0).sort((a, b) => b.tries - a.tries).slice(0, 4),
    pj: jugadores.slice().sort((a, b) => b.presencias - a.presencias).slice(0, 4),
    wins: jugadores.filter((a) => a.victorias > 0).sort((a, b) => b.victorias - a.victorias).slice(0, 4),
  };
  const h2hPeople = h2hData[tab].map((a, i) => ({
    pos: i + 1,
    jugadorId: a.jugadorId,
    nombre: a.nombre,
    detail:
      tab === "pj"
        ? a.primeraTemporada === a.ultimaTemporada
          ? String(a.primeraTemporada)
          : `${a.primeraTemporada}—${a.ultimaTemporada}`
        : `${a.presencias} ${a.presencias === 1 ? "cruce" : "cruces"}`,
    value: tab === "tries" ? a.tries : tab === "wins" ? a.victorias : a.presencias,
  }));

  return (
    <main>
      {/* mobile: hero navy con header propio de la pantalla */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-[26px]">
          <MobileBackHeader
            temporadasCount={resumenClub.temporadas}
            jugadoresCount={resumenClub.jugadores}
            clubesCount={resumenClub.clubesRivales}
            camadasCount={resumenClub.camadas}
            share={shareData}
          />
          <p className="mt-[22px] font-mono text-[10px] font-semibold tracking-[.13em] text-orange uppercase">{rivalSpan}</p>
          <h1 className="mt-[11px] text-[30px] leading-[1.08] font-extrabold tracking-[-.03em] text-white">{club.nombre}</h1>
          <div className="mt-5 flex items-end gap-3.5">
            <div className="font-mono text-[34px] leading-none font-semibold tracking-[-.02em] text-white tabular-nums">{rivalRecord}</div>
            <div className="pb-1 font-mono text-[9.5px] tracking-[.1em] text-white/60 uppercase">{rivalCruces}</div>
          </div>
          <div className="mt-3.5 flex h-[7px] gap-0.5">
            {h2hSegs.map((s, i) => (
              <div key={i} className="rounded-[2px]" style={{ width: `${(s.n / nPj) * 100}%`, background: s.bg === "#003868" ? "#fff" : s.bg === "#c3d0dd" ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)" }} />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3.5">
            {h2hSegs.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="h-[5px] w-2.5 rounded-[2px]"
                  style={{ background: s.bg === "#003868" ? "#fff" : s.bg === "#c3d0dd" ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)" }}
                />
                <span className="font-mono text-[9px] tracking-[.1em] text-white/60 uppercase">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-pretty text-[13.5px] leading-[1.55] text-white/78">{h2hBlurb}</p>
        </div>
      </section>

      {/* desktop: hero navy sin header propio */}
      <section className="hidden bg-navy lg:block">
        <div className="mx-auto px-10 py-11" style={{ maxWidth: 1280 }}>
          <BackLink href="/historial" label="Rivales" />
          <div className="mt-[18px] grid items-end gap-14" style={{ gridTemplateColumns: "1.1fr .9fr" }}>
            <div>
              <h1 className="text-[56px] leading-[1.02] font-extrabold tracking-[-.032em] text-white">{club.nombre}</h1>
              <div className="mt-3.5 flex flex-wrap items-baseline gap-[18px]">
                <span className="font-mono text-[13px] text-white/70">{rivalSpan}</span>
                <span className="font-mono text-[13px] text-orange">
                  {rivalCruces} · {rivalRecord}
                </span>
              </div>
              <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full">
                {h2hSegs.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      flex: s.n,
                      background: s.bg === "#003868" ? "#fff" : s.bg === "#c3d0dd" ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)",
                    }}
                  />
                ))}
              </div>
              <p className="mt-[18px] max-w-[560px] text-pretty text-base leading-[1.55] text-white/78">{h2hBlurb}</p>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px]" style={{ background: "rgba(255,255,255,.18)" }}>
              {h2hStats.map((s, i) => (
                <div key={i} className="min-w-0 bg-navy p-5">
                  <div className="font-mono text-[26px] font-semibold text-white tabular-nums">{s.value}</div>
                  <div className="mt-1.5 font-mono text-[9.5px] tracking-[.11em] text-white/55 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* mobile: h2hStats 2x2 */}
      <div className="px-5 pt-[22px] lg:hidden">
        <div className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-navy/[.15]">
          {h2hStats.map((s, i) => (
            <div key={i} className="border-r border-b border-navy/[.09] p-3.5">
              <div className="text-xl leading-none font-extrabold tracking-[-.02em] text-navy-dark tabular-nums">{s.value}</div>
              <div className="mt-1.5 font-mono text-[9px] tracking-[.1em] text-ink uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* mobile: lista de cruces */}
      <div className="px-5 pt-[30px] lg:hidden">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Todos los cruces</h2>
        <p className="mt-[7px] text-[13px] leading-[1.5] text-ink">Del más reciente al primero.</p>
      </div>
      <div className="flex flex-col gap-2 px-5 pt-3.5 lg:hidden">
        {porFechaDesc.map((p) => (
          <MobileH2HCard key={p.id} partido={p} torneo={temporadasInfo.get(p.temporada)?.torneo ?? "Sin torneo"} />
        ))}
      </div>

      {/* mobile: quiénes lo jugaron */}
      <div className="px-5 pt-8 lg:hidden">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">Quiénes lo jugaron</h2>
        <div className="mt-3 flex overflow-hidden rounded-[9px]" style={{ background: "rgba(0,56,104,.14)", gap: 1 }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/historial/${clubId}${t.key === "tries" ? "" : `?tab=${t.key}`}`}
              className="flex min-h-[38px] flex-1 items-center justify-center px-1 font-mono text-[10px] font-semibold tracking-[.08em] uppercase"
              style={{ background: tab === t.key ? "#003868" : "#fff", color: tab === t.key ? "#fff" : "#46658a" }}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="mt-2 flex flex-col">
          {h2hPeople.map((s) => (
            <Link
              key={s.jugadorId}
              href={`/jugadores/${s.jugadorId}`}
              className="flex min-h-11 items-center gap-3 border-b border-navy/[.09] py-[13px]"
            >
              <div className="w-5 flex-none font-mono text-[11px] text-navy/40 tabular-nums">{s.pos}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold text-navy-dark">{s.nombre}</div>
                <div className="mt-1 truncate font-mono text-[10px] text-ink">{s.detail}</div>
              </div>
              <div className="flex-none text-right text-[17px] font-extrabold text-navy tabular-nums">{s.value}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* mobile: dato del cruce */}
      <div className="mt-[34px] bg-navy px-5 pt-7 pb-11 lg:hidden">
        <p className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">Dato del cruce</p>
        <p className="mt-2.5 text-[19px] font-extrabold tracking-[-.02em] text-white">{h2hFactTitle}</p>
        <p className="mt-2 text-pretty text-[13.5px] leading-[1.5] text-white/72">{h2hFactText}</p>
      </div>

      {/* desktop: dos columnas */}
      <div className="mx-auto hidden gap-11 px-10 pt-11 pb-20 lg:grid" style={{ maxWidth: 1280, gridTemplateColumns: "2.1fr 1fr", alignItems: "start" }}>
        <div>
          <h2 className="text-[26px] font-extrabold tracking-[-.022em] text-navy-dark">Todos los cruces</h2>
          <div className="mt-5 overflow-hidden rounded-[14px] border border-navy/[.13]">
            {porFechaDesc.map((p) => (
              <DesktopH2HRow key={p.id} partido={p} torneo={temporadasInfo.get(p.temporada)?.torneo ?? "Sin torneo"} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[26px]">
          <div className="rounded-[14px] border border-navy/[.13] p-[22px]">
            <p className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Dato del cruce</p>
            <p className="mt-2.5 text-pretty text-[19px] font-bold tracking-[-.015em] text-navy-dark">{h2hFactTitle}</p>
            <p className="mt-2 text-pretty text-sm leading-[1.55] text-ink">{h2hFactText}</p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Quiénes lo jugaron</p>
            <div className="mt-3 flex flex-wrap gap-[7px]">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`/historial/${clubId}${t.key === "tries" ? "" : `?tab=${t.key}`}`}
                  className="flex min-h-9 items-center rounded-full border px-3.5 font-mono text-[11.5px] font-semibold"
                  style={{
                    borderColor: "rgba(0,56,104,.16)",
                    background: tab === t.key ? "#003868" : "#fff",
                    color: tab === t.key ? "#fff" : "#003868",
                  }}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-col">
              {h2hPeople.map((s) => (
                <Link
                  key={s.jugadorId}
                  href={`/jugadores/${s.jugadorId}`}
                  className="flex items-center gap-[13px] border-b border-navy/[.09] py-[13px]"
                >
                  <div className="w-3.5 flex-none font-mono text-xs text-ink tabular-nums">{s.pos}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold text-navy-dark">{s.nombre}</div>
                    <div className="mt-1 truncate font-mono text-[10.5px] text-ink">{s.detail}</div>
                  </div>
                  <div className="flex-none font-mono text-[17px] font-semibold text-navy tabular-nums">{s.value}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
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

function H2HMatchDetail({ partido, mostrarCTA }: { partido: PartidoDetalle; mostrarCTA: boolean }) {
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
    <div className="border-t border-navy/[.09] px-3.5 pb-4 pl-5 lg:bg-[rgba(0,56,104,.03)] lg:px-[18px] lg:py-5">
      <div className="grid grid-cols-2 gap-3 pt-3.5 lg:grid-cols-4 lg:gap-4 lg:pt-0">
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
                  <div key={t.jugadorId} className="flex items-baseline gap-2 lg:gap-2.5">
                    <span className="w-3.5 flex-none text-right font-mono text-[10px] text-navy/45 tabular-nums lg:w-4 lg:text-[11px]">
                      {t.numeroCamiseta ?? "—"}
                    </span>
                    <Link
                      href={`/jugadores/${t.jugadorId}`}
                      className="min-w-0 truncate text-[11.5px] font-medium text-navy-dark hover:text-orange lg:text-[13px]"
                    >
                      {t.nombre}
                      {t.capitan ? " (C)" : ""}
                    </Link>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                {backs.map((t) => (
                  <div key={t.jugadorId} className="flex items-baseline gap-2 lg:gap-2.5">
                    <span className="w-3.5 flex-none text-right font-mono text-[10px] text-navy/45 tabular-nums lg:w-4 lg:text-[11px]">
                      {t.numeroCamiseta ?? "—"}
                    </span>
                    <Link
                      href={`/jugadores/${t.jugadorId}`}
                      className="min-w-0 truncate text-[11.5px] font-medium text-navy-dark hover:text-orange lg:text-[13px]"
                    >
                      {t.nombre}
                      {t.capitan ? " (C)" : ""}
                    </Link>
                  </div>
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
                  <div key={tipo} className="text-pretty text-[11.5px] leading-[1.45] text-ink lg:text-[13px]">
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
          Formación no cargada para este cruce.
        </div>
      )}

      {mostrarCTA && (
        <Link
          href={`/temporadas/${partido.temporada}`}
          className="mt-[18px] flex min-h-[42px] items-center justify-center rounded-[10px] font-mono text-[10.5px] font-semibold tracking-[.08em] text-navy-dark uppercase"
          style={{ border: "1px solid rgba(0,56,104,.2)" }}
        >
          Ver temporada {partido.temporada}
        </Link>
      )}
    </div>
  );
}

function MobileH2HCard({ partido, torneo }: { partido: PartidoDetalle; torneo: string }) {
  const bar = partido.resultadoPropio > partido.resultadoRival ? "#003868" : partido.resultadoPropio === partido.resultadoRival ? "#c3d0dd" : "#9c2b1f";
  return (
    <details className="group overflow-hidden rounded-xl border border-navy/[.13]">
      <summary className="flex cursor-pointer list-none items-stretch gap-3 marker:content-none">
        <div className="w-1.5 flex-none" style={{ background: bar }} />
        <div className="flex flex-1 items-center gap-3 py-[13px] pr-3.5">
          <div className="w-[34px] flex-none font-mono text-xs font-semibold text-navy tabular-nums">{partido.temporada}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-navy-dark">
              {torneo}
              {partido.etapa ? ` · ${partido.etapa}` : ""}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[.05em] text-ink">
              {partido.cancha ?? "—"} · {formatFechaCorta(partido.fecha)}
            </div>
          </div>
          <div className="flex-none font-mono text-sm font-semibold text-navy-dark tabular-nums">
            {partido.resultadoPropio} — {partido.resultadoRival}
          </div>
          <ChevronDown className="flex-none text-navy-dark transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <H2HMatchDetail partido={partido} mostrarCTA />
    </details>
  );
}

function DesktopH2HRow({ partido, torneo }: { partido: PartidoDetalle; torneo: string }) {
  const bar = partido.resultadoPropio > partido.resultadoRival ? "#003868" : partido.resultadoPropio === partido.resultadoRival ? "#c3d0dd" : "#9c2b1f";
  return (
    <details className="group border-t border-navy/[.09] first:border-t-0">
      <summary
        className="grid cursor-pointer list-none items-stretch gap-3.5 py-3.5 pr-[18px] marker:content-none"
        style={{ gridTemplateColumns: "6px 74px 74px minmax(0,1fr) 120px 104px" }}
      >
        <div style={{ background: bar }} />
        <div className="self-center font-mono text-[13px] font-semibold text-navy-dark tabular-nums">{partido.temporada}</div>
        <div className="self-center font-mono text-[11.5px] text-ink">{formatFechaCorta(partido.fecha)}</div>
        <div className="min-w-0 self-center text-[14.5px] font-semibold">
          {torneo}
          {partido.etapa ? ` · ${partido.etapa}` : ""}
        </div>
        <div className="self-center truncate font-mono text-[11.5px] text-ink">{partido.cancha ?? "—"}</div>
        <div className="self-center text-right font-mono text-[15px] font-semibold text-navy-dark tabular-nums">
          {partido.resultadoPropio} — {partido.resultadoRival}
        </div>
      </summary>
      <H2HMatchDetail partido={partido} mostrarCTA={false} />
    </details>
  );
}
