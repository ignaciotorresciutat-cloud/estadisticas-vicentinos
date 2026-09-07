import Link from "next/link";
import { getRankingPresencias, getTemporadasDisponibles, type FilaRankingPresencias } from "@/lib/queries";
import { TemporadaTabs } from "@/components/temporada-tabs";
import { JugadorLink } from "@/components/jugador-link";

export const dynamic = "force-dynamic";

const ORDEN_OPCIONES = [
  { key: "titular", label: "Titular" },
  { key: "suplente", label: "Suplente" },
  { key: "total", label: "Total" },
] as const;

type OrdenKey = (typeof ORDEN_OPCIONES)[number]["key"];

function esOrdenKey(valor: string | undefined): valor is OrdenKey {
  return ORDEN_OPCIONES.some((o) => o.key === valor);
}

function ordenarFilas(filas: FilaRankingPresencias[], orden: OrdenKey): FilaRankingPresencias[] {
  return [...filas].sort(
    (a, b) => b[orden] - a[orden] || b.total - a.total || a.nombre.localeCompare(b.nombre)
  );
}

export default async function RankingPresenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ temporada?: string; orden?: string }>;
}) {
  const { temporada: temporadaParam, orden: ordenParam } = await searchParams;
  const temporada = temporadaParam ? Number(temporadaParam) : undefined;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "titular";

  const [temporadas, filasSinOrdenar] = await Promise.all([
    getTemporadasDisponibles(),
    getRankingPresencias(temporada),
  ]);
  const filas = ordenarFilas(filasSinOrdenar, orden);

  function hrefOrden(key: OrdenKey) {
    const params = new URLSearchParams();
    if (temporada) params.set("temporada", String(temporada));
    if (key !== "titular") params.set("orden", key);
    const qs = params.toString();
    return qs ? `/rankings/presencias?${qs}` : "/rankings/presencias";
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Ranking de presencias</h1>
      <p className="mt-1 text-sm text-navy/70">
        {temporada ? `Temporada ${temporada}` : "Histórico (todas las temporadas)"}
      </p>

      <div className="mt-4">
        <TemporadaTabs basePath="/rankings/presencias" temporadas={temporadas} temporadaActiva={temporada} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              <th className="py-2 pr-2 pl-3">#</th>
              <th className="py-2 pr-2">Jugador</th>
              {ORDEN_OPCIONES.map((o) => (
                <th key={o.key} className={`py-2 pr-2 text-right ${o.key === "total" ? "font-semibold" : ""}`}>
                  <Link
                    href={hrefOrden(o.key)}
                    className={`hover:text-orange ${orden === o.key ? "text-orange" : ""}`}
                  >
                    {o.label}
                    {orden === o.key ? " ▾" : ""}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.jugadorId} className="border-b border-navy-light/60 odd:bg-navy-light">
                <td className="py-1.5 pr-2 pl-3 text-navy/50">{i + 1}</td>
                <td className="py-1.5 pr-2 text-navy-dark"><JugadorLink id={f.jugadorId}>{f.nombre}</JugadorLink></td>
                <td className={`py-1.5 pr-2 text-right text-navy-dark ${orden === "titular" ? "font-semibold" : ""}`}>
                  {f.titular}
                </td>
                <td className={`py-1.5 pr-2 text-right text-navy-dark ${orden === "suplente" ? "font-semibold" : ""}`}>
                  {f.suplente}
                </td>
                <td className="py-1.5 pr-2 text-right font-semibold text-navy-dark">{f.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 && (
          <p className="py-6 text-center text-navy/50">Sin datos para esta temporada.</p>
        )}
      </div>
    </main>
  );
}
