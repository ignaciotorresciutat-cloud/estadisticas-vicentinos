import { getResumenClub, getTemporadasInfo } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [club, temporadasInfo] = await Promise.all([getResumenClub(), getTemporadasInfo()]);
  let títulos = 0;
  for (const info of temporadasInfo.values()) if (info.campeon) títulos++;
  return shareOgResponse({
    kicker: "El archivo",
    title: "Del Grupo IV a la Primera B",
    sub: `${club.temporadas} campañas jugadas, ${club.partidos} partidos, ${club.tries} tries.`,
    stats: [
      { label: "Partidos", value: club.partidos },
      { label: "Tries", value: club.tries },
      { label: "Títulos", value: títulos },
    ],
  });
}
