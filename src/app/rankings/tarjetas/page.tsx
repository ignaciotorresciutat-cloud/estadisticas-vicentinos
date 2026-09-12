import type { Metadata } from "next";
import { getRankingTarjetas, getTemporadasDisponibles } from "@/lib/queries";
import { TemporadaTabs } from "@/components/temporada-tabs";
import { JugadorLink } from "@/components/jugador-link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const filas = await getRankingTarjetas();
  const lider = [...filas].sort((a, b) => b.total - a.total)[0];
  const title = "Ranking de tarjetas · Club Vicentinos";
  const description = lider
    ? `${filas.length} jugadores. Líder histórico: ${lider.nombre}, con ${lider.total} tarjetas.`
    : `Ranking histórico de tarjetas, jugador por jugador.`;
  return { title, description, openGraph: { title, description } };
}

export default async function RankingTarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ temporada?: string }>;
}) {
  const { temporada: temporadaParam } = await searchParams;
  const temporada = temporadaParam ? Number(temporadaParam) : undefined;

  const [temporadas, filas] = await Promise.all([
    getTemporadasDisponibles(),
    getRankingTarjetas(temporada),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Ranking de tarjetas</h1>
      <p className="mt-1 text-sm text-navy/70">
        {temporada ? `Temporada ${temporada}` : "Histórico (todas las temporadas)"}
      </p>

      <div className="mt-4">
        <TemporadaTabs basePath="/rankings/tarjetas" temporadas={temporadas} temporadaActiva={temporada} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              <th className="py-2 pr-2 pl-3">#</th>
              <th className="py-2 pr-2">Jugador</th>
              <th className="py-2 pr-2 text-right">Amarillas</th>
              <th className="py-2 pr-2 text-right">Rojas</th>
              <th className="py-2 pr-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.jugadorId} className="border-b border-navy-light/60 odd:bg-navy-light">
                <td className="py-1.5 pr-2 pl-3 text-navy/50">{i + 1}</td>
                <td className="py-1.5 pr-2 text-navy-dark"><JugadorLink id={f.jugadorId}>{f.nombre}</JugadorLink></td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.amarillas}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.rojas}</td>
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
