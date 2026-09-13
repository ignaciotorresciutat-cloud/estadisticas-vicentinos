import type { Metadata } from "next";
import {
  getListaJugadoresCompleta,
  getHistorialGeneral,
  getResumenTemporadas,
  getTemporadasInfo,
  getCamadasResumenCompleta,
  getResumenClub,
} from "@/lib/queries";
import { Buscador } from "./buscador";

export async function generateMetadata(): Promise<Metadata> {
  const club = await getResumenClub();
  const title = "Buscá en todo el archivo · Club Vicentinos";
  const description = `Jugadores, rivales, temporadas y camadas: ${club.jugadores} fichas, ${club.clubesRivales} clubes.`;
  return { title, description, openGraph: { title, description } };
}

export default async function BuscarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [jugadores, rivales, resumenTemporadas, temporadasInfo, camadas, { q }] = await Promise.all([
    getListaJugadoresCompleta(),
    getHistorialGeneral(),
    getResumenTemporadas(),
    getTemporadasInfo(),
    getCamadasResumenCompleta(),
    searchParams,
  ]);

  const resumenPorAño = new Map(resumenTemporadas.map((r) => [r.temporada, r]));
  const temporadas = [...temporadasInfo.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([año, info]) => ({ año, info, resumen: resumenPorAño.get(año) ?? null }));

  return (
    <main>
      <Buscador jugadores={jugadores} rivales={rivales} temporadas={temporadas} camadas={camadas} initialQuery={q ?? ""} />
    </main>
  );
}
