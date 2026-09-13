import Link from "next/link";
import type { Metadata } from "next";
import { getCamadasResumenCompleta, getResumenClub, type FilaCamadaCompleta } from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";
import { CopaIcon } from "@/components/copa-icon";
import { TarjetaIcon } from "@/components/tarjeta-icon";
import { OrdenSelect } from "@/components/orden-select";
import { formatNumero } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const club = await getResumenClub();
  const title = "Camadas · Club Vicentinos";
  const description = `${club.camadas} generaciones distintas, cada una con sus números en el club.`;
  return { title, description, openGraph: { title, description } };
}

const SORT_DEFS = [
  { key: "jugadores", label: "Jugadores", unit: "Jugadores con presencias" },
  { key: "titular", label: "Titular", unit: "Partidos como titular" },
  { key: "suplente", label: "Suplente", unit: "Partidos como suplente" },
  { key: "presencias", label: "Total", unit: "Partidos jugados" },
  { key: "tries", label: "Tries", unit: "Tries convertidos" },
  { key: "puntos", label: "Puntos", unit: "Puntos anotados" },
  { key: "tarjetas", label: "Tarjetas", unit: "Tarjetas totales" },
] as const;
type OrdenKey = (typeof SORT_DEFS)[number]["key"];

function esOrdenKey(v: string | undefined): v is OrdenKey {
  return SORT_DEFS.some((s) => s.key === v);
}

function hrefDe(orden: OrdenKey): string {
  return orden === "presencias" ? "/camadas" : `/camadas?orden=${orden}`;
}

function valorDe(f: FilaCamadaCompleta, orden: OrdenKey): number {
  switch (orden) {
    case "jugadores":
      return f.jugadoresConCaps;
    case "titular":
      return f.titular;
    case "suplente":
      return f.suplente;
    case "tries":
      return f.tries;
    case "puntos":
      return f.puntos;
    case "tarjetas":
      return f.tarjetasAmarillas + f.tarjetasRojas;
    default:
      return f.presencias;
  }
}

function spanDe(f: FilaCamadaCompleta): string {
  if (f.primeraTemporada == null) return "—";
  return f.primeraTemporada === f.ultimaTemporada
    ? String(f.primeraTemporada)
    : `${f.primeraTemporada}—${f.ultimaTemporada}`;
}

