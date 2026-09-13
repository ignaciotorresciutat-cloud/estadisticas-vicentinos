import type { Metadata } from "next";
import { getRankingReferees } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const filas = await getRankingReferees();
  const title = "Árbitros · Club Vicentinos";
  const description = `${filas.length} árbitros con partidos dirigidos a Vicentinos.`;
  return { title, description, openGraph: { title, description } };
}

export default async function RefereesPage() {
  const filas = await getRankingReferees();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Referees</h1>
      <p className="mt-1 text-sm text-navy/70">{filas.length} árbitros con partidos registrados</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              <th className="py-2 pr-2 pl-3">Referee</th>
              <th className="py-2 pr-2 text-right">PJ</th>
              <th className="py-2 pr-2 text-right">G</th>
              <th className="py-2 pr-2 text-right">E</th>
              <th className="py-2 pr-2 text-right">P</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.referee} className="border-b border-navy-light/60 odd:bg-navy-light">
                <td className="py-1.5 pr-2 pl-3 text-navy-dark">{f.referee}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.j}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.g}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.e}</td>
                <td className="py-1.5 pr-2 text-right text-navy-dark">{f.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 && <p className="py-6 text-center text-navy/50">Sin datos.</p>}
      </div>
    </main>
  );
}
