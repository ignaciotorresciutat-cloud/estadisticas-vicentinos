import Link from "next/link";
import type { Metadata } from "next";
import { getRecords, getTemporadasInfo, getResumenClub } from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { formatNumero, formatDif } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [records, temporadasInfo] = await Promise.all([getRecords(), getTemporadasInfo()]);
  const años = [...temporadasInfo.keys()];
  const rango = años.length > 0 ? `${Math.min(...años)}—${Math.max(...años)}` : "";
  const title = "Los techos del club · Club Vicentinos";
  const description = records.temporadaMasTries
    ? `Las marcas más altas del archivo, ${rango}. Récord de tries en una temporada: ${records.temporadaMasTries.cantidad}.`
    : `Las marcas más altas del archivo, ${rango}.`;
  return { title, description, openGraph: { title, description } };
}

function formatFechaCorta(d: Date): string {
  const dia = new Date(d)
    .toLocaleDateString("es-AR", { timeZone: "UTC", weekday: "short" })
    .replace(/\.$/, "");
  const resto = new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
  return `${dia} ${resto}`;
}

type Item = {
  kicker: string;
  value: string;
  unit: string;
  detail: string;
  href: string;
};

function Chevron({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function RecordsPage() {
  const [records, temporadasInfo, club] = await Promise.all([getRecords(), getTemporadasInfo(), getResumenClub()]);

  const años = [...temporadasInfo.keys()];
  const rango = años.length > 0 ? `${Math.min(...años)}—${Math.max(...años)}` : "";

  const enUnaTemporada: Item[] = [];
  if (records.temporadaMasTries) {
    const r = records.temporadaMasTries;
    enUnaTemporada.push({
      kicker: "Más tries",
      value: String(r.cantidad),
      unit: "tries",
      detail: `${r.temporada} · ${r.torneo ?? "Sin torneo"} · ${r.pj} partidos`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.temporadaMasPuntos) {
    const r = records.temporadaMasPuntos;
    enUnaTemporada.push({
      kicker: "Más puntos a favor",
      value: formatNumero(r.cantidad),
      unit: "puntos",
      detail: `${r.temporada} · ${Math.round(r.cantidad / r.pj)} por partido`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.temporadaMejorDif) {
    const r = records.temporadaMejorDif;
    enUnaTemporada.push({
      kicker: "Mejor diferencia",
      value: formatDif(r.cantidad),
      unit: "de saldo",
      detail: `${r.temporada} · ${r.torneo ?? "Sin torneo"}`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.temporadaMasVictorias) {
    const r = records.temporadaMasVictorias;
    enUnaTemporada.push({
      kicker: "Más victorias",
      value: String(r.cantidad),
      unit: "ganados",
      detail: `${r.temporada} · de ${r.pj} partidos`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.temporadaMasLimpia) {
    const r = records.temporadaMasLimpia;
    enUnaTemporada.push({
      kicker: "Temporada más limpia",
      value: String(r.cantidad),
      unit: r.cantidad === 1 ? "amarilla" : "amarillas",
      detail: `${r.temporada} · en ${r.pj} partidos`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.temporadaMasPlantel) {
    const r = records.temporadaMasPlantel;
    enUnaTemporada.push({
      kicker: "Plantel más numeroso",
      value: String(r.cantidad),
      unit: "jugadores",
      detail: `${r.temporada} · ${r.torneo ?? "Sin torneo"}`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  const deUnJugador: Item[] = [];
  if (records.trymanTemporada) {
    const r = records.trymanTemporada;
    deUnJugador.push({
      kicker: "Tryman de una temporada",
      value: String(r.tries),
      unit: "tries",
      detail: `${r.nombre} · ${r.temporada}`,
      href: `/jugadores/${r.jugadorId}`,
    });
  }
  if (records.jugadorMasTriesPartido) {
    const r = records.jugadorMasTriesPartido;
    deUnJugador.push({
      kicker: "Más tries en un partido",
      value: String(r.cantidad),
      unit: "tries",
      detail: `${r.nombre} · vs ${r.rival} · ${formatFechaCorta(r.fecha)} · ${r.temporada}`,
      href: `/jugadores/${r.jugadorId}`,
    });
  }
  if (records.jugadorMasPuntosPartido) {
    const r = records.jugadorMasPuntosPartido;
    deUnJugador.push({
      kicker: "Más puntos en un partido",
      value: String(r.cantidad),
      unit: "puntos",
      detail: `${r.nombre} · vs ${r.rival} · ${formatFechaCorta(r.fecha)} · ${r.temporada}`,
      href: `/jugadores/${r.jugadorId}`,
    });
  }
  if (records.jugadorMasTemporadas) {
    const r = records.jugadorMasTemporadas;
    deUnJugador.push({
      kicker: "Más temporadas",
      value: String(r.cantidad),
      unit: "temporadas",
      detail: `${r.nombre} · ${r.primeraTemporada}—${r.ultimaTemporada}`,
      href: `/jugadores/${r.jugadorId}`,
    });
  }

  const enUnPartido: Item[] = [];
  if (records.mayorVictoria) {
    const r = records.mayorVictoria;
    enUnPartido.push({
      kicker: "Victoria más abultada",
      value: `${r.resultadoPropio}—${r.resultadoRival}`,
      unit: `+${r.resultadoPropio - r.resultadoRival}`,
      detail: `vs ${r.rival} · ${formatFechaCorta(r.fecha)} · ${r.temporada}`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.mayorPuntuacion) {
    const r = records.mayorPuntuacion;
    enUnPartido.push({
      kicker: "Más puntos anotados",
      value: String(r.resultadoPropio),
      unit: "puntos",
      detail: `vs ${r.rival} · ${formatFechaCorta(r.fecha)} · ${r.resultadoPropio}—${r.resultadoRival}`,
      href: `/temporadas/${r.temporada}`,
    });
  }
  if (records.partidoMasTries) {
    const r = records.partidoMasTries;
    enUnPartido.push({
      kicker: "Partido con más tries",
      value: String(r.tries),
      unit: "tries",
      detail: `vs ${r.rival} · ${formatFechaCorta(r.fecha)} · ${r.resultadoPropio}—${r.resultadoRival}`,
      href: `/temporadas/${r.temporada}`,
    });
  }

  const rachas: Item[] = [];
  if (records.rachaVictorias) {
    const r = records.rachaVictorias;
    rachas.push({
      kicker: "Racha de victorias más larga",
      value: String(r.cantidad),
      unit: r.cantidad === 1 ? "victoria" : "victorias",
      detail:
        r.desde.fecha.getTime() === r.hasta.fecha.getTime()
          ? `vs ${r.desde.rival} · ${formatFechaCorta(r.desde.fecha)} · ${r.desde.temporada}`
          : `Desde vs ${r.desde.rival} (${r.desde.temporada}) hasta vs ${r.hasta.rival} (${r.hasta.temporada})`,
      href: `/temporadas/${r.hasta.temporada}`,
    });
  }
  if (records.jugadorMasPartidosConsecutivos) {
    const r = records.jugadorMasPartidosConsecutivos;
    rachas.push({
      kicker: "Más partidos consecutivos sin faltar",
      value: String(r.cantidad),
      unit: "seguidos",
      detail: `${r.nombre} · ${r.desde.temporada}—${r.hasta.temporada}`,
      href: `/jugadores/${r.jugadorId}`,
    });
  }
  if (records.jugadorRachaTries) {
    const r = records.jugadorRachaTries;
    rachas.push({
      kicker: "Racha de tries más larga",
      value: String(r.cantidad),
      unit: "partidos",
      detail: `${r.nombre} · convirtió try en cada uno · ${r.desde.temporada}—${r.hasta.temporada}`,
      href: `/jugadores/${r.jugadorId}`,
    });
  }

  const grupos = [
    { title: "En una temporada", items: enUnaTemporada },
    { title: "De un jugador", items: deUnJugador },
    { title: "En un partido", items: enUnPartido },
    { title: "Rachas", items: rachas },
  ].filter((g) => g.items.length > 0);
  const recordsCount = grupos.reduce((a, g) => a + g.items.length, 0);
  const eyebrow = `${recordsCount} marcas · ${rango}`;

  return (
    <main>
      {/* mobile: hero navy con header propio de la pantalla */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-7">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
          />
          <p className="mt-5 font-mono text-[10px] font-semibold tracking-[.14em] text-orange uppercase">{eyebrow}</p>
          <h1 className="mt-[11px] text-balance text-[29px] leading-[1.07] font-extrabold tracking-[-.032em] text-white">
            Los techos del club
          </h1>
          <p className="mt-2.5 text-pretty text-[13.5px] leading-[1.5] text-white/75">
            Las marcas más altas que dejó el archivo. Tocá cualquiera para ir a la temporada o a la ficha donde pasó.
          </p>
        </div>
      </section>

      {/* mobile: grupos */}
      <div className="lg:hidden">
        {grupos.map((g) => (
          <div key={g.title}>
            <div className="px-5 pt-7">
              <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">{g.title}</h2>
            </div>
            <div className="flex flex-col gap-2 px-5 pt-3">
              {g.items.map((it) => (
                <Link
                  key={it.kicker}
                  href={it.href}
                  className="flex items-center gap-3.5 rounded-xl px-4 py-3.5"
                  style={{ border: "1px solid rgba(0,56,104,.15)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[9px] tracking-[.11em] text-orange-dark uppercase">{it.kicker}</div>
                    <div className="mt-[7px] flex items-baseline gap-[7px]">
                      <span className="text-[25px] leading-none font-extrabold tracking-[-.03em] text-navy tabular-nums">
                        {it.value}
                      </span>
                      <span className="font-mono text-[9.5px] tracking-[.08em] text-ink uppercase">{it.unit}</span>
                    </div>
                    <div className="mt-[7px] text-pretty text-[12.5px] leading-[1.45] text-ink">{it.detail}</div>
                  </div>
                  <Chevron className="flex-none" color="rgba(0,56,104,.35)" />
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="h-9" />
      </div>

      {/* desktop */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-12 pb-20 lg:block">
        <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange-dark uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-[44px] font-extrabold tracking-[-.03em] text-navy-dark">Las marcas más altas</h1>
        <p className="mt-3 max-w-[620px] text-[15.5px] leading-[1.55] text-ink">
          Todo lo que se puede calcular con los datos cargados. Cada marca abre la temporada o la ficha donde se logró.
        </p>

        <div className="mt-8 flex flex-col gap-10">
          {grupos.map((g) => (
            <div key={g.title}>
              <div className="flex items-baseline gap-3.5">
                <h2 className="text-2xl font-extrabold tracking-[-.02em] text-navy-dark">{g.title}</h2>
                <div className="h-px flex-1" style={{ background: "rgba(0,56,104,.14)" }} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-4">
                {g.items.map((it) => (
                  <Link
                    key={it.kicker}
                    href={it.href}
                    className="min-w-0 rounded-[14px] p-5"
                    style={{ border: "1px solid rgba(0,56,104,.13)" }}
                  >
                    <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">
                      {it.kicker}
                    </div>
                    <div className="mt-3 flex items-baseline gap-[9px]">
                      <div className="font-mono text-[34px] font-semibold tracking-[-.025em] text-navy tabular-nums">
                        {it.value}
                      </div>
                      <div className="font-mono text-[11px] tracking-[.08em] text-ink uppercase">{it.unit}</div>
                    </div>
                    <div className="mt-2.5 text-pretty text-[13.5px] leading-[1.5] text-ink">{it.detail}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
