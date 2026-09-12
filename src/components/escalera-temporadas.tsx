import Link from "next/link";
import type { InfoTemporada } from "@/lib/queries";
import { CopaIcon } from "./copa-icon";

const NIVEL_TORNEO: Record<string, number> = {
  "Grupo IV": 0,
  "Grupo III": 1,
  "Primera C": 2,
  "Primera B": 3,
};
const CATEGORIAS = ["Grupo IV", "Grupo III", "Primera C", "Primera B"];
const PASO = 68;
const ALTO_ESCALA = PASO * (CATEGORIAS.length - 1) + PASO; // 272

function MarcadorLogro({ info }: { info: InfoTemporada }) {
  if (info.campeon) {
    return (
      <div className="flex h-[23px] w-[23px] items-center justify-center rounded-full bg-orange">
        <CopaIcon color="#002140" />
      </div>
    );
  }
  if (info.ascenso) {
    return (
      <div className="flex h-[23px] w-[23px] items-center justify-center rounded-full bg-navy text-[13px] leading-none text-white">
        ↑
      </div>
    );
  }
  if (info.descenso) {
    return (
      <div className="flex h-[23px] w-[23px] items-center justify-center rounded-full bg-[#9c2b1f] text-[13px] leading-none text-white">
        ↓
      </div>
    );
  }
  return null;
}

export function EscaleraTemporadas({ temporadasInfo }: { temporadasInfo: Map<number, InfoTemporada> }) {
  const años = [...temporadasInfo.keys()].sort((a, b) => a - b);
  const actual = Math.max(...años);

  return (
    <div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `104px minmax(0,1fr)` }}
      >
        {/* eje izquierdo */}
        <div className="relative" style={{ height: ALTO_ESCALA + 30 }}>
          {CATEGORIAS.map((cat, nivel) => (
            <span
              key={cat}
              className="absolute right-0 font-mono text-[10px] tracking-[.1em] text-ink uppercase"
              style={{ bottom: nivel * PASO + 6 }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* área de trazado */}
        <div
          className="relative"
          style={{
            height: ALTO_ESCALA + 30,
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,56,104,.11) 0 1px, transparent 1px 68px)",
            backgroundPosition: "0 29px",
          }}
        >
          <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-[3px]">
            {años.map((año) => {
              const info = temporadasInfo.get(año)!;
              const esActual = año === actual;
              const nivel = info.torneo ? (NIVEL_TORNEO[info.torneo] ?? null) : null;

              if (nivel === null) {
                // 2020: sin torneo (pandemia)
                return (
                  <div
                    key={año}
                    className="flex h-full flex-1 flex-col items-center justify-center border-x border-dashed"
                    style={{ borderColor: "rgba(0,56,104,.28)", background: "rgba(0,56,104,.035)" }}
                  >
                    <span
                      className="font-mono text-[9.5px] tracking-[.08em] text-ink uppercase"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      Sin torneo
                    </span>
                  </div>
                );
              }

              const alturaBarra = nivel * PASO;
              return (
                <Link
                  key={año}
                  href={`/temporadas/${año}`}
                  className="group flex h-full flex-1 flex-col items-center justify-end"
                >
                  <div className="mb-1.5">
                    <MarcadorLogro info={info} />
                  </div>
                  <div
                    className={`w-full rounded-t-[8px] transition-opacity group-hover:opacity-80 ${
                      info.campeon ? "bg-orange" : esActual ? "bg-navy/55" : "bg-navy"
                    }`}
                    style={{ height: alturaBarra }}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* eje de años */}
      <div
        className="grid gap-4 border-t-2 pt-2"
        style={{ gridTemplateColumns: `104px minmax(0,1fr)`, borderColor: "rgba(0,56,104,.22)" }}
      >
        <div />
        <div className="flex gap-[3px]">
          {años.map((año) => {
            const info = temporadasInfo.get(año)!;
            return (
              <Link
                key={año}
                href={`/temporadas/${año}`}
                className={`flex-1 text-center font-mono text-xs font-semibold ${
                  info.campeon ? "text-orange-dark" : "text-navy-dark"
                }`}
              >
                {año}
              </Link>
            );
          })}
        </div>
      </div>

      {/* leyenda */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-ink">
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange">
            <CopaIcon className="h-2.5 w-2.5" color="#002140" />
          </span>
          Campeón
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[10px] text-white">↑</span>
          Ascenso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#9c2b1f] text-[10px] text-white">↓</span>
          Descenso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-[3px] bg-navy/55" />
          Temporada en curso
        </span>
      </div>
    </div>
  );
}
