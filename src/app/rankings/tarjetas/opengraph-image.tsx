import { getRankingTarjetas } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const filas = await getRankingTarjetas();
  const lider = [...filas].sort((a, b) => b.total - a.total)[0];
  return shareOgResponse({
    kicker: "Ranking de tarjetas",
    title: "Ranking de tarjetas",
    sub: "Histórico de todas las temporadas, jugador por jugador.",
    stats: [
      { label: "Jugadores", value: filas.length },
      ...(lider
        ? [
            { label: "Líder", value: `${lider.nombre} · ${lider.total}` },
            { label: "Amarillas del líder", value: lider.amarillas },
          ]
        : []),
    ],
  });
}
