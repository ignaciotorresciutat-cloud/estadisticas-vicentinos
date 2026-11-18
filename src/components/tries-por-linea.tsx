import Link from "next/link";
import type { TriesPorLinea } from "@/lib/queries";

// barras de tries por línea de juego, en el orden de la cancha (de adelante
// hacia atrás), con los principales anotadores de cada línea
export function TriesPorLineaBloque({ datos, titulo = "Tries por posición" }: { datos: TriesPorLinea; titulo?: string }) {
  const total = datos.lineas.reduce((a, l) => a + l.tries, 0);
  if (total === 0) return null;
  const max = Math.max(...datos.lineas.map((l) => l.tries));
  const aparte = [
    datos.especiales ? `${datos.especiales} ${datos.especiales === 1 ? "try penal o de scrum" : "tries penales o de scrum"}` : null,
    datos.sinPuesto ? `${datos.sinPuesto} sin puesto registrado` : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark">{titulo}</h2>
        <span className="font-mono text-[10px] tracking-[.1em] text-ink uppercase">{total} tries</span>
      </div>
      <div className="mt-3.5 flex flex-col gap-3">
        {datos.lineas.map((l) => {
          const lider = l.tries === max && max > 0;
          return (
            <div key={l.linea}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-semibold text-navy-dark">{l.linea}</span>
                <span className="font-mono text-[13.5px] font-semibold text-navy-dark tabular-nums">
                  {l.tries}
                  <span className="ml-1.5 text-[10.5px] font-normal text-ink">{Math.round((l.tries / total) * 100)}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: "#e6edf3" }}>
                <div className="h-full rounded-full" style={{ width: `${(l.tries / max) * 100}%`, background: lider ? "#f89c38" : "#003868" }} />
              </div>
              {l.anotadores.length > 0 && (
                <div className="mt-1.5 truncate text-[11.5px] leading-[1.4] text-ink">
                  {l.anotadores.slice(0, 3).map((a, i) => (
                    <span key={a.jugadorId}>
                      {i > 0 && " · "}
                      <Link href={`/jugadores/${a.jugadorId}`} className="hover:text-navy-dark hover:underline">
                        {a.nombre}
                      </Link>{" "}
                      {a.tries}
                    </span>
                  ))}
                  {l.anotadores.length > 3 && ` · y ${l.anotadores.length - 3} más`}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 font-mono text-[10px] leading-[1.6]" style={{ color: "rgba(0,56,104,.5)" }}>
        Según la camiseta de cada partido: el que entró desde el banco suma en el puesto del que reemplazó.
        {aparte.length > 0 && ` Aparte: ${aparte.join(", ")}.`}
      </p>
    </div>
  );
}
