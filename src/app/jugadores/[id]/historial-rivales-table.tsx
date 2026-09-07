"use client";

import { useState } from "react";
import type { FilaHistorialRival } from "@/lib/queries";
import { ClubLink } from "@/components/club-link";

const LIMITE_INICIAL = 10;

export function HistorialRivalesTable({ filas }: { filas: FilaHistorialRival[] }) {
  const [verTodo, setVerTodo] = useState(false);

  if (filas.length === 0) {
    return <p className="py-6 text-center text-navy/50">Sin partidos registrados.</p>;
  }

  const visibles = verTodo ? filas : filas.slice(0, LIMITE_INICIAL);
  const restantes = filas.length - LIMITE_INICIAL;

  return (
    <div>
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="bg-navy text-left text-white">
            <th className="py-2 pr-2 pl-3">Rival</th>
            <th className="py-2 pr-2 text-right">PJ</th>
            <th className="py-2 pr-2 text-right">G</th>
            <th className="py-2 pr-2 text-right">E</th>
            <th className="py-2 pr-2 text-right">P</th>
            <th className="py-2 pr-2 text-right">Tries</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((f) => (
            <tr key={f.club} className="border-b border-navy-light/60 odd:bg-navy-light">
              <td className="py-1.5 pr-2 pl-3 text-navy-dark">
                <ClubLink id={f.clubId}>{f.club}</ClubLink>
              </td>
              <td className="py-1.5 pr-2 text-right text-navy-dark">{f.partidosJugados}</td>
              <td className="py-1.5 pr-2 text-right text-navy-dark">{f.ganados}</td>
              <td className="py-1.5 pr-2 text-right text-navy-dark">{f.empatados}</td>
              <td className="py-1.5 pr-2 text-right text-navy-dark">{f.perdidos}</td>
              <td className="py-1.5 pr-2 text-right text-navy-dark">{f.tries}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {restantes > 0 && (
        <button
          type="button"
          onClick={() => setVerTodo((v) => !v)}
          className="mt-3 w-full rounded-md border border-navy-light py-2 text-sm text-navy hover:bg-orange-light"
        >
          {verTodo ? "Ver menos" : `Ver todo (${restantes} más)`}
        </button>
      )}
    </div>
  );
}
