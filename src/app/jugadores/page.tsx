import type { Metadata } from "next";
import {
  getListaJugadoresCompleta,
  getTemporadasDisponibles,
  getTemporadasInfo,
  getResumenClub,
} from "@/lib/queries";
import { JugadoresLista } from "./jugadores-lista";

export async function generateMetadata(): Promise<Metadata> {
  const club = await getResumenClub();
  const title = "Jugadores · Club Vicentinos";
  const description = `${club.jugadores} fichas con al menos una presencia en el club, de ${club.camadas} camadas distintas.`;
  return { title, description, openGraph: { title, description } };
}

const ORDEN_VALIDOS = ["titular", "suplente", "total", "tries", "points"] as const;
type OrdenKey = (typeof ORDEN_VALIDOS)[number];

function esOrdenKey(v: string | undefined): v is OrdenKey {
  return ORDEN_VALIDOS.some((o) => o === v);
}

export default async function JugadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; orden?: string }>;
}) {
  const { anio: anioParam, orden: ordenParam } = await searchParams;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "total";
  const anio = anioParam ? Number(anioParam) : null;

  const [club, temporadasDisponibles, temporadasInfo, filas] = await Promise.all([
    getResumenClub(),
    getTemporadasDisponibles(),
    getTemporadasInfo(),
    getListaJugadoresCompleta(anio ?? undefined),
  ]);

  const filasOrdenadas = [...filas].sort((a, b) => {
    if (orden === "titular") return b.titular - a.titular || b.partidosJugados - a.partidosJugados;
    if (orden === "suplente") return b.suplente - a.suplente || b.partidosJugados - a.partidosJugados;
    if (orden === "tries") return b.tries - a.tries || b.partidosJugados - a.partidosJugados;
    if (orden === "points") return b.puntos - a.puntos || b.partidosJugados - a.partidosJugados;
    return b.partidosJugados - a.partidosJugados || b.titular - a.titular;
  });

  const años = [...temporadasInfo.keys()];
  const rango = años.length > 0 ? `${Math.min(...años)}—${Math.max(...años)}` : "";
  const anios = [...temporadasDisponibles].reverse();

  const eyebrow = anio ? `Plantel ${anio}` : `${club.jugadores} fichas · ${rango}`;
  const titulo = anio ? `Los que jugaron en ${anio}` : "Todos los que jugaron 15:30";

  return (
    <main>
      <JugadoresLista club={club} filas={filasOrdenadas} anios={anios} anio={anio} orden={orden} eyebrow={eyebrow} titulo={titulo} />
    </main>
  );
}
