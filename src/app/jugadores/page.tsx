import { getListaJugadores } from "@/lib/queries";
import { BuscadorJugadores } from "./buscador-jugadores";

export const dynamic = "force-dynamic";

export default async function JugadoresPage() {
  const jugadores = await getListaJugadores();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Jugadores</h1>
      <p className="mt-1 text-sm text-navy/70">{jugadores.length} jugadores históricos</p>
      <div className="mt-4">
        <BuscadorJugadores jugadores={jugadores} />
      </div>
    </main>
  );
}
