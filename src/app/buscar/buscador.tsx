"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  FilaJugadorCompleta,
  FilaHistorialGeneral,
  FilaCamadaCompleta,
  InfoTemporada,
  ResumenTemporada,
} from "@/lib/queries";
import { formatNumero } from "@/lib/format";
import { useVolver } from "@/lib/use-volver";

type TemporadaFila = { año: number; info: InfoTemporada; resumen: ResumenTemporada | null };

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function rank(text: string, qn: string): number {
  const t = normalizar(text);
  if (t.startsWith(qn)) return 0;
  if (t.split(/[\s.·—-]+/).some((w) => w.startsWith(qn))) return 1;
  return t.includes(qn) ? 2 : -1;
}

type Resultado = { score: number; weight: number; name: string; meta: string; tag: string; href: string };

function collect<T>(list: T[], fn: (item: T) => Omit<Resultado, "score" | "weight"> & { score: number; weight: number } | null): Resultado[] {
  return list
    .map(fn)
    .filter((r): r is Resultado => r !== null && r.score >= 0)
    .sort((a, b) => a.score - b.score || b.weight - a.weight);
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none" className="flex-none" aria-hidden>
      <circle cx="7" cy="7" r="5.4" stroke="#46658a" strokeWidth="1.8" />
      <path d="M11.2 11.2L15.4 15.4" stroke="#46658a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 17 17" fill="none">
      <path d="M2 2l13 13M15 2L2 15" stroke="#46658a" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="rgba(0,56,104,.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="9" height="15" viewBox="0 0 9 15" fill="none" aria-hidden style={{ display: "block" }}>
      <path d="M7.5 1.5L2 7.5l5.5 6" stroke="#f89c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResultRow({ r, size }: { r: Resultado; size: "sm" | "lg" }) {
  return (
    <Link
      href={r.href}
      className={`flex items-center border-b border-navy/[.09] ${size === "sm" ? "gap-3 py-[13px] min-h-11" : "gap-3.5 py-[14px]"}`}
    >
      <div className="min-w-0 flex-1">
        <div className={`truncate font-semibold ${size === "sm" ? "text-[15px]" : "text-[16px]"}`}>{r.name}</div>
        <div className={`mt-1 truncate font-mono text-ink ${size === "sm" ? "text-[10px] tracking-[.05em]" : "text-[11px]"}`}>{r.meta}</div>
      </div>
      {r.tag && (
        <div
          className="flex flex-none items-center rounded font-mono font-semibold tracking-[.07em] text-orange"
          style={{ background: "#003868", minHeight: size === "sm" ? 20 : 22, padding: "0 9px", fontSize: size === "sm" ? 9 : 9.5 }}
        >
          {r.tag}
        </div>
      )}
      <Chevron />
    </Link>
  );
}

