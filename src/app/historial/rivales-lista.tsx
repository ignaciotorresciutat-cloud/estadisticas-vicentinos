"use client";

import { useState } from "react";
import Link from "next/link";
import type { FilaHistorialGeneral, ResumenClub } from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";

const SORT_DEFS = [
  { key: "pj", label: "Más cruces" },
  { key: "best", label: "Mejor balance" },
  { key: "worst", label: "Peor balance" },
] as const;
type OrdenKey = (typeof SORT_DEFS)[number]["key"];

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hrefDe(orden: OrdenKey): string {
  return orden === "pj" ? "/historial" : `/historial?orden=${orden}`;
}

function pctColor(pct: number): string {
  return pct >= 60 ? "#003868" : pct >= 40 ? "#46658a" : "#9c2b1f";
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" className="flex-none" aria-hidden>
      <circle cx="7" cy="7" r="5.4" stroke="#46658a" strokeWidth="1.8" />
      <path d="M11.2 11.2L15.4 15.4" stroke="#46658a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function RivalesLista({
  club,
  filas,
  orden,
  eyebrow,
}: {
  club: ResumenClub;
  filas: FilaHistorialGeneral[];
  orden: OrdenKey;
  eyebrow: string;
}) {
  const [query, setQuery] = useState("");

  const filtradas = filas.filter((f) => !query || normalizar(f.club).includes(normalizar(query)));

  const buscador = (
    <div className="flex min-h-[46px] items-center gap-2.5 rounded-[11px] bg-white px-3.5 lg:min-h-11 lg:w-[290px] lg:flex-none lg:rounded-[10px] lg:border lg:border-navy/[.16]">
      <SearchIcon />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar un club"
        className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-navy-dark outline-none lg:text-[14.5px]"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy-light"
          aria-label="Limpiar búsqueda"
        >
          <svg width="10" height="10" viewBox="0 0 17 17" fill="none">
            <path d="M2 2l13 13M15 2L2 15" stroke="#46658a" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );

  const sinResultados = (
    <div className="py-11 text-center">
      <div className="text-lg font-bold text-navy-dark lg:text-[18px]">
        {query ? `Ningún club con "${query}"` : "Ningún club coincide"}
      </div>
      <p className="mt-2 text-[13px] text-ink lg:text-[14.5px]">Probá con parte del nombre.</p>
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="mt-3.5 inline-flex min-h-[42px] items-center rounded-[10px] bg-navy px-[18px] font-mono text-[11px] font-semibold tracking-[.08em] text-orange uppercase"
        >
          Ver todos
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* mobile: hero navy con header propio + buscador */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-6">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
          />
          <p className="mt-5 font-mono text-[10px] font-semibold tracking-[.14em] text-orange uppercase">{eyebrow}</p>
          <h1 className="mt-[9px] text-balance text-[26px] leading-[1.08] font-extrabold tracking-[-.03em] text-white">
            A quién enfrentamos y cómo nos fue
          </h1>
          <div className="mt-4">{buscador}</div>
        </div>
      </section>

      {/* mobile: orden + lista, en blanco */}
      <div className="px-5 pt-3.5 pb-9 lg:hidden">
        <div className="flex min-h-10 overflow-hidden rounded-full" style={{ background: "rgba(0,56,104,.14)", gap: 1 }}>
          {SORT_DEFS.map((s) => (
            <Link
              key={s.key}
              href={hrefDe(s.key)}
              className="flex flex-1 items-center justify-center px-1 font-mono text-[9.5px] font-semibold tracking-[.05em] uppercase"
              style={{ background: orden === s.key ? "#003868" : "#fff", color: orden === s.key ? "#fff" : "#46658a" }}
            >
              {s.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-col">
          {filtradas.map((f) => (
            <Link
              key={f.clubId}
              href={`/historial/${f.clubId}`}
              className="border-b border-navy/[.09] py-[13px]"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold text-navy-dark">{f.club}</div>
                  <div className="mt-1 truncate font-mono text-[10px] tracking-[.04em] text-ink">
                    {f.total.j} {f.total.j === 1 ? "partido" : "partidos"} · {f.total.g}—{f.total.e}—{f.total.p} · hasta {f.ultimaTemporada}
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div
                    className="text-[17px] font-extrabold tracking-[-.02em] tabular-nums"
                    style={{ color: pctColor(Math.round((f.total.g / f.total.j) * 100)) }}
                  >
                    {Math.round((f.total.g / f.total.j) * 100)}%
                  </div>
                  <div className="mt-0.5 font-mono text-[8px] tracking-[.09em] text-ink uppercase">Ganados</div>
                </div>
              </div>
              <div className="mt-2.5 flex h-[5px] gap-0.5">
                <div className="rounded-[2px]" style={{ width: `${(f.total.g / f.total.j) * 100}%`, background: "#003868" }} />
                <div className="rounded-[2px]" style={{ width: `${(f.total.e / f.total.j) * 100}%`, background: "#c3d0dd" }} />
                <div className="rounded-[2px]" style={{ width: `${(f.total.p / f.total.j) * 100}%`, background: "#9c2b1f" }} />
              </div>
            </Link>
          ))}
        </div>

        {filtradas.length === 0 && sinResultados}
      </div>

      {/* desktop: todo sobre fondo blanco */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-12 pb-20 lg:block">
        <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange-dark uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-[44px] font-extrabold tracking-[-.03em] text-navy-dark">Contra quiénes jugamos</h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {buscador}
          <div className="flex flex-wrap gap-2">
            {SORT_DEFS.map((s) => (
              <Link
                key={s.key}
                href={hrefDe(s.key)}
                className="flex min-h-11 items-center rounded-full border px-4 font-mono text-xs font-semibold tracking-[.04em]"
                style={{
                  borderColor: orden === s.key ? "#003868" : "rgba(0,56,104,.16)",
                  background: orden === s.key ? "#003868" : "#fff",
                  color: orden === s.key ? "#fff" : "#003868",
                }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[14px] border border-navy/[.13]">
          <div
            className="grid items-center gap-4 px-5 py-3"
            style={{ gridTemplateColumns: "minmax(0,1fr) 210px 96px 78px 74px", background: "rgba(0,56,104,.05)" }}
          >
            <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Club</div>
            <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Balance</div>
            <div className="font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Récord</div>
            <div className="text-right font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">Cruces</div>
            <div className="text-right font-mono text-[9.5px] font-semibold tracking-[.12em] text-ink uppercase">% ganados</div>
          </div>

          {filtradas.map((f) => {
            const pct = Math.round((f.total.g / f.total.j) * 100);
            return (
              <Link
                key={f.clubId}
                href={`/historial/${f.clubId}`}
                className="grid items-center gap-4 border-t border-navy/[.09] px-5 py-3.5"
                style={{ gridTemplateColumns: "minmax(0,1fr) 210px 96px 78px 74px" }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-navy-dark">{f.club}</div>
                  <div className="mt-1 font-mono text-[10.5px] text-ink">Último cruce · {f.ultimaTemporada}</div>
                </div>
                <div className="flex h-[9px] overflow-hidden rounded-full bg-navy-light">
                  <div style={{ width: `${(f.total.g / f.total.j) * 100}%`, background: "#003868" }} />
                  <div style={{ width: `${(f.total.e / f.total.j) * 100}%`, background: "#c3d0dd" }} />
                  <div style={{ width: `${(f.total.p / f.total.j) * 100}%`, background: "#9c2b1f" }} />
                </div>
                <div className="font-mono text-[13px] text-ink tabular-nums">
                  {f.total.g}—{f.total.e}—{f.total.p}
                </div>
                <div className="text-right font-mono text-[15px] font-semibold text-navy tabular-nums">{f.total.j}</div>
                <div className="text-right font-mono text-[15px] font-semibold tabular-nums" style={{ color: pctColor(pct) }}>
                  {pct}%
                </div>
              </Link>
            );
          })}
        </div>

        {filtradas.length === 0 && sinResultados}
      </div>
    </>
  );
}
