import { getResumenClub, getTemporadasInfo } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [club, temporadasInfo] = await Promise.all([getResumenClub(), getTemporadasInfo()]);
  return shareOgResponse({
    kicker: "El archivo",
    title: "Todas las temporadas",
    sub: `Las ${temporadasInfo.size} campañas del club, año por año.`,
    stats: [
      { label: "Temporadas", value: club.temporadas },
      { label: "Partidos", value: club.partidos },
      { label: "Tries", value: club.tries },
    ],
  });
}
