import { getHistorialGeneral } from "@/lib/queries";
import { ClubLink } from "@/components/club-link";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const filas = await getHistorialGeneral();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Historial vs. rivales</h1>
      <p className="mt-1 text-sm text-navy/70">{filas.length} clubes rivales enfrentados</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              <th className="py-2 pr-2 pl-3">Rival</th>
              <th className="py-2 pr-2 text-right">PJ</th>
              <th className="py-2 pr-2 text-right">G</th>
              <th className="py-2 pr-2 text-right">E</th>
              <th className="py-2 pr-2 text-right">P</th>
              <th className="py-2 pr-2 text-right">PJ Local</th>
              <th className="py-2 pr-2 text-right">PJ Visitante</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
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
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.local.j}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.visitante.j}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
