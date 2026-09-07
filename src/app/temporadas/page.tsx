import Link from "next/link";
import { getResumenTemporadas, getTemporadasInfo } from "@/lib/queries";
import { SectionHeading } from "@/components/section-heading";
import { JugadorLink } from "@/components/jugador-link";

export const dynamic = "force-dynamic";

const ETIQUETA_LOGRO: Record<string, string> = {
  campeon: "🏆 Campeón",
  ascenso: "Ascenso",
  descenso: "Descenso",
};

const COLOR_LOGRO: Record<string, string> = {
  campeon: "bg-navy",
  ascenso: "bg-navy",
  descenso: "bg-red-600",
};

export default async function TemporadasPage() {
  const [temporadas, temporadasInfo] = await Promise.all([getResumenTemporadas(), getTemporadasInfo()]);
  const actual = temporadas.length > 0 ? Math.max(...temporadas.map((t) => t.temporada)) : null;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/" className="text-sm text-navy/70 hover:text-orange">
        ← Inicio
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy-dark">Temporadas</h1>
      <p className="mt-1 text-sm text-navy/70">Resultados y estadísticas de todas las campañas.</p>

      <div className="mt-6">
        <SectionHeading>Resultados por temporada</SectionHeading>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-center text-white">
                <th className="px-3 py-2 text-left">Temporada</th>
                <th className="border-l border-white/30 px-3 py-2 text-left">Torneo</th>
                <th className="px-3 py-2">PJ</th>
                <th className="px-3 py-2">G</th>
                <th className="px-3 py-2">E</th>
                <th className="px-3 py-2">P</th>
                <th className="border-l border-white/30 px-3 py-2">PF</th>
                <th className="px-3 py-2">PC</th>
                <th className="px-3 py-2">Dif.</th>
                <th className="border-l border-white/30 px-3 py-2">Jugadores</th>
                <th className="px-3 py-2">Tries</th>
                <th className="px-3 py-2">Tarjetas</th>
                <th className="border-l border-white/30 px-4 py-2 text-left">Tryman</th>
              </tr>
            </thead>
            <tbody>
              {temporadas.map((t) => {
                const dif = t.puntosFavor - t.puntosContra;
                const info = temporadasInfo.get(t.temporada);
                // una sola pill: si fue campeón y ascendió a la vez, priorizamos "Campeón"
                const logro = info
                  ? (["campeon", "ascenso", "descenso"] as const).find((k) => info[k])
                  : undefined;
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
                      {t.temporada === actual && (
                        <span className="ml-1.5 rounded-full border border-navy/30 px-1.5 py-0.5 text-[10px] text-navy/70">
                          Actual
                        </span>
                      )}
                    </td>
                    <td className="border-l border-navy-light px-3 py-1.5 text-left whitespace-nowrap text-navy-dark">
                      {info?.torneo ?? "-"}
                      {logro && (
                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] text-white ${COLOR_LOGRO[logro]}`}>
                          {ETIQUETA_LOGRO[logro]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-navy-dark">{t.partidosJugados}</td>
                    <td className="px-3 py-1.5 text-navy-dark">{t.ganados}</td>
                    <td className="px-3 py-1.5 text-navy-dark">{t.empatados}</td>
                    <td className="px-3 py-1.5 text-navy-dark">{t.perdidos}</td>
                    <td className="border-l border-navy-light px-3 py-1.5 text-navy-dark">{t.puntosFavor}</td>
                    <td className="px-3 py-1.5 text-navy-dark">{t.puntosContra}</td>
                    <td
                      className={`px-3 py-1.5 font-medium ${
                        dif > 0 ? "text-navy-dark" : dif < 0 ? "text-orange-dark" : "text-navy/60"
                      }`}
                    >
                      {dif > 0 ? `+${dif}` : dif}
                    </td>
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
      </div>
    </main>
  );
}
