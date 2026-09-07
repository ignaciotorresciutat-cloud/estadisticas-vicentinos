import Link from "next/link";
import { notFound } from "next/navigation";
import { getJugadorPerfil, type Badge } from "@/lib/queries";
import { TriesPorTemporada } from "./tries-por-temporada";
import { HistorialRivalesTable } from "./historial-rivales-table";
import { BadgePill } from "@/components/badge-pill";
import { SectionHeading } from "@/components/section-heading";
import { TarjetaIcon } from "@/components/tarjeta-icon";

export const dynamic = "force-dynamic";

const ETIQUETA_LOGRO: Record<string, string> = {
  CAMPEON: "🏆 Campeón",
  ASCENSO: "Ascenso",
};

function formatFecha(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function StatBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-navy-light p-3">
      <div className="text-xs font-semibold tracking-wide text-navy/70 uppercase">{title}</div>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  badge,
  nota,
  icon,
}: {
  label: string;
  value: string | number;
  badge?: Badge | null;
  nota?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-sm text-navy/70">
        {icon}
        {label}
      </span>
      <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span className="font-semibold text-navy-dark">{value}</span>
        {nota && <span className="text-xs text-navy/50">({nota})</span>}
        {badge && <BadgePill badge={badge} wrap />}
      </span>
    </div>
  );
}

export default async function PerfilJugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await getJugadorPerfil(Number(id));
  if (!perfil) notFound();

  // una sola pill por año: si fue campeón y ascendió a la vez, priorizamos "Campeón"
  const temporadasConCampeon = new Set(
    perfil.logros.filter((l) => l.tipo === "CAMPEON").map((l) => l.temporada)
  );
  const logrosMostrados = perfil.logros.filter(
    (l) => l.tipo !== "ASCENSO" || !temporadasConCampeon.has(l.temporada)
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/jugadores" className="text-sm text-navy/70 hover:text-orange">
        ← Jugadores
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-navy-dark">{perfil.nombre}</h1>
      <p className="mt-1 text-sm text-navy/70">
        {perfil.camada ? `Camada ${perfil.camada}` : "Camada sin dato"}
        {perfil.vicentinoN ? ` · Vicentino N° ${perfil.vicentinoN}` : ""}
        {" · Debut "}
        {formatFecha(perfil.fechaDebut)}
      </p>

      {logrosMostrados.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {logrosMostrados.map((l, i) => (
            <span
              key={`${l.temporada}-${l.tipo}-${i}`}
              className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white"
            >
              {ETIQUETA_LOGRO[l.tipo]} {l.temporada}
            </span>
          ))}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <StatBox title="Presencias">
            <StatRow
              label="Titular"
              value={perfil.capsTitular}
              badge={perfil.badgeCapsTitular}
              nota={perfil.partidosComoCapitan > 0 ? `${perfil.partidosComoCapitan} cap.` : undefined}
            />
            <StatRow label="Suplente" value={perfil.capsSuplente} />
            <StatRow label="Total" value={perfil.capsTotal} />
          </StatBox>

          {perfil.posiciones.length > 0 && (
            <StatBox title="Posiciones">
              {[...perfil.posiciones]
                .sort((a, b) => b.partidos - a.partidos)
                .map((p) => (
                  <StatRow key={p.posicion} label={p.posicion} value={p.partidos} />
                ))}
            </StatBox>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <StatBox title="Puntos">
            <StatRow label="Puntos" value={perfil.puntos} badge={perfil.badgePuntos} />
            <StatRow label="Tries" value={perfil.tries} badge={perfil.badgeTries} />
            {perfil.conversiones > 0 && <StatRow label="Conversiones" value={perfil.conversiones} />}
            {perfil.penales > 0 && <StatRow label="Penales" value={perfil.penales} />}
            {perfil.drops > 0 && <StatRow label="Drops" value={perfil.drops} />}
          </StatBox>

          <StatBox title="Tarjetas">
            <StatRow icon={<TarjetaIcon tipo="AMARILLA" />} label="Amarillas" value={perfil.tarjetasAmarillas} />
            <StatRow icon={<TarjetaIcon tipo="ROJA" />} label="Rojas" value={perfil.tarjetasRojas} />
          </StatBox>
        </div>
      </div>
      {perfil.partidosComoCapitan > 0 && (
        <p className="mt-2 text-xs text-navy/50">
          * El dato de capitanía es incompleto en las temporadas más viejas (ej. 2014), así que
          &quot;como capitán&quot; puede estar subestimado para jugadores de esa época.
        </p>
      )}

      <div className="mt-8">
        <SectionHeading>Temporadas</SectionHeading>
      </div>
      <div className="mt-3 overflow-x-auto">
        <TriesPorTemporada temporadas={perfil.triesPorTemporada} />
      </div>

      <div className="mt-8">
        <SectionHeading>Historial vs. rivales</SectionHeading>
      </div>
      <div className="mt-3 overflow-x-auto">
        <HistorialRivalesTable filas={perfil.historialVsRivales} />
      </div>
    </main>
  );
}
