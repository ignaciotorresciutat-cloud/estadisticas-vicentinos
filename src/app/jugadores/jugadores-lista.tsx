"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FilaJugadorCompleta, ResumenClub } from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { CopaIcon } from "@/components/copa-icon";
import { TarjetaIcon } from "@/components/tarjeta-icon";
import { AnioFiltroSelect } from "@/components/anio-filtro-select";
import { formatNumero } from "@/lib/format";

const SORT_DEFS = [
  { key: "titular", label: "Titular", unit: "Partidos como titular" },
  { key: "suplente", label: "Suplente", unit: "Partidos como suplente" },
  { key: "total", label: "Total", unit: "Partidos jugados" },
  { key: "tries", label: "Tries", unit: "Tries convertidos" },
  { key: "points", label: "Puntos", unit: "Puntos anotados" },
] as const;
type OrdenKey = (typeof SORT_DEFS)[number]["key"];

function valorDe(f: FilaJugadorCompleta, orden: OrdenKey): number {
  if (orden === "titular") return f.titular;
  if (orden === "suplente") return f.suplente;
  if (orden === "tries") return f.tries;
  if (orden === "points") return f.puntos;
  return f.partidosJugados;
}

function Chevron({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" className="flex-none" aria-hidden>
      <circle cx="7" cy="7" r="5.4" stroke="#46658a" strokeWidth="1.8" />
      <path d="M11.2 11.2L15.4 15.4" stroke="#46658a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// pill del orden en mobile: mismo truco de <select> nativo superpuesto que
// el filtro de año, para que los dos queden como un par de dropdowns.
function OrdenFiltroSelect({
  orden,
  hrefDeOrden,
}: {
  orden: OrdenKey;
  hrefDeOrden: (orden: OrdenKey) => string;
}) {
  const router = useRouter();
  const label = SORT_DEFS.find((s) => s.key === orden)?.label ?? SORT_DEFS[0].label;
  return (
    <div
      className="relative flex min-h-10 flex-1 items-center justify-between gap-2 rounded-full px-3.5"
      style={{ border: "1px solid rgba(0,56,104,.18)" }}
    >
      <span className="font-mono text-[11.5px] font-semibold tracking-[.03em] text-navy">Orden: {label}</span>
      <svg width="9" height="6" viewBox="0 0 11 7" fill="none" style={{ display: "block", flexShrink: 0 }} aria-hidden>
        <path d="M1 1l4.5 4.5L10 1" stroke="#8a5a12" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={orden}
        onChange={(e) => router.push(hrefDeOrden(e.target.value as OrdenKey))}
        aria-label="Ordenar por"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {SORT_DEFS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hrefDe(anio: number | null, orden: OrdenKey): string {
  const params = new URLSearchParams();
  if (anio) params.set("anio", String(anio));
  if (orden !== "total") params.set("orden", orden);
  const qs = params.toString();
  return qs ? `/jugadores?${qs}` : "/jugadores";
}

function metaDeFila(f: FilaJugadorCompleta, anio: number | null, orden: OrdenKey): string {
  const camada = f.camada ? `Camada ${f.camada}` : "";
  if (!anio) {
    const span =
      f.primeraTemporada == null
        ? "—"
        : f.primeraTemporada === f.ultimaTemporada
          ? String(f.primeraTemporada)
          : `${f.primeraTemporada}—${f.ultimaTemporada}`;
    return [span, camada].filter(Boolean).join(" · ");
  }
  const partidos =
    orden === "titular"
      ? `${f.titular} de titular`
      : orden === "suplente"
        ? `${f.suplente} de suplente`
        : `${f.partidosJugados} ${f.partidosJugados === 1 ? "partido" : "partidos"}`;
  return [partidos, camada].filter(Boolean).join(" · ");
}

function Copas({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="flex flex-none items-center gap-[3px]">
      {Array.from({ length: n }).map((_, k) => (
        <CopaIcon key={k} color="#f89c38" />
      ))}
    </span>
  );
}

export function JugadoresLista({
  club,
  filas,
  anios,
  anio,
  orden,
  eyebrow,
  titulo,
}: {
  club: ResumenClub;
  filas: FilaJugadorCompleta[];
  anios: number[];
  anio: number | null;
  orden: OrdenKey;
  eyebrow: string;
  titulo: string;
}) {
  const [query, setQuery] = useState("");

  const filtradas = filas.filter((f) => !query || normalizar(f.nombre).includes(normalizar(query)));
  const sortUnit = (SORT_DEFS.find((s) => s.key === orden) ?? SORT_DEFS[0]).unit;
  const searchPlaceholder = anio ? `Buscar en ${anio}` : "Buscar por apellido";
  const listCount =
    !query && filtradas.length === filas.length
      ? anio
        ? `${filtradas.length} ${filtradas.length === 1 ? "jugador" : "jugadores"} en ${anio}`
        : "Índice completo"
      : `${filtradas.length} ${filtradas.length === 1 ? "ficha" : "fichas"}`;

  const notaFinal = `Una copa por título ganado. El orden responde a ${sortUnit.toLowerCase()}.`;

  const buscador = (
    <div className="flex min-h-[46px] items-center gap-2.5 rounded-[11px] bg-white px-3.5 lg:min-h-11 lg:w-[290px] lg:flex-none lg:rounded-[10px] lg:border lg:border-navy/[.16]">
      <SearchIcon />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
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
        {query ? `Sin fichas para "${query}"` : "Ninguna ficha coincide"}
      </div>
      <p className="mt-2 text-[13px] text-ink lg:text-[14.5px]">Probá con el apellido solo, o sacá el filtro de año.</p>
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
      {/* mobile: hero navy con header propio de la pantalla + buscador */}
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
            {titulo}
          </h1>
          <div className="mt-4">{buscador}</div>
        </div>
      </section>

      {/* mobile: filtros de año/orden + lista, en blanco */}
      <div className="px-5 pt-3.5 lg:hidden">
        <div className="flex items-center gap-2">
          <AnioFiltroSelect anios={anios} valor={anio} hrefDeAnio={(a) => hrefDe(a, orden)} />
          <OrdenFiltroSelect orden={orden} hrefDeOrden={(o) => hrefDe(anio, o)} />
        </div>

        <div className="mt-3.5 flex items-baseline justify-between gap-2.5">
          <span className="font-mono text-[9px] tracking-[.11em] text-orange-dark uppercase">{listCount}</span>
          <span className="flex-none font-mono text-[9px] tracking-[.1em] text-ink uppercase">{sortUnit}</span>
        </div>

        <div className="mt-0.5 flex flex-col">
          {filtradas.map((f, i) => (
            <Link
              key={f.id}
              href={`/jugadores/${f.id}`}
              className="flex min-h-11 items-center gap-3 border-b border-navy/[.09] py-[13px]"
            >
              <div className="w-5 flex-none font-mono text-[11px] text-navy/40 tabular-nums">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[7px]">
                  <span className="min-w-0 truncate text-[14.5px] font-semibold text-navy-dark">{f.nombre}</span>
                  <Copas n={f.titulos} />
                </div>
                <div className="mt-1 truncate font-mono text-[10px] text-ink">{metaDeFila(f, anio, orden)}</div>
              </div>
              <div className="min-w-[42px] flex-none text-right text-[17px] font-extrabold tracking-[-.02em] text-navy tabular-nums">
                {formatNumero(valorDe(f, orden))}
              </div>
              <Chevron className="flex-none" color="rgba(0,56,104,.35)" />
            </Link>
          ))}
        </div>

        {filtradas.length === 0 && sinResultados}

        <p className="mt-4 pb-2 font-mono text-[9.5px] leading-[1.6] tracking-[.04em]" style={{ color: "rgba(0,56,104,.45)" }}>
          {notaFinal}
        </p>
      </div>

      {/* mobile: entrada alternativa por camada */}
      <div className="mt-3 bg-navy px-5 pt-7 pb-11 lg:hidden">
        <p className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">Otra puerta</p>
        <p className="mt-2.5 text-[19px] font-extrabold tracking-[-.02em] text-white">Entrar por camada</p>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-white/72">
          Ver a los jugadores agrupados por año de nacimiento, generación por generación.
        </p>
        <Link
          href="/camadas"
          className="mt-[18px] flex min-h-12 items-center justify-center rounded-[10px] text-[14.5px] font-bold text-white"
          style={{ border: "1px solid rgba(255,255,255,.4)" }}
        >
          Ver camadas
        </Link>
      </div>

      {/* desktop: todo sobre fondo blanco */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-12 pb-20 lg:block">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange-dark uppercase">{eyebrow}</p>
            <h1 className="mt-3 text-[44px] font-extrabold tracking-[-.03em] text-navy-dark">{titulo}</h1>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {buscador}
          <div className="flex flex-wrap gap-2">
            {SORT_DEFS.map((s) => (
              <Link
                key={s.key}
                href={hrefDe(anio, s.key)}
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

        <div className="mt-3 flex flex-wrap gap-[7px]">
          <Link
            href={hrefDe(null, orden)}
            className="flex min-h-[34px] items-center rounded-full border px-3.5 font-mono text-[11.5px] font-semibold"
            style={{
              borderColor: !anio ? "#003868" : "rgba(0,56,104,.16)",
              background: !anio ? "#003868" : "#fff",
              color: !anio ? "#f89c38" : "#003868",
            }}
          >
            Todos
          </Link>
          {anios.map((a) => (
            <Link
              key={a}
              href={hrefDe(a, orden)}
              className="flex min-h-[34px] items-center rounded-full border px-3.5 font-mono text-[11.5px] font-semibold tabular-nums"
              style={{
                borderColor: anio === a ? "#003868" : "rgba(0,56,104,.16)",
                background: anio === a ? "#003868" : "#fff",
                color: anio === a ? "#f89c38" : "#003868",
              }}
            >
              {a}
            </Link>
          ))}
        </div>

        <div className="mt-5">
          <span className="font-mono text-xs tracking-[.08em] text-ink uppercase">{listCount}</span>
        </div>

        <div className="mt-3 overflow-hidden rounded-[14px] border border-navy/[.13]">
          <div
            className="grid items-center gap-[11px] px-5 py-3"
            style={{
              gridTemplateColumns: "42px minmax(150px,1fr) 84px 78px 74px 74px 68px 68px 86px",
              background: "rgba(0,56,104,.05)",
            }}
          >
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">#</div>
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Jugador</div>
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Camada</div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "titular" ? "#003868" : "#46658a" }}
            >
              Titular
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "suplente" ? "#003868" : "#46658a" }}
            >
              Suplente
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "total" ? "#003868" : "#46658a" }}
            >
              Total
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "tries" ? "#003868" : "#46658a" }}
            >
              Tries
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "points" ? "#003868" : "#46658a" }}
            >
              Puntos
            </div>
            <div className="text-right font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Tarjetas</div>
          </div>

          {filtradas.map((f, i) => (
            <Link
              key={f.id}
              href={`/jugadores/${f.id}`}
              className="grid items-center gap-[11px] border-t border-navy/[.09] px-5 py-3.5"
              style={{ gridTemplateColumns: "42px minmax(150px,1fr) 84px 78px 74px 74px 68px 68px 86px" }}
            >
              <div className="font-mono text-[12.5px] text-ink tabular-nums">{i + 1}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="truncate text-[15px] font-semibold text-navy-dark">{f.nombre}</span>
                  <Copas n={f.titulos} />
                  {f.activo && (
                    <span
                      className="flex flex-none items-center rounded font-mono text-[9px] font-semibold tracking-[.08em] text-navy uppercase"
                      style={{ background: "#e6edf3", minHeight: 19, padding: "0 7px" }}
                    >
                      Activo
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate font-mono text-[10.5px] text-ink">{metaDeFila(f, anio, orden)}</div>
              </div>
              <div className="font-mono text-[12.5px] text-ink tabular-nums">{f.camada ?? "—"}</div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "titular" ? 600 : 400, color: orden === "titular" ? "#003868" : "#46658a" }}
              >
                {f.titular}
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "suplente" ? 600 : 400, color: orden === "suplente" ? "#003868" : "#46658a" }}
              >
                {f.suplente}
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "total" ? 600 : 400, color: orden === "total" ? "#003868" : "#46658a" }}
              >
                {f.partidosJugados}
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "tries" ? 600 : 400, color: orden === "tries" ? "#003868" : "#46658a" }}
              >
                {f.tries}
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "points" ? 600 : 400, color: orden === "points" ? "#003868" : "#46658a" }}
              >
                {formatNumero(f.puntos)}
              </div>
              <div className="flex items-center justify-end gap-[7px]">
                {f.tarjetasAmarillas === 0 && f.tarjetasRojas === 0 ? (
                  <span className="font-mono text-[13px]" style={{ color: "rgba(0,56,104,.3)" }}>
                    —
                  </span>
                ) : (
                  <>
                    {f.tarjetasAmarillas > 0 && (
                      <span className="flex items-center gap-1">
                        <TarjetaIcon tipo="AMARILLA" width={9} height={13} />
                        <span className="font-mono text-[13.5px] text-ink tabular-nums">{f.tarjetasAmarillas}</span>
                      </span>
                    )}
                    {f.tarjetasRojas > 0 && (
                      <span className="flex items-center gap-1">
                        <TarjetaIcon tipo="ROJA" width={9} height={13} />
                        <span className="font-mono text-[13.5px] text-ink tabular-nums">{f.tarjetasRojas}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filtradas.length === 0 && sinResultados}

        <p className="mt-4 font-mono text-[10.5px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
          {notaFinal}
        </p>
      </div>
    </>
  );
}
