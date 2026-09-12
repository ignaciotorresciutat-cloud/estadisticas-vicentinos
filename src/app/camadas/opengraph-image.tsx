import { getResumenClub, getCamadasResumenCompleta } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [club, camadas] = await Promise.all([getResumenClub(), getCamadasResumenCompleta()]);
  const top = [...camadas].sort((a, b) => b.presencias - a.presencias)[0];
  return shareOgResponse({
    kicker: "Las generaciones",
    title: "Camadas",
    sub: "Cada generación por año de nacimiento, con sus números en el club.",
    stats: [
      { label: "Camadas", value: club.camadas },
      { label: "Jugadores", value: club.jugadores },
      ...(top ? [{ label: "Más presencias", value: `Camada ${top.camada}` }] : []),
    ],
  });
}
