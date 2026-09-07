import Link from "next/link";
import { notFound } from "next/navigation";
import { getDetalleRival, getPartidosDetalleRival } from "@/lib/queries";
import { SectionHeading } from "@/components/section-heading";
import { JugadorLink } from "@/components/jugador-link";
import { PartidoDetalleCard } from "@/components/partido-detalle-card";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-navy-light px-3 py-2">
      <div className="text-xs text-navy/70">{label}</div>
      <div className="text-lg font-semibold text-navy-dark">{value}</div>
    </div>
  );
}

function StatJugador({ dato }: { dato: { jugadorId: number; nombre: string; cantidad: number } | null }) {
  if (!dato) return "-";
  return (
    <JugadorLink id={dato.jugadorId}>
      {dato.nombre} ({dato.cantidad})
    </JugadorLink>
  );
}

export default async function DetalleRivalPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const [detalle, partidos] = await Promise.all([
    getDetalleRival(Number(clubId)),
    getPartidosDetalleRival(Number(clubId)),
  ]);
  if (!detalle) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/historial" className="text-sm text-navy/70 hover:text-orange">
        ← Historial vs. rivales
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy-dark">{detalle.club}</h1>
      <p className="mt-1 text-sm text-navy/70">
        {detalle.total.j} enfrentamientos · {detalle.local.j} de local, {detalle.visitante.j} de
        visitante
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat label="PJ" value={detalle.total.j} />
        <Stat label="G" value={detalle.total.g} />
        <Stat label="E" value={detalle.total.e} />
        <Stat label="P" value={detalle.total.p} />
        <Stat label="G Local" value={detalle.local.g} />
        <Stat label="G Visitante" value={detalle.visitante.g} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Más presencias" value={<StatJugador dato={detalle.masPresencias} />} />
        <Stat label="Más tries" value={<StatJugador dato={detalle.masTries} />} />
        <Stat label="Más victorias" value={<StatJugador dato={detalle.masVictorias} />} />
      </div>

      <div className="mt-8">
        <SectionHeading>Enfrentamientos</SectionHeading>
      </div>
      <p className="mt-1 text-sm text-navy/70">Tocá un partido para ver el detalle completo.</p>
      <div className="mt-3 divide-y divide-navy-light border-y border-navy-light">
        {partidos.map((p, i) => (
          <PartidoDetalleCard key={p.id} partido={p} numero={i + 1} mostrarRival={false} />
        ))}
        {partidos.length === 0 && <p className="py-6 text-center text-navy/50">Sin partidos registrados.</p>}
      </div>
    </main>
  );
}
