import { getClub, getPartidosDetalleRival } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";
import { formatDif } from "@/lib/format";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId: clubIdParam } = await params;
  const clubId = Number(clubIdParam);
  const [club, partidos] = await Promise.all([getClub(clubId), getPartidosDetalleRival(clubId)]);

  if (!club || partidos.length === 0) {
    return shareOgResponse({ kicker: "Historial de rivales", title: "Rival no encontrado", sub: "", stats: [] });
  }

  const nPj = partidos.length;
  const nW = partidos.filter((p) => p.resultadoPropio > p.resultadoRival).length;
  const nD = partidos.filter((p) => p.resultadoPropio === p.resultadoRival).length;
  const nL = partidos.filter((p) => p.resultadoPropio < p.resultadoRival).length;
  const sumPf = partidos.reduce((a, p) => a + p.resultadoPropio, 0);
  const sumPc = partidos.reduce((a, p) => a + p.resultadoRival, 0);

  return shareOgResponse({
    kicker: "Historial de rivales",
    title: club.nombre,
    sub: `${nPj} ${nPj === 1 ? "cruce" : "cruces"} · récord ${nW}—${nD}—${nL}.`,
    stats: [
      { label: "Puntos a favor", value: sumPf },
      { label: "En contra", value: sumPc },
      { label: "Diferencia", value: formatDif(sumPf - sumPc) },
    ],
  });
}
