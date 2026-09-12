import { getResumenClub, getListaJugadoresCompleta } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [club, jugadores] = await Promise.all([getResumenClub(), getListaJugadoresCompleta()]);
  const lider = [...jugadores].sort((a, b) => b.partidosJugados - a.partidosJugados)[0];
  return shareOgResponse({
    kicker: "Plantel histórico",
    title: "Todos los que jugaron 15:30",
    sub: `${club.jugadores} fichas con al menos una presencia en el club.`,
    stats: [
      { label: "Jugadores", value: club.jugadores },
      { label: "Camadas", value: club.camadas },
      ...(lider ? [{ label: "Más presencias", value: `${lider.nombre} · ${lider.partidosJugados}` }] : []),
    ],
  });
}
