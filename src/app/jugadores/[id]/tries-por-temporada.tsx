import type { FilaTriesTemporada } from "@/lib/queries";
import { BadgePill } from "@/components/badge-pill";

function formatFecha(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function formatTarjetas(tarjetas: string[]): string {
  if (tarjetas.length === 0) return "-";
  return tarjetas.map((t) => (t === "AMARILLA" ? "Amarilla" : "Roja")).join(", ");
}

export function TriesPorTemporada({ temporadas }: { temporadas: FilaTriesTemporada[] }) {
  if (temporadas.length === 0) {
    return <p className="py-6 text-center text-navy/50">Sin tries registrados.</p>;
  }

  return (
    <div className="divide-y divide-navy-light border-y border-navy-light">
      <div className="hidden grid-cols-6 gap-2 px-3 py-2 text-xs font-medium text-navy/70 sm:grid">
        <span>Año</span>
        <span className="text-right">Presencias</span>
        <span className="text-right">Puntos</span>
        <span className="text-right">Tries</span>
        <span className="text-right">Tarjetas</span>
        <span className="text-right">Prom./partido</span>
      </div>
      {temporadas.map((t) => {
        const badgesTemporada = [...t.badges.presencias, ...t.badges.puntos, ...t.badges.tries];
        return (
        <details key={t.temporada} className="group py-1 odd:bg-navy-light">
          <summary className="cursor-pointer px-3 py-2 text-sm marker:content-none">
            {/* mobile: año + resumen en texto, badges abajo */}
            <div className="sm:hidden">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-navy-dark">
                  <span className="mr-1 inline-block text-orange transition-transform group-open:rotate-90">
                    ▸
                  </span>
                  {t.temporada}
                </span>
                <span className="text-xs text-navy/60">{t.promedio.toFixed(2)} prom./partido</span>
              </div>
              <div className="mt-1 ml-4 text-xs text-navy/70">
                {t.presencias} presencias · {t.puntos || 0} pts · {t.tries} tries
                {t.tarjetas > 0 && ` · ${t.tarjetas} tarjetas`}
              </div>
              {badgesTemporada.length > 0 && (
                <div className="mt-1.5 ml-4 flex flex-wrap gap-1.5">
                  {badgesTemporada.map((b, i) => (
                    <BadgePill key={i} badge={b} wrap />
                  ))}
                </div>
              )}
            </div>

            {/* desktop: columnas alineadas con el header */}
            <div className="hidden grid-cols-6 items-center gap-2 sm:grid">
              <span className="font-medium text-navy-dark">
                <span className="mr-1 inline-block text-orange transition-transform group-open:rotate-90">
                  ▸
                </span>
                {t.temporada}
              </span>
              <span className="text-right text-navy-dark">{t.presencias}</span>
              <span className="text-right text-navy-dark">{t.puntos || "-"}</span>
              <span className="text-right text-navy-dark">{t.tries}</span>
              <span className="text-right text-navy-dark">{t.tarjetas || "-"}</span>
              <span className="text-right text-navy-dark">{t.promedio.toFixed(2)}</span>
            </div>
            {badgesTemporada.length > 0 && (
              <div className="mt-1.5 ml-4 hidden flex-wrap gap-1.5 sm:flex">
                {badgesTemporada.map((b, i) => (
                  <BadgePill key={i} badge={b} />
                ))}
              </div>
            )}
          </summary>
          {/* mobile: lista compacta, sin tabla, para no forzar scroll horizontal */}
          <ul className="mb-2 divide-y divide-navy-light/40 sm:hidden">
            {t.detalle.map((d, i) => (
              <li key={i} className="py-1.5 pr-2 pl-6 text-sm odd:bg-navy-light">
                <div className="flex items-baseline gap-1.5">
                  {d.etapa ? (
                    <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {d.etapa}
                    </span>
                  ) : (
                    <span className="text-xs text-navy/50">#{d.numero}</span>
                  )}
                  <span className="font-medium text-navy-dark">{d.rival}</span>
                </div>
                <div className="text-xs text-navy/60">
                  {formatFecha(d.fecha)} · {d.condicion === "LOCAL" ? "Local" : "Visitante"}
                </div>
                <div className="text-xs text-navy/60">
                  {d.puntos} pts
                  {d.tries > 0 && ` · ${d.tries} tries`}
                  {d.conversiones > 0 && ` · ${d.conversiones} conv`}
                  {d.penales > 0 && ` · ${d.penales} pen`}
                  {d.drops > 0 && ` · ${d.drops} drop`}
                  {d.tarjetas.length > 0 && ` · ${formatTarjetas(d.tarjetas)}`}
                </div>
              </li>
            ))}
          </ul>

          {/* desktop: tabla completa */}
          <table className="mb-2 hidden w-full border-collapse text-sm sm:table">
            <thead>
              <tr className="border-b border-navy-light text-left text-navy/50">
                <th className="py-1.5 pr-2 pl-6 font-normal">#</th>
                <th className="py-1.5 pr-2 font-normal">Fecha</th>
                <th className="py-1.5 pr-2 font-normal">Rival</th>
                <th className="py-1.5 pr-2 font-normal">Cond.</th>
                <th className="py-1.5 pr-2 text-right font-normal">Puntos</th>
                <th className="py-1.5 pr-2 text-right font-normal">Tries</th>
                <th className="py-1.5 pr-2 text-right font-normal">Conv.</th>
                <th className="py-1.5 pr-2 text-right font-normal">Pen.</th>
                <th className="py-1.5 pr-2 text-right font-normal">Drop</th>
                <th className="py-1.5 pr-2 text-right font-normal">Tarjetas</th>
              </tr>
            </thead>
            <tbody>
              {t.detalle.map((d, i) => (
                <tr key={i} className="border-b border-navy-light/40 odd:bg-navy-light">
                  <td className="py-1.5 pr-2 pl-6 whitespace-nowrap text-navy/50">
                    {d.etapa ? (
                      <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {d.etapa}
                      </span>
                    ) : (
                      d.numero
                    )}
                  </td>
                  <td className="py-1.5 pr-2 whitespace-nowrap text-navy-dark">{formatFecha(d.fecha)}</td>
                  <td className="py-1.5 pr-2 text-navy-dark">{d.rival}</td>
                  <td className="py-1.5 pr-2 text-navy/60">{d.condicion === "LOCAL" ? "L" : "V"}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{d.puntos || "-"}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{d.tries || "-"}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{d.conversiones || "-"}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{d.penales || "-"}</td>
                  <td className="py-1.5 pr-2 text-right text-navy-dark">{d.drops || "-"}</td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap text-navy-dark">
                    {formatTarjetas(d.tarjetas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        );
      })}
    </div>
  );
}
