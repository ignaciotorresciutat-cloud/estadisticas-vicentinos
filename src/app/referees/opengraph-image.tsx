import { getRankingReferees } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const filas = await getRankingReferees();
  const top = [...filas].sort((a, b) => b.j - a.j)[0];
  return shareOgResponse({
    kicker: "Árbitros",
    title: "Árbitros",
    sub: `${filas.length} árbitros con partidos dirigidos a Vicentinos.`,
    stats: [
      { label: "Árbitros", value: filas.length },
      ...(top ? [{ label: "Más dirigidos", value: `${top.referee} · ${top.j}` }] : []),
    ],
  });
}
