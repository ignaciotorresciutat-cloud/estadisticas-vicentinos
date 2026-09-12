import { getResumenTemporadas, getTemporadaInfo } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const temporada = Number(year);
  const [resumenes, info] = await Promise.all([getResumenTemporadas(), getTemporadaInfo(temporada)]);
  const resumen = resumenes.find((r) => r.temporada === temporada);

  if (!resumen) {
    return shareOgResponse({ kicker: `Temporada ${temporada}`, title: "Sin torneo disputado", sub: "", stats: [] });
  }

  const empatadosLabel = resumen.empatados === 1 ? "empatado" : "empatados";
  return shareOgResponse({
    kicker: `Temporada ${temporada}`,
    title: info?.campeon ? `Campeón de ${info.torneo}` : (info?.torneo ?? `Temporada ${temporada}`),
    sub: `${resumen.ganados} ganados · ${resumen.empatados} ${empatadosLabel} · ${resumen.perdidos} perdidos`,
    stats: [
      { label: "Puntos a favor", value: resumen.puntosFavor },
      { label: "Tries", value: resumen.tries },
      { label: "Jugadores", value: resumen.jugadores },
    ],
  });
}
