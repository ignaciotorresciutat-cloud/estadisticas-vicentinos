import Link from "next/link";
import { notFound } from "next/navigation";
import { getDetalleCamada } from "@/lib/queries";
import { JugadorLink } from "@/components/jugador-link";

export const dynamic = "force-dynamic";

function formatFecha(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export default async function DetalleCamadaPage({
  params,
}: {
  params: Promise<{ camada: string }>;
}) {
  const { camada } = await params;
  const detalle = await getDetalleCamada(Number(camada));
  if (!detalle) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/camadas" className="text-sm text-navy/70 hover:text-orange">
        ← Camadas
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy-dark">Camada {detalle.camada}</h1>
      <p className="mt-1 text-sm text-navy/70">{detalle.jugadores.length} jugadores</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              <th className="py-2 pr-2 pl-3">Jugador</th>
              <th className="py-2 pr-2 text-right">Titular</th>
              <th className="py-2 pr-2 text-right">Suplente</th>
              <th className="py-2 pr-2 text-right font-semibold">Total</th>
              <th className="py-2 pr-2 text-right">Tries</th>
              <th className="py-2 pr-2 text-right">Puntos</th>
              <th className="py-2 pr-2 text-right">Tarjetas</th>
              <th className="border-l border-white/30 py-2 pr-2 pl-3">Debut</th>
            </tr>
          </thead>
          <tbody>
            {detalle.jugadores.map((j) => (
              <tr key={j.id} className="border-b border-navy-light/60 odd:bg-navy-light">
                <td className="py-1.5 pr-2 pl-3">
                  <JugadorLink id={j.id} className="text-navy">
                    {j.nombre}
                  </JugadorLink>
                </td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{j.capsTitular}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{j.capsSuplente}</td>
                <td className="py-1.5 pr-2 text-right font-semibold text-navy-dark">{j.capsTotal}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{j.tries}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{j.puntos}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{j.tarjetas}</td>
                <td className="border-l border-navy-light py-1.5 pr-2 pl-3 whitespace-nowrap text-navy/70">
                  {formatFecha(j.fechaDebut)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
