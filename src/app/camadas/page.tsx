import Link from "next/link";
import { getCamadasResumen, type FilaCamada } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ORDEN_OPCIONES = [
  { key: "camada", label: "Camada" },
  { key: "jugadoresConCaps", label: "Jugadores" },
  { key: "presencias", label: "Presencias" },
  { key: "tries", label: "Tries" },
  { key: "tarjetas", label: "Tarjetas" },
  { key: "puntos", label: "Puntos" },
] as const;

type OrdenKey = (typeof ORDEN_OPCIONES)[number]["key"];

function esOrdenKey(valor: string | undefined): valor is OrdenKey {
  return ORDEN_OPCIONES.some((o) => o.key === valor);
}

function ordenarFilas(filas: FilaCamada[], orden: OrdenKey): FilaCamada[] {
  if (orden === "camada") {
    return [...filas].sort((a, b) => a.camada - b.camada);
  }
  return [...filas].sort(
    (a, b) => b[orden] - a[orden] || b.puntos - a.puntos || a.camada - b.camada
  );
}

export default async function CamadasPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string }>;
}) {
  const { orden: ordenParam } = await searchParams;
  const orden: OrdenKey = esOrdenKey(ordenParam) ? ordenParam : "camada";

  const filasSinOrdenar = await getCamadasResumen();
  const filas = ordenarFilas(filasSinOrdenar, orden);

  function hrefOrden(key: OrdenKey) {
    return key === "camada" ? "/camadas" : `/camadas?orden=${key}`;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-navy-dark">Camadas</h1>
      <p className="mt-1 text-sm text-navy/70">{filas.length} camadas con jugadores en primera</p>
      <p className="mt-1 text-sm text-navy/70">Tocá una camada para ver el detalle de sus jugadores.</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-left text-white">
              {ORDEN_OPCIONES.map((o) => (
                <th
                  key={o.key}
                  className={`py-2 pr-2 ${o.key === "camada" ? "pl-3" : "text-right"} ${
                    o.key === "puntos" ? "font-semibold" : ""
                  }`}
                >
                  <Link
                    href={hrefOrden(o.key)}
                    className={`hover:text-orange ${orden === o.key ? "text-orange" : ""}`}
                  >
                    {o.label}
                    {orden === o.key ? " ▾" : ""}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.camada} className="border-b border-navy-light/60 odd:bg-navy-light">
                <td className={`py-1.5 pr-2 pl-3 font-medium ${orden === "camada" ? "font-semibold" : ""}`}>
                  <Link href={`/camadas/${f.camada}`} className="inline-flex items-center gap-1 text-navy hover:text-orange">
                    {f.camada}
                    <span className="text-xs text-navy/50">→</span>
                  </Link>
                </td>
                <td className={`py-1.5 pr-2 text-right text-navy-dark ${orden === "jugadoresConCaps" ? "font-semibold" : ""}`}>
                  {f.jugadoresConCaps}
                </td>
                <td className={`py-1.5 pr-2 text-right text-navy-dark ${orden === "presencias" ? "font-semibold" : ""}`}>
                  {f.presencias}
                </td>
                <td className={`py-1.5 pr-2 text-right text-navy-dark ${orden === "tries" ? "font-semibold" : ""}`}>
                  {f.tries}
                </td>
                <td className={`py-1.5 pr-2 text-right text-navy-dark ${orden === "tarjetas" ? "font-semibold" : ""}`}>
                  {f.tarjetas}
                </td>
                <td className="py-1.5 pr-2 text-right font-semibold text-navy-dark">{f.puntos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
