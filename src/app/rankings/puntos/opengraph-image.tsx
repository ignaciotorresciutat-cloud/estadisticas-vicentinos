import { getRankingPuntos } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const filas = await getRankingPuntos();
  const lider = [...filas].sort((a, b) => b.puntos - a.puntos)[0];
  return shareOgResponse({
    kicker: "Ranking de puntos",
    title: "Ranking de puntos",
    sub: "Histórico de todas las temporadas, jugador por jugador.",
    stats: [
      { label: "Jugadores", value: filas.length },
      ...(lider
        ? [
            { label: "Líder", value: `${lider.nombre} · ${lider.puntos}` },
            { label: "Tries del líder", value: lider.tries },
          ]
        : []),
    ],
  });
}
