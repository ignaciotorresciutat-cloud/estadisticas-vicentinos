import { getCamadasResumenCompleta } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";
import { formatNumero } from "@/lib/format";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ camada: string }> }) {
  const { camada: camadaParam } = await params;
  const camada = Number(camadaParam);
  const camadasResumen = await getCamadasResumenCompleta();
  const resumen = camadasResumen.find((c) => c.camada === camada);

  if (!resumen) {
    return shareOgResponse({ kicker: `Camada ${camada}`, title: "Sin datos", sub: "", stats: [] });
  }

  const posicion = [...camadasResumen].sort((a, b) => b.presencias - a.presencias).findIndex((c) => c.camada === camada) + 1;

  return shareOgResponse({
    kicker: `Camada ${camada}`,
    title: `${posicion}º camada del archivo`,
    sub: `${resumen.jugadoresConCaps} ${resumen.jugadoresConCaps === 1 ? "jugador" : "jugadores"} · ${
      resumen.titulos > 0 ? `${resumen.titulos} ${resumen.titulos === 1 ? "título" : "títulos"}` : "sin títulos"
    }`,
    stats: [
      { label: "Presencias", value: formatNumero(resumen.presencias) },
      { label: "Tries", value: resumen.tries },
      { label: "Puntos", value: formatNumero(resumen.puntos) },
    ],
  });
}
