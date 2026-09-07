import Link from "next/link";
import Image from "next/image";
import {
  getResumenClub,
  getResumenTemporadas,
  getRankingPuntos,
  getRankingPresencias,
  getHistorialGeneral,
  getTemporadasInfo,
} from "@/lib/queries";
import { SectionHeading } from "@/components/section-heading";
import { JugadorLink } from "@/components/jugador-link";
import { ClubLink } from "@/components/club-link";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-navy-light px-2 py-2 text-center sm:px-4 sm:py-3">
      <div className="text-base font-semibold text-navy-dark sm:text-2xl">{value}</div>
      <div className="text-[10px] text-navy/70 sm:text-xs">{label}</div>
    </div>
  );
}

function ExploreCard({
  href,
  emoji,
  title,
  description,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-navy-light p-3 transition-colors hover:border-orange hover:bg-orange-light sm:gap-3 sm:p-4"
    >
      <span className="text-xl sm:text-2xl">{emoji}</span>
      <span>
        <span className="block text-sm font-semibold text-navy-dark sm:text-base">{title}</span>
        <span className="block text-xs text-navy/70">{description}</span>
      </span>
    </Link>
  );
}

function MiniRankingPanel({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: { jugadorId: number; nombre: string; valor: string }[];
}) {
  return (
    <div className="rounded-lg border border-navy-light p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-navy-dark">{title}</h3>
        <Link href={href} className="text-xs text-navy hover:text-orange">
          Ver todo →
        </Link>
      </div>
      <ol className="mt-2 divide-y divide-navy-light">
        {items.map((it, i) => (
          <li
            key={it.jugadorId}
            className="flex items-center justify-between px-1.5 py-1.5 text-sm odd:bg-navy-light"
          >
            <span>
              <span className="mr-2 text-navy/50">{i + 1}</span>
              <JugadorLink id={it.jugadorId} className="text-navy-dark">
                {it.nombre}
              </JugadorLink>
            </span>
            <span className="text-navy/70">{it.valor}</span>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-center text-navy/50">Sin datos.</li>}
      </ol>
    </div>
  );
}

export default async function Home() {
  const [club, temporadas, puntos, presencias, historial, temporadasInfo] = await Promise.all([
    getResumenClub(),
    getResumenTemporadas(),
    getRankingPuntos(),
    getRankingPresencias(),
    getHistorialGeneral(),
    getTemporadasInfo(),
  ]);

  const primeraTemporada = temporadas.length > 0 ? Math.min(...temporadas.map((t) => t.temporada)) : null;
  const ultimaTemporada = temporadas.length > 0 ? Math.max(...temporadas.map((t) => t.temporada)) : null;

  const topPuntos = [...puntos].slice(0, 5);
  const topTries = [...puntos].sort((a, b) => b.tries - a.tries).slice(0, 5);
  const topPresencias = presencias.slice(0, 5);
  const topRivales = historial.slice(0, 5);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="flex items-center gap-4">
        <Image
          src="/escudo-vicentinos.jpg"
          alt="Escudo Club Vicentinos"
          width={64}
          height={64}
          className="h-16 w-auto"
          priority
        />
        <div>
          <h1 className="text-2xl font-semibold text-navy-dark">Estadísticas</h1>
          <p className="mt-1 text-sm text-navy/70">
            {primeraTemporada && ultimaTemporada
              ? `Historia del club, campañas ${primeraTemporada}–${ultimaTemporada}`
              : "Historia del club"}
          </p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Temporadas" value={club.temporadas} />
        <StatCard label="Partidos" value={club.partidos} />
        <StatCard label="Jugadores" value={club.jugadores} />
        <StatCard label="Tries" value={club.tries} />
      </div>

      <section className="mt-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ExploreCard
            href="/jugadores"
            emoji="🏉"
            title="Jugadores"
            description="Perfiles y estadísticas"
          />
          <ExploreCard
            href="/camadas"
            emoji="👥"
            title="Camadas"
            description="Por año de nacimiento"
          />
          <ExploreCard
            href="/historial"
            emoji="🆚"
            title="Rivales"
            description="Historial completo"
          />
          <ExploreCard href="/records" emoji="🏆" title="Récords" description="Las mejores marcas" />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading>Resultados por temporada</SectionHeading>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-center text-white">
                <th className="px-3 py-2 text-left">Temporada</th>
                <th className="px-3 py-2">PJ</th>
                <th className="px-3 py-2">G</th>
                <th className="px-3 py-2">E</th>
                <th className="px-3 py-2">P</th>
                <th className="border-l border-white/30 px-3 py-2">Jugadores</th>
                <th className="px-3 py-2">Tries</th>
                <th className="px-3 py-2">Tarjetas</th>
                <th className="border-l border-white/30 px-4 py-2 text-left">Tryman</th>
              </tr>
            </thead>
            <tbody>
              {temporadas.map((t) => {
                const info = temporadasInfo.get(t.temporada);
                return (
                <tr key={t.temporada} className="border-b border-navy-light/60 text-center odd:bg-navy-light">
                  <td className="px-3 py-1.5 text-left font-medium whitespace-nowrap">
                    <Link
                      href={`/temporadas/${t.temporada}`}
                      className="inline-flex items-center gap-1 text-navy hover:text-orange"
                    >
                      {t.temporada}
                      <span className="text-xs text-navy/50">→</span>
                    </Link>
                    {info?.campeon && (
                      <span className="ml-1" title="Campeón">
                        🏆
                      </span>
                    )}
                    {info?.ascenso && (
                      <span className="ml-1 font-bold text-green-600" title="Ascenso">
                        ▲
                      </span>
                    )}
                    {info?.descenso && (
                      <span className="ml-1 font-bold text-red-600" title="Descenso">
                        ▼
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-navy-dark">{t.partidosJugados}</td>
                  <td className="px-3 py-1.5 text-navy-dark">{t.ganados}</td>
                  <td className="px-3 py-1.5 text-navy-dark">{t.empatados}</td>
                  <td className="px-3 py-1.5 text-navy-dark">{t.perdidos}</td>
                  <td className="border-l border-navy-light px-3 py-1.5 text-navy-dark">{t.jugadores}</td>
                  <td className="px-3 py-1.5 text-navy-dark">{t.tries}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-navy-dark">
                    {t.tarjetasAmarillas}A / {t.tarjetasRojas}R
                  </td>
                  <td className="border-l border-navy-light px-4 py-1.5 text-left whitespace-nowrap text-navy/70">
                    {t.maxTryScorer ? (
                      <JugadorLink id={t.maxTryScorer.jugadorId}>
                        {t.maxTryScorer.nombre} ({t.maxTryScorer.tries})
                      </JugadorLink>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading>Rankings históricos</SectionHeading>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MiniRankingPanel
            title="Presencias"
            href="/rankings/presencias"
            items={topPresencias.map((f) => ({ jugadorId: f.jugadorId, nombre: f.nombre, valor: `${f.total}` }))}
          />
          <MiniRankingPanel
            title="Tries"
            href="/rankings/puntos"
            items={topTries.map((f) => ({ jugadorId: f.jugadorId, nombre: f.nombre, valor: `${f.tries}` }))}
          />
          <MiniRankingPanel
            title="Puntos"
            href="/rankings/puntos"
            items={topPuntos.map((f) => ({ jugadorId: f.jugadorId, nombre: f.nombre, valor: `${f.puntos}` }))}
          />
        </div>
      </section>

      <section className="mt-10 mb-10">
        <SectionHeading
          action={
            <Link href="/historial" className="text-sm text-white hover:text-orange">
              Ver historial completo →
            </Link>
          }
        >
          Historial vs. rivales
        </SectionHeading>
        <p className="mt-1 text-sm text-navy/70">Los 5 rivales que más enfrentamos</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-left text-white">
                <th className="py-2 pr-2 pl-3">Rival</th>
                <th className="py-2 pr-2 text-right">PJ</th>
                <th className="py-2 pr-2 text-right">G</th>
                <th className="py-2 pr-2 text-right">E</th>
                <th className="py-2 pr-2 text-right">P</th>
              </tr>
            </thead>
            <tbody>
              {topRivales.map((f) => (
                <tr key={f.clubId} className="border-b border-navy-light/60 odd:bg-navy-light">
                  <td className="py-1.5 pr-2 pl-3 font-medium">
                    <ClubLink id={f.clubId} className="text-navy">
                      {f.club}
                    </ClubLink>
                  </td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{f.total.j}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{f.total.g}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{f.total.e}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{f.total.p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
