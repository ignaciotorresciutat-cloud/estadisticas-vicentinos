import Link from "next/link";
import type { Metadata } from "next";
import {
  getEvolucionRankingUrba,
  getRankingUrba,
  getResumenClub,
  getTemporadasRankingUrba,
  type FilaRankingUrba,
  type PuntoRankingUrba,
} from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";

export async function generateMetadata(): Promise<Metadata> {
  const evolucion = await getEvolucionRankingUrba();
  const ultimo = evolucion.at(-1);
  const title = "Ranking URBA · Club Vicentinos";
  const description = ultimo
    ? `Dónde terminó Vicentinos entre todos los clubes de la URBA, año por año. ${ultimo.temporada}: ${ultimo.posicion}° de ${ultimo.clubes}.`
    : "Dónde terminó Vicentinos entre todos los clubes de la URBA, año por año.";
  return { title, description, openGraph: { title, description } };
}

export default async function RankingUrbaPage({
  searchParams,
}: {
  searchParams: Promise<{ temporada?: string }>;
}) {
  const [{ temporada: temporadaParam }, temporadas, evolucion, club] = await Promise.all([
    searchParams,
    getTemporadasRankingUrba(),
    getEvolucionRankingUrba(),
    getResumenClub(),
  ]);
  const pedida = Number(temporadaParam);
  const temporada = temporadas.includes(pedida) ? pedida : temporadas[0];
  const tabla = temporada ? await getRankingUrba(temporada) : [];

  const primero = evolucion[0];
  const ultimo = evolucion.at(-1);
  const mejor = [...evolucion].sort((a, b) => a.posicion - b.posicion || b.temporada - a.temporada)[0];
  const rango = primero && ultimo ? `${primero.temporada}—${ultimo.temporada}` : "";
  const puntoSeleccionado = evolucion.find((p) => p.temporada === temporada);

  const intro = ultimo
    ? `Al terminar cada temporada la URBA ordena a todos sus clubes según los resultados de todas sus divisiones. ${ultimo.temporada}: Vicentinos ${ultimo.posicion}° entre ${ultimo.clubes}.`
    : "Al terminar cada temporada la URBA ordena a todos sus clubes según los resultados de todas sus divisiones.";

  return (
    <main>
      {/* mobile: hero navy con header propio de la pantalla */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-7">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
          />
          <p className="mt-6 font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange uppercase">
            El archivo · {rango}
          </p>
          <h1 className="mt-3 text-[29px] leading-[1.08] font-extrabold tracking-[-.03em] text-white">Ranking URBA</h1>
          <p className="mt-2.5 text-[13.5px] leading-[1.5] text-white/75">{intro}</p>
        </div>
      </section>

      {/* desktop: encabezado sobre fondo blanco */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-12 lg:block">
        <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange-dark uppercase">
          El archivo · {rango}
        </p>
        <h1 className="mt-3 text-[44px] font-extrabold tracking-[-.03em] text-navy-dark">Ranking URBA</h1>
        <p className="mt-3 max-w-[680px] text-[15.5px] leading-[1.55] text-ink">{intro}</p>
      </div>

      {evolucion.length > 0 && (
        <div className="mx-auto max-w-[1280px] px-5 pt-6 lg:px-10 lg:pt-8">
          {/* cifras */}
          <div className="grid grid-cols-3 overflow-hidden rounded-[14px] border border-navy/[.13]">
            <Cifra
              label={`Último · ${ultimo!.temporada}`}
              valor={`${ultimo!.posicion}°`}
              detalle={`de ${ultimo!.clubes} clubes`}
            />
            <Cifra label={`Mejor · ${mejor.temporada}`} valor={`${mejor.posicion}°`} detalle={`de ${mejor.clubes} clubes`} destacado />
            <Cifra
              label={`Primero · ${primero.temporada}`}
              valor={`${primero.posicion}°`}
              detalle={`de ${primero.clubes} clubes`}
            />
          </div>

          {/* evolución */}
          <div className="mt-5 rounded-[14px] border border-navy/[.13] px-3 pt-4 pb-2 lg:px-6 lg:pt-5">
            <div className="flex items-baseline justify-between px-2 lg:px-0">
              <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-navy-dark lg:text-[19px]">
                Vicentinos, año por año
              </h2>
              <span className="hidden font-mono text-[9px] tracking-[.1em] text-ink uppercase lg:inline">más arriba, mejor</span>
            </div>
            <div className="lg:hidden">
              <GraficoEvolucion puntos={evolucion} seleccionado={temporada} ancho={360} alto={230} />
            </div>
            <div className="hidden lg:block">
              <GraficoEvolucion puntos={evolucion} seleccionado={temporada} ancho={1160} alto={300} />
            </div>
          </div>
        </div>
      )}

      {/* años */}
      <div className="mx-auto max-w-[1280px] px-5 pt-7 lg:px-10 lg:pt-10">
        <h2 className="text-[19px] font-extrabold tracking-[-.02em] text-navy-dark lg:text-[24px]">La tabla completa</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {temporadas.map((y) => (
            <Link
              key={y}
              href={`/ranking-urba?temporada=${y}`}
              scroll={false}
              className="flex min-h-9 flex-none items-center rounded-full px-[15px] font-mono text-[12.5px] font-semibold tabular-nums"
              style={{
                border: `1px solid ${y === temporada ? "#003868" : "rgba(0,56,104,.16)"}`,
                background: y === temporada ? "#003868" : "#fff",
                color: y === temporada ? "#f89c38" : "#003868",
              }}
            >
              {y}
            </Link>
          ))}
        </div>
        {puntoSeleccionado && (
          <p className="mt-3 text-[13.5px] leading-[1.5] text-ink">
            {temporada}: {tabla.length} clubes. Vicentinos terminó{" "}
            <strong className="text-navy-dark">{puntoSeleccionado.posicion}°</strong>
            {puntoSeleccionado.variacion ? ` (${textoVariacion(puntoSeleccionado.variacion)})` : ""}
            {puntoSeleccionado.torneo ? `, jugando en ${puntoSeleccionado.torneo}` : ""}.{" "}
            <Link href={`/temporadas/${temporada}`} className="font-semibold text-navy underline underline-offset-2">
              Ver la temporada
            </Link>
          </p>
        )}
      </div>

      <div className="mx-auto max-w-[1280px] px-5 pt-4 pb-16 lg:px-10 lg:pb-20">
        <div className="overflow-hidden rounded-[14px] border border-navy/[.13] lg:max-w-[760px]">
          <div
            className="grid items-center gap-2.5 px-4 py-2.5 lg:px-5"
            style={{ gridTemplateColumns: "44px 1fr 64px", background: "rgba(0,56,104,.05)" }}
          >
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Pos.</div>
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Club</div>
            <div className="text-right font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">
              Var.
            </div>
          </div>
          {tabla.map((f) => (
            <FilaTabla key={f.posicion} f={f} />
          ))}
        </div>
        <p className="mt-4 font-mono text-[10.5px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
          Var.: puestos que el club subió (▲) o bajó (▼) respecto del año anterior, según la URBA. Los clubes con
          link fueron rivales de Vicentinos: abren el historial contra ellos. 2020 no tuvo ranking (sin actividad por
          la pandemia).
        </p>
      </div>
    </main>
  );
}

function textoVariacion(v: number): string {
  if (v > 0) return `subió ${v} ${v === 1 ? "puesto" : "puestos"}`;
  return `bajó ${-v} ${v === -1 ? "puesto" : "puestos"}`;
}

function Variacion({ v }: { v: number | null }) {
  if (v === null) return <span className="text-navy/30">—</span>;
  if (v === 0) return <span className="text-ink">=</span>;
  return (
    <span style={{ color: v > 0 ? "#003868" : "#9c2b1f" }}>
      {v > 0 ? "▲" : "▼"}
      {Math.abs(v)}
    </span>
  );
}

function FilaTabla({ f }: { f: FilaRankingUrba }) {
  const nombre = f.propio ? (
    <span className="font-extrabold text-navy-dark">VICENTINOS</span>
  ) : f.clubId ? (
    <Link href={`/historial/${f.clubId}`} className="font-semibold text-navy-dark underline decoration-navy/25 underline-offset-[3px] hover:decoration-orange">
      {f.club}
    </Link>
  ) : (
    <span className="text-ink">{f.club}</span>
  );
  return (
    <div
      className="grid items-center gap-2.5 border-t border-navy/[.09] px-4 py-2 text-[13.5px] lg:px-5"
      style={{ gridTemplateColumns: "44px 1fr 64px", background: f.propio ? "#fdf0da" : undefined }}
    >
      <div className={`font-mono tabular-nums ${f.propio ? "font-bold text-navy-dark" : "text-navy-dark"}`}>{f.posicion}</div>
      <div className="min-w-0 truncate">{nombre}</div>
      <div className="text-right font-mono text-[12.5px] tabular-nums">
        <Variacion v={f.variacion} />
      </div>
    </div>
  );
}

function Cifra({ label, valor, detalle, destacado = false }: { label: string; valor: string; detalle: string; destacado?: boolean }) {
  return (
    <div className="border-l border-navy/[.09] px-3.5 py-3.5 first:border-l-0 lg:px-6 lg:py-5" style={{ background: destacado ? "#003868" : undefined }}>
      <div className={`font-mono text-[8.5px] tracking-[.1em] uppercase lg:text-[10px] ${destacado ? "text-orange" : "text-ink"}`}>{label}</div>
      <div className={`mt-1.5 text-[30px] leading-none font-extrabold tracking-[-.035em] tabular-nums lg:text-[44px] ${destacado ? "text-white" : "text-navy-dark"}`}>
        {valor}
      </div>
      <div className={`mt-1.5 text-[11.5px] lg:text-[13px] ${destacado ? "text-white/70" : "text-ink"}`}>{detalle}</div>
    </div>
  );
}

// línea de posiciones, con el eje invertido (1° arriba). Los años sin ranking
// (2020) cortan la línea y quedan marcados. Cada punto lleva a su tabla.
function GraficoEvolucion({
  puntos,
  seleccionado,
  ancho,
  alto,
}: {
  puntos: PuntoRankingUrba[];
  seleccionado: number | undefined;
  ancho: number;
  alto: number;
}) {
  const chico = ancho < 500;
  const margen = { izq: chico ? 30 : 44, der: chico ? 12 : 20, arr: 26, abj: 40 };
  const años: number[] = [];
  for (let a = puntos[0].temporada; a <= puntos.at(-1)!.temporada; a++) años.push(a);
  const posiciones = puntos.map((p) => p.posicion);
  const yMin = Math.max(1, Math.floor((Math.min(...posiciones) - 3) / 5) * 5);
  const yMax = Math.ceil((Math.max(...posiciones) + 1) / 5) * 5;
  const x = (año: number) =>
    margen.izq + ((año - años[0]) / Math.max(1, años.length - 1)) * (ancho - margen.izq - margen.der);
  const y = (pos: number) => margen.arr + ((pos - yMin) / (yMax - yMin)) * (alto - margen.arr - margen.abj);
  const porAño = new Map(puntos.map((p) => [p.temporada, p]));

  // tramos continuos (un año sin ranking corta la línea)
  const tramos: PuntoRankingUrba[][] = [[]];
  for (const a of años) {
    const p = porAño.get(a);
    if (p) tramos.at(-1)!.push(p);
    else if (tramos.at(-1)!.length) tramos.push([]);
  }
  const marcas: number[] = [];
  for (let v = yMin; v <= yMax; v += 5) marcas.push(v);
  const fs = chico ? 10 : 12;

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="mt-2 block h-auto w-full" role="img" aria-label="Posición de Vicentinos en el ranking URBA por año">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={margen.izq} x2={ancho - margen.der} y1={y(v)} y2={y(v)} stroke="rgba(0,56,104,.09)" />
          <text x={margen.izq - 6} y={y(v) + 3.5} textAnchor="end" fontSize={fs - 1} fill="#46658a" fontFamily="var(--font-mono, monospace)">
            {v}°
          </text>
        </g>
      ))}
      {tramos
        .filter((t) => t.length > 1)
        .map((t) => (
          <polyline
            key={t[0].temporada}
            points={t.map((p) => `${x(p.temporada)},${y(p.posicion)}`).join(" ")}
            fill="none"
            stroke="#003868"
            strokeWidth={chico ? 2 : 2.5}
            strokeLinejoin="round"
          />
        ))}
      {años.map((a) => {
        const p = porAño.get(a);
        const etiquetaAño = chico ? `'${String(a).slice(2)}` : String(a);
        if (!p) {
          return (
            <g key={a}>
              <line x1={x(a)} x2={x(a)} y1={margen.arr} y2={alto - margen.abj} stroke="rgba(0,56,104,.18)" strokeDasharray="3 4" />
              <text x={x(a)} y={alto - 10} textAnchor="middle" fontSize={fs - 1} fill="rgba(0,56,104,.4)" fontFamily="var(--font-mono, monospace)">
                {etiquetaAño}
              </text>
            </g>
          );
        }
        const activo = a === seleccionado;
        return (
          <a key={a} href={`/ranking-urba?temporada=${a}`} aria-label={`${a}: ${p.posicion}°`}>
            <rect x={x(a) - 14} y={margen.arr - 20} width={28} height={alto - margen.arr + 20} fill="transparent" />
            <circle cx={x(a)} cy={y(p.posicion)} r={activo ? (chico ? 6 : 7) : chico ? 3.5 : 4.5} fill={activo ? "#f89c38" : "#003868"} stroke="#fff" strokeWidth={2} />
            <text
              x={x(a)}
              y={y(p.posicion) - (activo ? 11 : 9)}
              textAnchor="middle"
              fontSize={activo ? fs + 1 : fs}
              fontWeight={activo ? 700 : 600}
              fill={activo ? "#002140" : "#003868"}
            >
              {p.posicion}
            </text>
            <text
              x={x(a)}
              y={alto - 10}
              textAnchor="middle"
              fontSize={fs - 1}
              fontWeight={activo ? 700 : 400}
              fill={activo ? "#002140" : "#46658a"}
              fontFamily="var(--font-mono, monospace)"
            >
              {etiquetaAño}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
