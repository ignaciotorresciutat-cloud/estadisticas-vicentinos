"use client";

import Link from "next/link";
import { useState } from "react";
import type { FilaListaJugador } from "@/lib/queries";
import { PersonIcon } from "@/components/jugador-link";

export function BuscadorJugadores({ jugadores }: { jugadores: FilaListaJugador[] }) {
  const [query, setQuery] = useState("");

  const filtrados = jugadores.filter((j) =>
    j.nombre.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar jugador..."
        className="w-full rounded-md border border-navy-light px-3 py-2 text-sm text-navy-dark outline-none focus:border-navy"
      />
      <ul className="mt-4 divide-y divide-navy-light">
        {filtrados.map((j) => (
          <li key={j.id} className="odd:bg-navy-light">
            <Link href={`/jugadores/${j.id}`} className="block px-2 py-2.5 text-sm hover:bg-orange-light">
              {/* mobile: nombre + Ver perfil en una línea, caps/camada debajo */}
              <div className="flex items-center justify-between sm:hidden">
                <span className="flex items-center gap-1.5 text-navy-dark">
                  <PersonIcon />
                  {j.nombre}
                </span>
                <span className="shrink-0 text-xs font-medium text-navy">Ver perfil →</span>
              </div>
              <div className="mt-0.5 text-xs text-navy/60 sm:hidden">
                {j.totalCaps} caps{j.camada ? ` · camada ${j.camada}` : ""}
              </div>

              {/* desktop: una sola línea */}
              <div className="hidden items-center justify-between sm:flex">
                <span className="flex items-center gap-1.5 text-navy-dark">
                  <PersonIcon />
                  {j.nombre}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-navy/60">
                    {j.totalCaps} caps{j.camada ? ` · camada ${j.camada}` : ""}
                  </span>
                  <span className="text-xs font-medium text-navy">Ver perfil →</span>
                </span>
              </div>
            </Link>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="py-6 text-center text-navy/50">Sin resultados.</li>
        )}
      </ul>
    </div>
  );
}
