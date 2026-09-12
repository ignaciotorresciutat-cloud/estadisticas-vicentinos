"use client";

import { useState } from "react";
import Link from "next/link";
import type { Badge, FilaPartidoJugador } from "@/lib/queries";
import { resultadoDe, colorResultado, featShort, formatFechaCorta } from "./perfil-shared";

export type CareerRow = {
  temporada: number;
  torneo: string;
  presencias: number;
  tries: number;
  puntos: number;
  campeon: boolean;
  badges: Badge[];
  detalle: FilaPartidoJugador[];
};

const GRID_DESKTOP = "74px minmax(0,1fr) 82px 74px 74px 20px";

function Chevron({ open, size }: { open: boolean; size: "sm" | "lg" }) {
  const w = size === "sm" ? 11 : 12;
  const h = size === "sm" ? 7 : 8;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 12 8"
      fill="none"
      style={{ display: "block", flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M1 1l5 5 5-5" stroke="#003868" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" fill="none" className="flex-none">
      <path d="M2 1h6v2.2A3 3 0 015 6.2a3 3 0 01-3-3V1z" fill="#f89c38" />
      <path d="M2 1.6H.9v.9c0 1 .5 1.6 1.4 1.8M8 1.6h1.1v.9c0 1-.5 1.6-1.4 1.8" stroke="#8a5a12" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5 6.2V8M3.2 10h3.6" stroke="#8a5a12" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Badges({ badges, size }: { badges: Badge[]; size: "sm" | "lg" }) {
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((b, i) => (
        <span
          key={i}
          className={`inline-flex flex-none items-center rounded font-mono font-semibold tracking-[.06em] ${
            size === "sm" ? "h-5 px-2 text-[9px] uppercase" : "min-h-5 px-2 text-[9px]"
          }`}
          style={{
            background: b.destacado ? "#003868" : "#fff",
            border: `1px solid ${b.destacado ? "#003868" : "rgba(0,56,104,.35)"}`,
            color: b.destacado ? "#fff" : "#003868",
          }}
        >
          {b.texto}
        </span>
      ))}
    </>
  );
}

