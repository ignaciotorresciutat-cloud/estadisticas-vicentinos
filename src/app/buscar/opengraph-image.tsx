import { getResumenClub } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const club = await getResumenClub();
  return shareOgResponse({
    kicker: "Buscador",
    title: "Buscá en el archivo",
    sub: "Jugadores, rivales, temporadas y camadas en un solo lugar.",
    stats: [
      { label: "Jugadores", value: club.jugadores },
      { label: "Clubes", value: club.clubesRivales },
      { label: "Temporadas", value: club.temporadas },
    ],
  });
}