export function Buscador({
  jugadores,
  rivales,
  temporadas,
  camadas,
  initialQuery = "",
}: {
  jugadores: FilaJugadorCompleta[];
  rivales: FilaHistorialGeneral[];
  temporadas: TemporadaFila[];
  camadas: FilaCamadaCompleta[];
  initialQuery?: string;
}) {
  const [sq, setSq] = useState(initialQuery);
  const qn = normalizar(sq.trim());
  const idle = qn.length < 2;
  const { onClick: onClickVolver } = useVolver("/", "ARCHIVO", "VOLVER");

  const camadasOrdenadas = useMemo(() => [...camadas].sort((a, b) => b.presencias - a.presencias), [camadas]);

  const { groups, total } = useMemo(() => {
    if (idle) return { groups: [] as { title: string; count: string; items: Resultado[] }[], total: 0 };

    const sJugadores = collect(jugadores, (j) => {
      const score = rank(j.nombre, qn);
      const span = j.primeraTemporada === j.ultimaTemporada ? String(j.primeraTemporada) : `${j.primeraTemporada}—${j.ultimaTemporada}`;
      return {
        score,
        weight: j.partidosJugados,
        name: j.nombre,
        meta: `${span} · ${j.partidosJugados} partidos · ${j.tries} tries`,
        tag: j.titulos > 0 ? (j.titulos === 1 ? "CAMPEÓN" : `${j.titulos} TÍTULOS`) : "",
        href: `/jugadores/${j.id}`,
      };
    });

    const sRivales = collect(rivales, (c) => ({
      score: rank(c.club, qn),
      weight: c.total.j,
      name: c.club,
      meta: `${c.total.j} cruces · ${c.total.g}G ${c.total.e}E ${c.total.p}P · último ${c.ultimaTemporada}`,
      tag: "",
      href: `/historial/${c.clubId}`,
    }));

    const sTemporadas = collect(temporadas, (t) => {
      const candidatos = [rank(String(t.año), qn), rank(t.info.torneo ?? "", qn)].filter((r) => r >= 0);
      const score = candidatos.length > 0 ? Math.min(...candidatos) : -1;
      return {
        score,
        weight: t.año,
        name: `${t.año}${t.info.torneo ? ` · ${t.info.torneo}` : ""}`,
        meta: t.resumen
          ? `${t.info.torneo ?? "Torneo sin dato"} · ${t.resumen.ganados}G ${t.resumen.empatados}E ${t.resumen.perdidos}P · ${t.resumen.tries} tries`
          : "Sin torneo disputado",
        tag: t.info.campeon ? "CAMPEÓN" : t.info.ascenso ? "ASCENSO" : "",
        href: `/temporadas/${t.año}`,
      };
    });

    const sCamadas = collect(camadasOrdenadas, (g) => {
      const candidatos = [rank(String(g.camada), qn), rank(`camada ${g.camada}`, qn)].filter((r) => r >= 0);
      const score = candidatos.length > 0 ? Math.min(...candidatos) : -1;
      const pos = camadasOrdenadas.findIndex((c) => c.camada === g.camada) + 1;
      return {
        score,
        weight: g.presencias,
        name: `Camada ${g.camada}`,
        meta: `${g.jugadoresConCaps} ${g.jugadoresConCaps === 1 ? "jugador" : "jugadores"} · ${g.presencias} partidos · ${g.tries} tries`,
        tag: pos === 1 ? "#1" : "",
        href: `/camadas/${g.camada}`,
      };
    });

    const raw = [
      { title: "Jugadores", items: sJugadores },
      { title: "Rivales", items: sRivales },
      { title: "Temporadas", items: sTemporadas },
      { title: "Camadas", items: sCamadas },
    ];
    const total = raw.reduce((a, g) => a + g.items.length, 0);
    const groups = raw
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        title: g.title,
        count: `${g.items.length} ${g.items.length === 1 ? "resultado" : "resultados"}`,
        items: g.items.slice(0, 8),
      }));
    return { groups, total };
  }, [idle, qn, jugadores, rivales, temporadas, camadasOrdenadas]);

  const empty = !idle && total === 0;
  const searchCount = total === 1 ? "1 resultado" : `${formatNumero(total)} resultados`;

  const hints = useMemo(() => {
    const topJugador = [...jugadores].sort((a, b) => b.partidosJugados - a.partidosJugados)[0];
    const topRival = [...rivales].sort((a, b) => b.total.j - a.total.j)[0];
    const topCamada = camadasOrdenadas[0];
    const campeonReciente = [...temporadas].find((t) => t.info.campeon);
    const list = [
      topJugador?.nombre,
      topRival?.club,
      campeonReciente ? String(campeonReciente.año) : temporadas[0] ? String(temporadas[0].año) : null,
      topCamada ? `Camada ${topCamada.camada}` : null,
    ].filter((x): x is string => !!x);
    return list;
  }, [jugadores, rivales, temporadas, camadasOrdenadas]);

  return (
    <>
      {/* mobile: header sticky con buscador */}
      <div className="sticky top-0 z-10 bg-navy px-5 pt-6 pb-[22px] lg:hidden">
        <div className="flex min-h-11 items-center gap-3">
          <Link href="/" aria-label="Volver" onClick={onClickVolver} className="flex h-11 w-8 flex-none items-center">
            <BackIcon />
          </Link>
          <div className="flex min-h-[46px] min-w-0 flex-1 items-center gap-2.5 rounded-[10px] bg-white px-3.5">
            <SearchIcon />
            <input
              value={sq}
              onChange={(e) => setSq(e.target.value)}
              placeholder="Jugador, rival o año"
              className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-navy-dark outline-none"
              autoFocus
            />
            {sq && (
              <button
                type="button"
                onClick={() => setSq("")}
                aria-label="Limpiar búsqueda"
                className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full"
                style={{ background: "#e6edf3" }}
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>
        {!idle && (
          <div className="mt-[13px] font-mono text-[9.5px] tracking-[.09em] uppercase" style={{ color: "rgba(255,255,255,.6)" }}>
            {searchCount}
          </div>
        )}
      </div>

      {idle && (
        <>
          <div className="px-5 pt-[26px] lg:hidden">
            <div className="text-[15px] font-bold text-navy">Buscá en todo el archivo</div>
            <p className="mt-2 text-pretty text-[13.5px] leading-[1.5] text-ink">
              Apellidos, clubes rivales, años de temporada o de camada. Alcanzan dos letras.
            </p>
          </div>
          <div className="px-5 pt-5 lg:hidden">
            <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Probá con</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {hints.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSq(h)}
                  className="flex min-h-9 items-center rounded-full px-[13px] font-mono text-[11px] text-navy"
                  style={{ border: "1px solid rgba(0,56,104,.18)" }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {!idle && (
        <div className="lg:hidden">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="flex items-baseline justify-between gap-2.5 px-5 pt-6">
                <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">{g.title}</div>
                <div className="flex-none font-mono text-[9px] tracking-[.1em] text-ink uppercase">{g.count}</div>
              </div>
              <div className="flex flex-col px-5 pt-2">
                {g.items.map((r) => (
                  <ResultRow key={r.href} r={r} size="sm" />
                ))}
              </div>
            </div>
          ))}
          {empty && (
            <div className="px-5 pt-9 text-center">
              <div className="text-[16px] font-bold text-navy">Nada para &ldquo;{sq}&rdquo;</div>
              <p className="mt-2 text-[13px] leading-[1.5] text-ink">Probá con el apellido solo, con el nombre del club, o con un año.</p>
              <button
                type="button"
                onClick={() => setSq("")}
                className="mt-3.5 inline-flex min-h-[42px] items-center rounded-[10px] bg-navy px-[18px] font-mono text-[11px] font-semibold tracking-[.08em] text-orange uppercase"
              >
                Empezar de nuevo
              </button>
            </div>
          )}
        </div>
      )}

      <div className="px-5 pt-7 pb-10 lg:hidden">
        <div className="font-mono text-[9.5px] leading-[1.6] tracking-[.04em]" style={{ color: "rgba(0,56,104,.45)" }}>
          Busca sin acentos y sin distinguir mayúsculas, en {formatNumero(jugadores.length)} fichas, {formatNumero(rivales.length)} rivales y{" "}
          {formatNumero(temporadas.length)} temporadas.
        </div>
      </div>

      {/* desktop */}
      <div className="mx-auto hidden px-10 pt-14 pb-20 lg:block" style={{ maxWidth: 860 }}>
        <h1 className="text-[40px] font-extrabold tracking-[-.03em]">Buscá en todo el archivo</h1>
        <p className="mt-3 text-[15.5px] leading-[1.55] text-ink">
          Apellidos, clubes rivales, años de temporada o de camada. Alcanzan dos letras.
        </p>

        <div
          className="mt-6 flex min-h-14 items-center gap-3 rounded-xl px-[18px]"
          style={{ border: "1px solid rgba(0,56,104,.18)" }}
        >
          <SearchIcon size={18} />
          <input
            value={sq}
            onChange={(e) => setSq(e.target.value)}
            placeholder="Jugador, rival o año"
            className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-navy-dark outline-none"
            autoFocus
          />
          {sq && (
            <button
              type="button"
              onClick={() => setSq("")}
              aria-label="Limpiar búsqueda"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full"
              style={{ background: "#e6edf3" }}
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {idle && (
          <div className="mt-[22px]">
            <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">Probá con</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {hints.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSq(h)}
                  className="flex min-h-[38px] items-center rounded-full px-[15px] font-mono text-[12px] text-navy"
                  style={{ border: "1px solid rgba(0,56,104,.18)" }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {!idle && (
          <div className="mt-[18px] font-mono text-[10px] tracking-[.11em] text-ink uppercase">{searchCount}</div>
        )}

        {groups.map((g) => (
          <div key={g.title} className="mt-7">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">{g.title}</div>
              <div className="font-mono text-[9.5px] tracking-[.1em] text-ink uppercase">{g.count}</div>
            </div>
            <div className="mt-2 flex flex-col">
              {g.items.map((r) => (
                <ResultRow key={r.href} r={r} size="lg" />
              ))}
            </div>
          </div>
        ))}

        {empty && (
          <div className="pt-10">
            <div className="text-[19px] font-bold">Nada para &ldquo;{sq}&rdquo;</div>
            <p className="mt-2 text-[14.5px] leading-[1.5] text-ink">Probá con el apellido solo, con el nombre del club, o con un año.</p>
          </div>
        )}
      </div>
    </>
  );
}
