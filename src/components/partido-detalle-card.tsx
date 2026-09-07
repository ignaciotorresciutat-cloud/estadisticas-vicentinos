import type { PartidoDetalle } from "@/lib/queries";
import { JugadorLink } from "@/components/jugador-link";

function formatFecha(d: Date): string {
  return new Date(d).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const NOMBRE_TIPO_PUNTO: Record<string, string> = {
  TRY: "Tries",
  CONVERSION: "Conversiones",
  PENAL: "Penales",
  DROP: "Drops",
};

function InfoItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-navy/60">{label}</div>
      <div className="text-navy-dark">{value}</div>
    </div>
  );
}

export function PartidoDetalleCard({
  partido,
  numero,
  mostrarRival = true,
}: {
  partido: PartidoDetalle;
  numero: number;
  // en la pantalla de temporada interesa el rival (varía partido a partido);
  // en la pantalla de un rival puntual ya se sabe cuál es, así que ahí
  // conviene mostrar la temporada (lo que varía en esa lista) en su lugar.
  mostrarRival?: boolean;
}) {
  const gano = partido.resultadoPropio > partido.resultadoRival;
  const empato = partido.resultadoPropio === partido.resultadoRival;
  const colorResultado = gano ? "text-green-600" : empato ? "text-orange" : "text-red-600";

  const puntosPorTipo = new Map<string, { jugadorId: number; nombre: string; cantidad: number }[]>();
  for (const p of partido.puntos) {
    const lista = puntosPorTipo.get(p.tipo) ?? [];
    lista.push({ jugadorId: p.jugadorId, nombre: p.nombre, cantidad: p.cantidad });
    puntosPorTipo.set(p.tipo, lista);
  }

  return (
    <details className="group border-b border-navy-light odd:bg-navy-light">
      <summary className="cursor-pointer px-3 py-3 text-sm marker:content-none">
        <div className="flex items-baseline gap-2">
          <span className="inline-block text-orange transition-transform group-open:rotate-90">▸</span>
          {partido.etapa ? (
            <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {partido.etapa}
            </span>
          ) : (
            <span className="text-navy/50">#{numero}</span>
          )}
          <span className="text-base font-bold text-navy-dark">
            {mostrarRival ? partido.rival : `Temporada ${partido.temporada}`}
          </span>
        </div>
        <div className="mt-0.5 pl-[1.15rem] text-navy/60">
          <span className="capitalize">{formatFecha(partido.fecha)}</span>
          {" · "}
          {partido.condicion === "LOCAL" ? "Local" : "Visitante"}
          {" · "}
          <span className={`font-semibold ${colorResultado}`}>
            {partido.resultadoPropio} - {partido.resultadoRival}
          </span>
        </div>
      </summary>

      <div className="px-3 pb-4 sm:pl-8">
        <div className="grid grid-cols-2 gap-3 border-t border-navy-light pt-3 text-sm sm:grid-cols-4">
          <InfoItem label="Cancha" value={partido.cancha} />
          <InfoItem label="Clima" value={partido.clima} />
          <InfoItem label="Campo de juego" value={partido.campoDeJuego} />
          <InfoItem label="Referee" value={partido.referee} />
          {partido.fechaNota && <InfoItem label="Nota" value={partido.fechaNota} />}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold text-navy/70">Formación</h4>
            <ol className="mt-1 text-sm">
              {partido.titulares.map((t) => (
                <li key={t.jugadorId} className="flex gap-2 py-0.5">
                  <span className="w-5 text-navy/50">{t.numeroCamiseta}</span>
                  <JugadorLink id={t.jugadorId} className="text-navy-dark">
                    {t.nombre}
                  </JugadorLink>
                  {t.capitan && <span className="text-navy/50">(C)</span>}
                </li>
              ))}
              {partido.titulares.length === 0 && <li className="text-navy/50">Sin datos.</li>}
            </ol>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-navy/70">Cambios</h4>
            <ul className="mt-1 text-sm">
              {partido.suplentes.map((s) => (
                <li key={s.jugadorId} className="py-0.5 text-navy-dark">
                  <JugadorLink id={s.jugadorId}>{s.nombre}</JugadorLink>
                  {s.ingresoPor && (
                    <span className="text-navy/60">
                      {" "}
                      entró por{" "}
                      {s.ingresoPorId ? (
                        <JugadorLink id={s.ingresoPorId}>{s.ingresoPor}</JugadorLink>
                      ) : (
                        s.ingresoPor
                      )}
                    </span>
                  )}
                </li>
              ))}
              {partido.suplentes.length === 0 && <li className="text-navy/50">Sin cambios registrados.</li>}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold text-navy/70">Puntos</h4>
            {puntosPorTipo.size === 0 ? (
              <p className="mt-1 text-sm text-navy/50">Sin puntos registrados.</p>
            ) : (
              <ul className="mt-1 text-sm">
                {[...puntosPorTipo.entries()].map(([tipo, lista]) => (
                  <li key={tipo} className="py-0.5">
                    <span className="text-navy/60">{NOMBRE_TIPO_PUNTO[tipo] ?? tipo}: </span>
                    <span className="text-navy-dark">
                      {lista.map((l, i) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          <JugadorLink id={l.jugadorId}>{l.nombre}</JugadorLink>
                          {l.cantidad > 1 ? ` (x${l.cantidad})` : ""}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-navy/70">Tarjetas</h4>
            {partido.tarjetas.length === 0 ? (
              <p className="mt-1 text-sm text-navy/50">Sin tarjetas.</p>
            ) : (
              <ul className="mt-1 text-sm">
                {partido.tarjetas.map((t, i) => (
                  <li key={i} className="py-0.5 text-navy-dark">
                    {t.tipo === "AMARILLA" ? "Amarilla" : "Roja"}:{" "}
                    <JugadorLink id={t.jugadorId}>{t.nombre}</JugadorLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
