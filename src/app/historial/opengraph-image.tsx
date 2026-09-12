import { getResumenClub, getHistorialGeneral } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [club, filas] = await Promise.all([getResumenClub(), getHistorialGeneral()]);
  const totalPartidos = filas.reduce((acc, f) => acc + f.total.j, 0);
  const top = [...filas].sort((a, b) => b.total.j - a.total.j)[0];
  return shareOgResponse({
    kicker: "Historial de rivales",
    title: "Contra quiénes jugamos",
    sub: `${club.clubesRivales} clubes enfrentados en ${totalPartidos} partidos.`,
    stats: [
      { label: "Clubes", value: club.clubesRivales },
      { label: "Partidos", value: totalPartidos },
      ...(top ? [{ label: "Más cruces", value: `${top.club} · ${top.total.j}` }] : []),
    ],
  });
}