function Partidos({ temporada, detalle, size }: { temporada: number; detalle: FilaPartidoJugador[]; size: "sm" | "lg" }) {
  return (
    <div className={size === "sm" ? "py-0.5 pr-0 pb-4 pl-11" : "px-5 pb-5"}>
      {detalle.length > 0 ? (
        <div className="flex flex-col">
          {detalle.map((pm, i) => {
            const res = resultadoDe(pm.resultadoPropio, pm.resultadoRival);
            const feat = featShort(pm.tries);
            const titular = pm.rol === "TITULAR";
            return (
              <div key={i} className={`flex items-center border-t border-navy/[.06] ${size === "sm" ? "gap-[7px] py-[7px]" : "gap-2.5 py-[9px]"}`}>
                <div className={`flex-none rounded-sm ${size === "sm" ? "h-[22px] w-[5px]" : "h-6 w-[5px]"}`} style={{ background: colorResultado(res) }} />
                <div className={`flex-none ${size === "sm" ? "w-5" : "w-9"}`}>
                  {pm.etapa ? (
                    <span
                      className={`inline-flex items-center justify-center rounded bg-orange font-mono font-bold text-navy-dark ${
                        size === "sm" ? "h-[18px] w-[18px] text-[7px]" : "h-5 px-1 text-[8px] uppercase tracking-[.04em]"
                      }`}
                      title={pm.etapa}
                    >
                      {size === "sm" ? (pm.etapa === "Semifinal" ? "SF" : "F") : pm.etapa === "Semifinal" ? "Semi" : "Final"}
                    </span>
                  ) : (
                    <span
                      className={`font-mono tabular-nums ${size === "sm" ? "text-[10px]" : "text-[11px]"}`}
                      style={{ color: size === "sm" ? "rgba(0,56,104,.4)" : "#46658a" }}
                    >
                      {pm.numero}
                    </span>
                  )}
                </div>
                <div
                  className={`flex-none font-mono tabular-nums whitespace-nowrap ${size === "sm" ? "w-[42px] text-[8.5px]" : "w-[62px] text-[10.5px]"}`}
                  style={{ color: size === "sm" ? "rgba(0,56,104,.4)" : "#46658a" }}
                >
                  {formatFechaCorta(pm.fecha)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate font-semibold text-navy-dark ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}>{pm.rival}</div>
                  {feat && (
                    <div className="mt-[3px] font-mono text-[9px] font-semibold tracking-[.07em] text-orange-dark uppercase">{feat}</div>
                  )}
                </div>
                <div className={`flex-none font-mono tabular-nums text-ink ${size === "sm" ? "text-[11px]" : "text-[12.5px] font-semibold text-navy"}`}>
                  {pm.resultadoPropio}—{pm.resultadoRival}
                </div>
                <span
                  className={`inline-flex flex-none items-center justify-center rounded font-mono font-bold ${
                    size === "sm" ? "h-[16px] px-[5px] text-[7px]" : "h-5 px-[7px] text-[8.5px]"
                  }`}
                  style={{
                    background: titular ? "#003868" : "#fff",
                    border: `1px solid ${titular ? "#003868" : "rgba(0,56,104,.35)"}`,
                    color: titular ? "#fff" : "#46658a",
                  }}
                  title={titular ? "Titular" : "Suplente"}
                >
                  {titular ? "Tit" : "Sup"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pt-2 font-mono text-[10px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
          Partido por partido de {temporada} no cargado.
        </div>
      )}
      <Link
        href={`/temporadas/${temporada}`}
        className={`mt-3 flex items-center justify-center rounded-[9px] font-mono font-semibold tracking-[.08em] text-navy uppercase ${
          size === "sm" ? "min-h-[38px] text-[10px]" : "min-h-10 text-[10.5px]"
        }`}
        style={{ border: "1px solid rgba(0,56,104,.2)" }}
      >
        Ver temporada {temporada}
      </Link>
    </div>
  );
}

function Totales({ pj, tries, puntos, variant }: { pj: number; tries: number; puntos: number; variant: "mobile" | "desktop" }) {
  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-2.5 pt-3">
        <div className="min-w-0 flex-1 font-mono text-[9px] tracking-[.1em] text-orange-dark uppercase">Total</div>
        <div className="w-[30px] flex-none text-right font-mono text-[13px] font-semibold text-navy tabular-nums">{pj}</div>
        <div className="w-[26px] flex-none text-right font-mono text-[13px] font-semibold text-navy tabular-nums">{tries}</div>
        <div className="w-[34px] flex-none text-right font-mono text-[13px] font-semibold text-navy tabular-nums">{puntos}</div>
        <div className="w-[11px] flex-none" />
      </div>
    );
  }
  return (
    <div
      className="grid items-center gap-3.5 px-5 py-3.5"
      style={{ gridTemplateColumns: GRID_DESKTOP, borderTop: "2px solid rgba(0,56,104,.18)", background: "rgba(0,56,104,.04)" }}
    >
      <div className="font-mono text-[10px] tracking-[.12em] text-ink uppercase">Total</div>
      <div />
      <div className="text-right font-mono text-[15px] font-semibold text-navy tabular-nums">{pj}</div>
      <div className="text-right font-mono text-[15px] font-semibold text-navy tabular-nums">{tries}</div>
      <div className="text-right font-mono text-[15px] font-semibold text-navy tabular-nums">{puntos}</div>
      <div />
    </div>
  );
}

export function CareerAccordion({
  rows,
  variant,
  totales,
}: {
  rows: CareerRow[];
  variant: "mobile" | "desktop";
  totales: { pj: number; tries: number; puntos: number };
}) {
  const [openYear, setOpenYear] = useState<number | null>(null);
  const size: "sm" | "lg" = variant === "mobile" ? "sm" : "lg";

  if (variant === "mobile") {
    return (
      <div>
        <div className="flex items-center gap-2.5 border-b border-navy/[.13] pb-2">
          <div className="w-[34px] flex-none font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">Año</div>
          <div className="min-w-0 flex-1 font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">Torneo</div>
          <div className="w-[30px] flex-none text-right font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">PJ</div>
          <div className="w-[26px] flex-none text-right font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">T</div>
          <div className="w-[34px] flex-none text-right font-mono text-[8.5px] tracking-[.1em] text-ink uppercase">Pts</div>
          <div className="w-[11px] flex-none" />
        </div>
        {rows.map((r) => {
          const open = openYear === r.temporada;
          return (
            <div key={r.temporada} className="border-b border-navy/[.07]" style={{ background: r.campeon ? "rgba(248,156,56,.07)" : "transparent" }}>
              <button
                type="button"
                onClick={() => setOpenYear((y) => (y === r.temporada ? null : r.temporada))}
                className="flex w-full items-center gap-2.5 py-[11px] text-left"
              >
                <div className="w-[34px] flex-none font-mono text-[12px] font-semibold text-navy tabular-nums">{r.temporada}</div>
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-medium text-ink">{r.torneo}</span>
                  {r.campeon && <TrophyIcon />}
                </div>
                <div className="w-[30px] flex-none text-right font-mono text-[12px] tabular-nums">{r.presencias}</div>
                <div className="w-[26px] flex-none text-right font-mono text-[12px] font-semibold tabular-nums">{r.tries}</div>
                <div className="w-[34px] flex-none text-right font-mono text-[12px] text-ink tabular-nums">{r.puntos}</div>
                <div className="w-[11px] flex-none">
                  <Chevron open={open} size={size} />
                </div>
              </button>

              {r.badges.length > 0 && (
                <div className="flex flex-wrap gap-[5px] py-0 pr-0 pb-[11px] pl-11">
                  <Badges badges={r.badges} size={size} />
                </div>
              )}

              {open && <Partidos temporada={r.temporada} detalle={r.detalle} size={size} />}
            </div>
          );
        })}
        <Totales {...totales} variant="mobile" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ border: "1px solid rgba(0,56,104,.13)" }}>
      <div className="grid items-center gap-3.5 px-5 py-3" style={{ gridTemplateColumns: GRID_DESKTOP, background: "rgba(0,56,104,.05)" }}>
        <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Año</div>
        <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Torneo</div>
        <div className="text-right font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Partidos</div>
        <div className="text-right font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Tries</div>
        <div className="text-right font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Puntos</div>
        <div />
      </div>
      {rows.map((r) => {
        const open = openYear === r.temporada;
        return (
          <div key={r.temporada} style={{ borderTop: "1px solid rgba(0,56,104,.09)" }}>
            <button
              type="button"
              onClick={() => setOpenYear((y) => (y === r.temporada ? null : r.temporada))}
              className="grid w-full items-center gap-3.5 px-5 py-3.5 text-left"
              style={{ gridTemplateColumns: GRID_DESKTOP, background: r.campeon ? "rgba(248,156,56,.07)" : "transparent" }}
            >
              <div className="font-mono text-[14px] font-semibold text-navy tabular-nums">{r.temporada}</div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-[14.5px] font-semibold">{r.torneo}</span>
                <Badges badges={r.badges} size={size} />
              </div>
              <div className="text-right font-mono text-[15px] font-semibold text-navy tabular-nums">{r.presencias}</div>
              <div className="text-right font-mono text-[15px] text-ink tabular-nums">{r.tries}</div>
              <div className="text-right font-mono text-[15px] text-ink tabular-nums">{r.puntos}</div>
              <div className="flex justify-end">
                <Chevron open={open} size={size} />
              </div>
            </button>
            {open && <Partidos temporada={r.temporada} detalle={r.detalle} size={size} />}
          </div>
        );
      })}
      <Totales {...totales} variant="desktop" />
    </div>
  );
}
