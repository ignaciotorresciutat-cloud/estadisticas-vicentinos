import { getJugadorPerfil } from "@/lib/queries";
import { shareOgResponse, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/share-og";

// better-sqlite3 es un módulo nativo: esta imagen necesita correr en el
// runtime de Node, no en el Edge (que no soporta nativos).
export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await getJugadorPerfil(Number(id));

  if (!perfil) {
    return shareOgResponse({ kicker: "Club Vicentinos", title: "Jugador no encontrado", sub: "", stats: [] });
  }

  const titulos = perfil.logros.filter((l) => l.tipo === "CAMPEON").length;
  return shareOgResponse({
    kicker: "Ficha de jugador",
    title: perfil.nombre,
    sub: `${perfil.triesPorTemporada.length} temporadas en primera${perfil.camada ? ` · camada ${perfil.camada}` : ""}`,
    stats: [
      { label: "Presencias", value: perfil.capsTotal },
      { label: "Tries", value: perfil.tries },
      { label: "Títulos", value: titulos },
    ],
  });
}
