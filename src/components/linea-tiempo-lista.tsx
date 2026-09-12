import Link from "next/link";
import type { InfoTemporada } from "@/lib/queries";

type FilaTemporada = { ganados: number; empatados: number; perdidos: number };

function Chevron({ color = "#003868" }: { color?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoCampeon() {
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" fill="none" style={{ display: "block" }}>
      <path d="M2 1h6v2.2A3 3 0 015 6.2a3 3 0 01-3-3V1z" stroke="#fff" strokeWidth="1.1" strokeLinejoin="round" />
      <path
        d="M2 1.6H.9v.9c0 1 .5 1.6 1.4 1.8M8 1.6h1.1v.9c0 1-.5 1.6-1.4 1.8"
        stroke="#fff"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M5 6.2V8M3.2 10h3.6" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function IconoAscenso() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" fill="none" style={{ display: "block" }}>
      <path d="M4.5 9V1.4M1.3 4.4L4.5 1l3.2 3.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoDescenso() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" fill="none" style={{ display: "block" }}>
      <path d="M4.5 1v7.6M1.3 5.6L4.5 9l3.2-3.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Badge({ tipo }: { tipo: "campeon" | "ascenso" | "descenso" }) {
  const bg = tipo === "descenso" ? "#9c2b1f" : "#003868";
  const label = { campeon: "Campeón", ascenso: "Ascenso", descenso: "Descenso" }[tipo];
  return (
    <div
      className="mt-2 inline-flex items-center gap-1.5 rounded-[5px] px-2.5 font-mono text-[9.5px] font-semibold tracking-[.09em] text-white uppercase"
      style={{ background: bg, minHeight: 23 }}
    >
      {tipo === "campeon" && <IconoCampeon />}
      {tipo === "ascenso" && <IconoAscenso />}
      {tipo === "descenso" && <IconoDescenso />}
      {label}
    </div>
  );
}

export function LineaDeTiempoLista({
  temporadasInfo,
  datosPorAño,
}: {
  temporadasInfo: Map<number, InfoTemporada>;
  datosPorAño: Map<number, FilaTemporada>;
}) {
  const años = [...temporadasInfo.keys()].sort((a, b) => b - a);
  const actual = Math.max(...años);

  return (
    <div>
      {años.map((año) => {
        const info = temporadasInfo.get(año)!;
        const datos = datosPorAño.get(año);
        const esActual = año === actual;
        const destacado = info.campeon || info.ascenso || info.descenso;

        return (
          <Link key={año} href={`/temporadas/${año}`} className="flex gap-3.5">
            <div className="w-[46px] flex-none pt-3.5 text-right">
              <div className="font-mono text-[13px] font-semibold text-navy tabular-nums">{año}</div>
            </div>
            <div className="flex w-[11px] flex-none flex-col items-center">
              {destacado ? (
                <div className="mt-4 h-[11px] w-[11px] flex-none rounded-full bg-orange" />
              ) : (
                <div className="mt-[18px] h-[7px] w-[7px] flex-none rounded-full" style={{ background: "rgba(0,56,104,.3)" }} />
              )}
              <div className="w-px flex-1" style={{ background: "rgba(0,56,104,.14)" }} />
            </div>
            <div className="min-w-0 flex-1 border-b py-3" style={{ borderColor: "rgba(0,56,104,.09)" }}>
              <div className="flex items-center justify-between gap-2.5">
                <div className="text-[14.5px] font-semibold text-navy-dark">
                  {info.torneo
                    ? `${info.torneo}${esActual ? " · en curso" : info.posicion ? ` · ${info.posicion}º` : ""}`
                    : "No se jugó"}
                </div>
                <div className="flex flex-none items-center gap-2.5">
                  <div className="font-mono text-[11px] text-ink tabular-nums">
                    {datos ? `${datos.ganados}—${datos.empatados}—${datos.perdidos}` : "—"}
                  </div>
                  <Chevron />
                </div>
              </div>
              {info.campeon && <Badge tipo="campeon" />}
              {!info.campeon && info.descenso && <Badge tipo="descenso" />}
              {!info.campeon && !info.descenso && info.ascenso && <Badge tipo="ascenso" />}
              {!info.torneo && info.nota && (
                <div className="mt-1.5 text-[12.5px] leading-[1.45]" style={{ color: "rgba(0,56,104,.5)" }}>
                  {info.nota}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
