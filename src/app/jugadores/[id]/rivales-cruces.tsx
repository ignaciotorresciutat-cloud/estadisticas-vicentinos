"use client";

import { useState } from "react";
import Link from "next/link";
import { colorResultado, featShort, formatFechaCorta } from "./perfil-shared";

export type PartidoCruce = {
  year: number;
  fecha: Date;
  where: string;
  score: string;
  res: "w" | "d" | "l";
  feat: number;
  etapa: "Semifinal" | "Final" | null;
};

export type RivalCruce = {
  clubId: number;
  club: string;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  tries: number;
  partidos: PartidoCruce[];
};

const LIMITE_INICIAL = 6;

function resumenDe(r: RivalCruce): string {
  const partes = [
    `${r.ganados} ${r.ganados === 1 ? "ganado" : "ganados"}`,
    ...(r.empatados > 0 ? [`${r.empatados} ${r.empatados === 1 ? "empatado" : "empatados"}`] : []),
    `${r.perdidos} ${r.perdidos === 1 ? "perdido" : "perdidos"}`,
    `${r.tries} ${r.tries === 1 ? "try" : "tries"}`,
  ];
  return partes.join(" · ");
}

function Cells({ r, size }: { r: RivalCruce; size: "sm" | "lg" }) {
  const cells = [
    { value: r.partidosJugados, label: "Presencias", color: "#003868" },
    { value: r.ganados, label: "Ganados", color: "#003868" },
    { value: r.empatados, label: "Empatados", color: "#46658a" },
    { value: r.perdidos, label: "Perdidos", color: "#9c2b1f" },
  ];
  return (
    <div
      className="grid grid-cols-4 overflow-hidden rounded-[10px] border"
      style={{ gap: 1, background: "rgba(0,56,104,.12)", borderColor: "rgba(0,56,104,.12)" }}
    >
      {cells.map((c) => (
        <div key={c.label} className={`bg-white text-center ${size === "sm" ? "py-2.5 px-2" : "py-3.5 px-2.5"}`}>
          <div
            className={`font-mono leading-none tabular-nums ${size === "sm" ? "text-[16px] font-extrabold" : "text-[20px] font-semibold"}`}
            style={{ color: c.color }}
          >
            {c.value}
          </div>
          <div className="mt-[5px] font-mono text-[8px] tracking-[.08em] text-ink uppercase">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function Partidos({ r }: { r: RivalCruce }) {
  if (r.partidos.length === 0) {
    return (
      <div className="pt-3 font-mono text-[10.5px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
        Cruce por cruce contra {r.club} no disponible.
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-col">
      {r.partidos.map((g, i) => (
        <div key={i} className="flex items-center gap-2.5 border-t border-navy/[.06] py-[9px]">
          <div className="h-6 w-[5px] flex-none rounded-sm" style={{ background: colorResultado(g.res) }} />
          <div className="w-9 flex-none">
            {g.etapa ? (
              <span
                className="inline-flex h-5 items-center rounded bg-orange px-1 font-mono text-[8px] font-bold tracking-[.04em] text-navy-dark uppercase"
                title={g.etapa}
              >
                {g.etapa === "Semifinal" ? "Semi" : "Final"}
              </span>
            ) : (
              <span className="font-mono text-[11px] text-ink tabular-nums">{g.year}</span>
            )}
          </div>
          <div className="w-[54px] flex-none font-mono text-[9.5px] whitespace-nowrap tabular-nums" style={{ color: "rgba(0,56,104,.4)" }}>
            {formatFechaCorta(g.fecha)}
          </div>
          <div className="min-w-0 flex-1 truncate font-mono text-[10.5px] tracking-[.04em]" style={{ color: "rgba(0,56,104,.5)" }}>
            {g.where}
          </div>
          {g.feat > 0 && (
            <div
              className="flex-none rounded font-mono text-[9px] font-semibold tracking-[.06em] uppercase"
              style={{ background: "rgba(248,156,56,.16)", color: "#8a5a12", padding: "3px 8px" }}
            >
              {featShort(g.feat)}
            </div>
          )}
          <div className="flex-none font-mono text-[12px] font-semibold text-navy tabular-nums">{g.score}</div>
        </div>
      ))}
    </div>
  );
}

export function RivalesCruces({ filas, variant }: { filas: RivalCruce[]; variant: "mobile" | "desktop" }) {
  const [openClub, setOpenClub] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (filas.length === 0) return null;

  const visibles = showAll ? filas : filas.slice(0, LIMITE_INICIAL);
  const restantes = filas.length - LIMITE_INICIAL;

  const toggleBtn = restantes > 0 && (
    <button
      type="button"
      onClick={() => setShowAll((v) => !v)}
      className={
        variant === "mobile"
          ? "mt-4 flex min-h-11 w-full items-center justify-center rounded-[10px] font-mono text-[11px] font-semibold tracking-[.08em] text-navy uppercase"
          : "mt-4 inline-flex min-h-[42px] items-center rounded-[10px] px-[18px] font-mono text-[11px] font-semibold tracking-[.08em] text-navy uppercase"
      }
      style={{ border: "1px solid rgba(0,56,104,.18)" }}
    >
      {showAll ? "Ver menos rivales" : `Ver los ${filas.length} rivales`}
    </button>
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col">
        {visibles.map((r) => {
          const open = openClub === r.clubId;
          return (
            <div key={r.clubId} className="border-b border-navy/[.09]">
              <button
                type="button"
                onClick={() => setOpenClub((c) => (c === r.clubId ? null : r.clubId))}
                className={`flex w-full items-center gap-3 text-left ${variant === "mobile" ? "py-[13px]" : "py-[15px] gap-4"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className={variant === "mobile" ? "truncate text-[14.5px] font-semibold text-navy-dark" : "truncate text-[15.5px] font-semibold text-navy-dark"}>
                    {r.club}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10.5px] text-ink">{resumenDe(r)}</div>
                </div>
                <div className="flex-none text-right">
                  <div className={variant === "mobile" ? "text-[15px] font-bold text-navy tabular-nums" : "font-mono text-[18px] font-semibold text-navy tabular-nums"}>
                    {r.partidosJugados}
                  </div>
                  <div className="mt-[3px] font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">
                    {r.partidosJugados === 1 ? "Partido" : "Partidos"}
                  </div>
                </div>
                <svg
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                  className="flex-none"
                  style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}
                >
                  <path d="M1 1l5 5 5-5" stroke="#003868" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open && (
                <div className={variant === "mobile" ? "pb-4" : "pb-[22px]"}>
                  <Cells r={r} size={variant === "mobile" ? "sm" : "lg"} />
                  <Partidos r={r} />
                  <Link
                    href={`/historial/${r.clubId}`}
                    className={
                      variant === "mobile"
                        ? "mt-3 flex min-h-[38px] items-center justify-center rounded-[9px] font-mono text-[10px] font-semibold tracking-[.08em] text-navy uppercase"
                        : "mt-3.5 inline-flex min-h-10 items-center rounded-[9px] px-4 font-mono text-[10.5px] font-semibold tracking-[.08em] text-navy uppercase"
                    }
                    style={{ border: "1px solid rgba(0,56,104,.2)" }}
                  >
                    Historial del club vs {r.club}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {toggleBtn}
    </div>
  );
}
