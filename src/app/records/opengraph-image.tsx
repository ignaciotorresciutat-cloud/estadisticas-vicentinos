import { getRecords, getTemporadasInfo } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const [records, temporadasInfo] = await Promise.all([getRecords(), getTemporadasInfo()]);
  const años = [...temporadasInfo.keys()];
  const rango = años.length > 0 ? `${Math.min(...años)}—${Math.max(...años)}` : "";

  return shareOgResponse({
    kicker: "Récords históricos",
    title: "Los techos del club",
    sub: `Las marcas más altas que dejó el archivo, ${rango}.`,
    stats: [
      ...(records.temporadaMasTries ? [{ label: "Más tries en una temporada", value: records.temporadaMasTries.cantidad }] : []),
      ...(records.mayorVictoria
        ? [{ label: "Mayor goleada", value: `${records.mayorVictoria.resultadoPropio}—${records.mayorVictoria.resultadoRival}` }]
        : []),
      ...(records.jugadorMasTemporadas
        ? [{ label: "Más temporadas jugadas", value: `${records.jugadorMasTemporadas.nombre} · ${records.jugadorMasTemporadas.cantidad}` }]
        : []),
    ],
  });
}
