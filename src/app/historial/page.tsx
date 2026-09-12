import type { Metadata } from "next";
import { getHistorialGeneral, getResumenClub } from "@/lib/queries";
import { RivalesLista } from "./rivales-lista";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [club, filas] = await Promise.all([getResumenClub(), getHistorialGeneral()]);
  const totalPartidos = filas.reduce((acc, f) => acc + f.total.j, 0);
  const title = "Contra quiénes jugamos · Club Vicentinos";
  const description = `${club.clubesRivales} clubes enfrentados en ${totalPartidos} partidos.`;
  return { title, description, openGraph: { title, description } };
}

const ORDEN_VALIDOS = ["pj", "best", "worst"] as const;
type OrdenKey = (typeof ORDEN_VALIDOS)[number];

function esOrdenKey(v: string | undefined): v is OrdenKey {
  return ORDEN_VALIDOS.some((o) => o === v);
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string }>;
}) {
  const { orden: ordenParam } = await searchParams;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "pj";

  const [club, filas] = await Promise.all([getResumenClub(), getHistorialGeneral()]);

  const pct = (f: (typeof filas)[number]) => (f.total.j ? f.total.g / f.total.j : 0);
  const filasOrdenadas = [...filas].sort((a, b) => {
    if (orden === "best") return pct(b) - pct(a) || b.total.j - a.total.j;
    if (orden === "worst") return pct(a) - pct(b) || b.total.j - a.total.j;
    return b.total.j - a.total.j;
  });

  const totalPartidos = filas.reduce((acc, f) => acc + f.total.j, 0);
  const eyebrow = `${club.clubesRivales} clubes · ${totalPartidos.toLocaleString("es-AR")} partidos`;

  return (
    <main>
      <RivalesLista club={club} filas={filasOrdenadas} orden={orden} eyebrow={eyebrow} />
    </main>
  );
}