function metaDe(f: FilaCamadaCompleta): string {
  return `${f.jugadoresConCaps} ${f.jugadoresConCaps === 1 ? "jugador" : "jugadores"} · ${spanDe(f)}`;
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

export default async function CamadasPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string }>;
}) {
  const { orden: ordenParam } = await searchParams;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "presencias";

  const [club, filas] = await Promise.all([getResumenClub(), getCamadasResumenCompleta()]);

  const filasOrdenadas = [...filas].sort((a, b) => valorDe(b, orden) - valorDe(a, orden) || a.camada - b.camada);
  const camCount = `${filas.length} ${filas.length === 1 ? "camada" : "camadas"}`;
  const sortUnit = (SORT_DEFS.find((s) => s.key === orden) ?? SORT_DEFS[0]).unit;
  const notaFinal = `Una copa por título ganado por la camada. El orden responde a ${sortUnit.toLowerCase()}.`;

  return (
    <main>
      {/* mobile: hero navy con header propio de la pantalla */}
      <section className="bg-navy lg:hidden">
        <div className="px-5 pt-6 pb-6">
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
          />
          <h1 className="mt-5 text-[28px] leading-[1.1] font-extrabold tracking-[-.03em] text-white">Camadas</h1>
          <p className="mt-2.5 text-[13.5px] leading-[1.5] text-white/75">
            Cada generación por año de nacimiento. Tocá una para ver su historia en el club.
          </p>
        </div>
      </section>

      {/* mobile: orden + lista, en blanco */}
      <div className="px-5 pt-4 lg:hidden">
        <div className="flex items-center gap-2">
          <OrdenSelect opciones={SORT_DEFS} valor={orden} basePath="/camadas" valorPorDefecto="presencias" />
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-2.5">
          <span className="font-mono text-[9.5px] font-semibold tracking-[.13em] text-orange-dark uppercase">{camCount}</span>
          <span className="flex-none font-mono text-[9px] tracking-[.1em] text-ink uppercase">{sortUnit}</span>
        </div>

        <div className="mt-1 flex flex-col">
          {filasOrdenadas.map((f, i) => (
            <Link
              key={f.camada}
              href={`/camadas/${f.camada}`}
              className="flex min-h-11 items-center gap-3 border-b border-navy/[.09] py-[13px]"
            >
              <div className="w-5 flex-none font-mono text-[11px] text-navy/40 tabular-nums">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[7px]">
                  <span className="min-w-0 truncate text-[14.5px] font-semibold text-navy-dark">Camada {f.camada}</span>
                  <Copas n={f.titulos} />
                </div>
                <div className="mt-1 truncate font-mono text-[10px] text-ink">{metaDe(f)}</div>
              </div>
              <div className="min-w-[42px] flex-none text-right text-[17px] font-extrabold tracking-[-.02em] text-navy tabular-nums">
                {formatNumero(valorDe(f, orden))}
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-4 pb-2 font-mono text-[9.5px] leading-[1.6] tracking-[.04em]" style={{ color: "rgba(0,56,104,.45)" }}>
          {notaFinal}
        </p>
      </div>

      {/* desktop: todo sobre fondo blanco */}
      <div className="mx-auto hidden max-w-[1280px] px-10 pt-12 pb-20 lg:block">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[.16em] text-orange-dark uppercase">{camCount}</p>
            <h1 className="mt-3 text-[44px] font-extrabold tracking-[-.03em] text-navy-dark">Las generaciones</h1>
            <p className="mt-3 max-w-[620px] text-[15.5px] leading-[1.55] text-ink">
              Cada camada es un año de nacimiento. Ordenalas por lo que quieras medir y abrí una para ver quiénes la
              formaron.
            </p>
          </div>
          <span className="flex-none font-mono text-xs tracking-[.08em] text-ink uppercase">{sortUnit}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
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

        <div className="mt-6 overflow-hidden rounded-[14px] border border-navy/[.13]">
          <div
            className="grid items-center gap-[11px] px-5 py-3"
            style={{
              gridTemplateColumns: "42px minmax(150px,1fr) 68px 70px 70px 84px 64px 70px 86px",
              background: "rgba(0,56,104,.05)",
            }}
          >
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">#</div>
            <div className="font-mono text-[9px] font-semibold tracking-[.1em] text-ink uppercase">Camada</div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "jugadores" ? "#003868" : "#46658a" }}
            >
              Jugadores
            </div>
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
              style={{ color: orden === "presencias" ? "#003868" : "#46658a" }}
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
              style={{ color: orden === "puntos" ? "#003868" : "#46658a" }}
            >
              Puntos
            </div>
            <div
              className="text-right font-mono text-[9px] font-semibold tracking-[.1em] uppercase"
              style={{ color: orden === "tarjetas" ? "#003868" : "#46658a" }}
            >
              Tarjetas
            </div>
          </div>

          {filasOrdenadas.map((f, i) => (
            <Link
              key={f.camada}
              href={`/camadas/${f.camada}`}
              className="grid items-center gap-[11px] border-t border-navy/[.09] px-5 py-3.5"
              style={{ gridTemplateColumns: "42px minmax(150px,1fr) 68px 70px 70px 84px 64px 70px 86px" }}
            >
              <div className="font-mono text-[12.5px] text-ink tabular-nums">{i + 1}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[7px]">
                  <span className="text-[15px] font-semibold text-navy-dark">Camada {f.camada}</span>
                  <span className="font-mono text-[10.5px] text-ink">{spanDe(f)}</span>
                  <Copas n={f.titulos} />
                </div>
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "jugadores" ? 600 : 400, color: orden === "jugadores" ? "#003868" : "#46658a" }}
              >
                {f.jugadoresConCaps}
              </div>
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
                style={{ fontWeight: orden === "presencias" ? 600 : 400, color: orden === "presencias" ? "#003868" : "#46658a" }}
              >
                {f.presencias}
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "tries" ? 600 : 400, color: orden === "tries" ? "#003868" : "#46658a" }}
              >
                {f.tries}
              </div>
              <div
                className="text-right font-mono text-[15px] tabular-nums"
                style={{ fontWeight: orden === "puntos" ? 600 : 400, color: orden === "puntos" ? "#003868" : "#46658a" }}
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
                        <span
                          className="font-mono text-[13.5px] tabular-nums"
                          style={{ fontWeight: orden === "tarjetas" ? 600 : 400, color: orden === "tarjetas" ? "#003868" : "#46658a" }}
                        >
                          {f.tarjetasAmarillas}
                        </span>
                      </span>
                    )}
                    {f.tarjetasRojas > 0 && (
                      <span className="flex items-center gap-1">
                        <TarjetaIcon tipo="ROJA" width={9} height={13} />
                        <span
                          className="font-mono text-[13.5px] tabular-nums"
                          style={{ fontWeight: orden === "tarjetas" ? 600 : 400, color: orden === "tarjetas" ? "#003868" : "#46658a" }}
                        >
                          {f.tarjetasRojas}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-4 font-mono text-[10.5px] leading-[1.6]" style={{ color: "rgba(0,56,104,.45)" }}>
          {notaFinal}
        </p>
      </div>
    </main>
  );
}
